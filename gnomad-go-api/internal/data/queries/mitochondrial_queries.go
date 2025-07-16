package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// MitochondrialVariantDocument represents the ES document structure for mitochondrial variants
type MitochondrialVariantDocument struct {
	VariantID       string   `json:"variant_id"`
	ReferenceGenome string   `json:"reference_genome"`
	Chrom           string   `json:"chrom"`
	Pos             int      `json:"pos"`
	Ref             string   `json:"ref"`
	Alt             string   `json:"alt"`
	RSIDs           []string `json:"rsids"`

	// Position info
	Locus struct {
		Contig   string `json:"contig"` // chr-prefixed
		Position int    `json:"position"`
	} `json:"locus"`

	// Alleles array (ref is first, alts follow)
	Alleles []string `json:"alleles"`

	// Mitochondrial-specific data
	AC         int     `json:"ac"`
	ACHet      int     `json:"ac_het"`
	ACHom      int     `json:"ac_hom"`
	ACHomMNV   int     `json:"ac_hom_mnv"`
	AN         int     `json:"an"`
	ExcludedAC int     `json:"excluded_ac"`
	MaxHetP    float64 `json:"max_heteroplasmy"`

	// Haplogroup data
	HaplogroupDefining bool                                     `json:"haplogroup_defining"`
	Haplogroups        []MitochondrialVariantHaplogroupDocument `json:"haplogroups"`

	// Population data
	Populations []MitochondrialVariantPopulationDocument `json:"populations"`

	// Quality metrics
	GenotypeQualityMetrics []MitochondrialVariantGenotypeQualityMetricDocument `json:"genotype_quality_metrics"`
	GenotypeQualityFilters []MitochondrialVariantGenotypeQualityFilterDocument `json:"genotype_quality_filters"`
	SiteQualityMetrics     []MitochondrialVariantSiteQualityMetricDocument     `json:"site_quality_metrics"`

	// Age distribution
	AgeDistribution *MitochondrialVariantAgeDistributionDocument `json:"age_distribution"`

	// Heteroplasmy distribution
	HeteroplasmyDistribution *HistogramDocument `json:"heteroplasmy_distribution"`

	// Prediction scores
	MitotipScore                    float64 `json:"mitotip_score"`
	MitotipTrnaPrediction          string  `json:"mitotip_trna_prediction"`
	PONMLProbabilityOfPathogenicity float64 `json:"pon_ml_probability_of_pathogenicity"`
	PONMtTrnaPrediction            string  `json:"pon_mt_trna_prediction"`

	// Annotations
	TranscriptConsequences []map[string]interface{} `json:"transcript_consequences"`
	Filters                []string                 `json:"filters"`
	Flags                  []string                 `json:"flags"`
}

// Supporting structures for mitochondrial variant data
type MitochondrialVariantHaplogroupDocument struct {
	ID     string  `json:"id"`
	AN     float64 `json:"an"`
	ACHet  int     `json:"ac_het"`
	ACHom  int     `json:"ac_hom"`
	FAF    float64 `json:"faf"`
	FAFHom float64 `json:"faf_hom"`
}

type MitochondrialVariantPopulationDocument struct {
	ID                       string             `json:"id"`
	AN                       int                `json:"an"`
	ACHet                    int                `json:"ac_het"`
	ACHom                    int                `json:"ac_hom"`
	HeteroplasmyDistribution *HistogramDocument `json:"heteroplasmy_distribution"`
}

type MitochondrialVariantGenotypeQualityMetricDocument struct {
	Name string             `json:"name"`
	All  *HistogramDocument `json:"all"`
	Alt  *HistogramDocument `json:"alt"`
}

type MitochondrialVariantGenotypeQualityFilterDocument struct {
	Name     string             `json:"name"`
	Filtered *HistogramDocument `json:"filtered"`
}

type MitochondrialVariantSiteQualityMetricDocument struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
}

type MitochondrialVariantAgeDistributionDocument struct {
	Het *HistogramDocument `json:"het"`
	Hom *HistogramDocument `json:"hom"`
}

// HistogramDocument represents histogram data from ES
type HistogramDocument struct {
	BinEdges []float64 `json:"bin_edges"`
	BinFreq  []float64 `json:"bin_freq"`
	NSmaller int       `json:"n_smaller"`
	NLarger  int       `json:"n_larger"`
}

// Constants for mitochondrial variant ES index
const GnomadV3MitochondrialVariantIndex = "gnomad_v3_mitochondrial_variants"

// FetchMitochondrialVariant fetches a single mitochondrial variant by ID
func FetchMitochondrialVariant(ctx context.Context, client *elastic.Client, variantID string, datasetID string) (*model.MitochondrialVariantDetails, error) {
	// Validate dataset supports mitochondrial variants
	if datasetID != "gnomad_r3" && datasetID != "gnomad_r4" {
		return nil, fmt.Errorf("mitochondrial variants are not available for dataset: %s", datasetID)
	}

	// Build query - check for both variant_id and rsid fields
	query := map[string]interface{}{
		"bool": map[string]interface{}{
			"should": []map[string]interface{}{
				{
					"term": map[string]interface{}{
						"variant_id": variantID,
					},
				},
				{
					"term": map[string]interface{}{
						"rsids": variantID,
					},
				},
			},
			"minimum_should_match": 1,
		},
	}

	searchReq := map[string]interface{}{
		"query": query,
		"size":  1,
	}

	// Execute search
	response, err := client.Search(ctx, GnomadV3MitochondrialVariantIndex, searchReq)
	if err != nil {
		return nil, fmt.Errorf("failed to search for mitochondrial variant %s: %w", variantID, err)
	}

	// Check if variant was found
	if len(response.Hits.Hits) == 0 {
		return nil, &VariantNotFoundError{ID: variantID, Dataset: datasetID}
	}

	// Parse the hit
	hit := response.Hits.Hits[0]
	source := hit.Source
	
	// Handle nested value structure (similar to TypeScript implementation)
	var docData map[string]interface{}
	if value, exists := source["value"]; exists {
		docData = value.(map[string]interface{})
	} else {
		docData = source
	}

	// Parse into document structure
	docBytes, err := json.Marshal(docData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal variant data: %w", err)
	}

	var doc MitochondrialVariantDocument
	if err := json.Unmarshal(docBytes, &doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal variant document: %w", err)
	}

	// Convert to GraphQL model
	return convertMitochondrialVariantToModel(&doc), nil
}

// FetchMitochondrialVariantsByGene fetches mitochondrial variants for a specific gene
func FetchMitochondrialVariantsByGene(ctx context.Context, client *elastic.Client, geneID string, datasetID string) ([]*model.MitochondrialVariant, error) {
	// Validate dataset supports mitochondrial variants
	if datasetID != "gnomad_r3" && datasetID != "gnomad_r4" {
		return nil, fmt.Errorf("mitochondrial variants are not available for dataset: %s", datasetID)
	}

	query := map[string]interface{}{
		"bool": map[string]interface{}{
			"filter": []map[string]interface{}{
				{
					"term": map[string]interface{}{
						"gene_id": geneID,
					},
				},
			},
		},
	}

	searchReq := map[string]interface{}{
		"query": query,
		"sort": []map[string]interface{}{
			{
				"locus.position": map[string]interface{}{
					"order": "asc",
				},
			},
		},
		"size": 10000, // Max variants per gene
	}

	// Execute search
	response, err := client.Search(ctx, GnomadV3MitochondrialVariantIndex, searchReq)
	if err != nil {
		return nil, fmt.Errorf("failed to search for mitochondrial variants in gene %s: %w", geneID, err)
	}

	// Parse hits
	variants := make([]*model.MitochondrialVariant, len(response.Hits.Hits))
	for i, hit := range response.Hits.Hits {
		source := hit.Source
		
		// Handle nested value structure
		var docData map[string]interface{}
		if value, exists := source["value"]; exists {
			docData = value.(map[string]interface{})
		} else {
			docData = source
		}

		// Parse into document structure
		docBytes, err := json.Marshal(docData)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal variant data: %w", err)
		}

		var doc MitochondrialVariantDocument
		if err := json.Unmarshal(docBytes, &doc); err != nil {
			return nil, fmt.Errorf("failed to unmarshal variant document: %w", err)
		}

		variants[i] = convertMitochondrialVariantSummaryToModel(&doc)
	}

	return variants, nil
}

// FetchMitochondrialVariantsByRegion fetches mitochondrial variants for a specific region
func FetchMitochondrialVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int, datasetID string) ([]*model.MitochondrialVariant, error) {
	// Validate dataset supports mitochondrial variants
	if datasetID != "gnomad_r3" && datasetID != "gnomad_r4" {
		return nil, fmt.Errorf("mitochondrial variants are not available for dataset: %s", datasetID)
	}

	query := map[string]interface{}{
		"bool": map[string]interface{}{
			"filter": []map[string]interface{}{
				{
					"term": map[string]interface{}{
						"locus.contig": fmt.Sprintf("chr%s", chrom),
					},
				},
				{
					"range": map[string]interface{}{
						"locus.position": map[string]interface{}{
							"gte": start,
							"lte": stop,
						},
					},
				},
			},
		},
	}

	searchReq := map[string]interface{}{
		"query": query,
		"sort": []map[string]interface{}{
			{
				"locus.position": map[string]interface{}{
					"order": "asc",
				},
			},
		},
		"size": 10000, // Max variants per region
	}

	// Execute search
	response, err := client.Search(ctx, GnomadV3MitochondrialVariantIndex, searchReq)
	if err != nil {
		return nil, fmt.Errorf("failed to search for mitochondrial variants in region %s:%d-%d: %w", chrom, start, stop, err)
	}

	// Parse hits
	variants := make([]*model.MitochondrialVariant, len(response.Hits.Hits))
	for i, hit := range response.Hits.Hits {
		source := hit.Source
		
		// Handle nested value structure
		var docData map[string]interface{}
		if value, exists := source["value"]; exists {
			docData = value.(map[string]interface{})
		} else {
			docData = source
		}

		// Parse into document structure
		docBytes, err := json.Marshal(docData)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal variant data: %w", err)
		}

		var doc MitochondrialVariantDocument
		if err := json.Unmarshal(docBytes, &doc); err != nil {
			return nil, fmt.Errorf("failed to unmarshal variant document: %w", err)
		}

		variants[i] = convertMitochondrialVariantSummaryToModel(&doc)
	}

	return variants, nil
}

// FetchMitochondrialVariantsByTranscript fetches mitochondrial variants for a specific transcript
// For mitochondrial genes, this is equivalent to the gene query
func FetchMitochondrialVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string, geneID string, datasetID string) ([]*model.MitochondrialVariant, error) {
	// Validate dataset supports mitochondrial variants
	if datasetID != "gnomad_r3" && datasetID != "gnomad_r4" {
		return nil, fmt.Errorf("mitochondrial variants are not available for dataset: %s", datasetID)
	}

	// For mitochondrial genes, transcript and gene queries are equivalent
	return FetchMitochondrialVariantsByGene(ctx, client, geneID, datasetID)
}

// Conversion functions

// convertMitochondrialVariantToModel converts a MitochondrialVariantDocument to a MitochondrialVariantDetails model
func convertMitochondrialVariantToModel(doc *MitochondrialVariantDocument) *model.MitochondrialVariantDetails {
	referenceGenome := model.ReferenceGenomeIDGRCh38
	if doc.ReferenceGenome == "GRCh37" {
		referenceGenome = model.ReferenceGenomeIDGRCh37
	}

	variant := &model.MitochondrialVariantDetails{
		VariantID:       doc.VariantID,
		ReferenceGenome: referenceGenome,
		Pos:             doc.Pos,
		Ref:             doc.Ref,
		Alt:             doc.Alt,
		AcHet:           &doc.ACHet,
		AcHom:           &doc.ACHom,
		AcHomMnv:        &doc.ACHomMNV,
		An:              &doc.AN,
		ExcludedAc:      &doc.ExcludedAC,
		MaxHeteroplasmy: &doc.MaxHetP,
		HaplogroupDefining: &doc.HaplogroupDefining,
		MitotipScore:       &doc.MitotipScore,
		MitotipTrnaPrediction: &doc.MitotipTrnaPrediction,
		PonMlProbabilityOfPathogenicity: &doc.PONMLProbabilityOfPathogenicity,
		PonMtTrnaPrediction: &doc.PONMtTrnaPrediction,
		Filters: doc.Filters,
		Flags:   doc.Flags,
	}

	// Handle optional RSID
	if len(doc.RSIDs) > 0 {
		variant.Rsid = &doc.RSIDs[0]
		// Convert []string to []*string
		rsids := make([]*string, len(doc.RSIDs))
		for i, rsid := range doc.RSIDs {
			rsids[i] = &rsid
		}
		variant.Rsids = rsids
	}

	// Convert age distribution
	if doc.AgeDistribution != nil {
		variant.AgeDistribution = &model.MitochondrialVariantAgeDistribution{
			Het: convertHistogramToModel(doc.AgeDistribution.Het),
			Hom: convertHistogramToModel(doc.AgeDistribution.Hom),
		}
	}

	// Convert heteroplasmy distribution
	if doc.HeteroplasmyDistribution != nil {
		variant.HeteroplasmyDistribution = convertHistogramToModel(doc.HeteroplasmyDistribution)
	}

	// Convert haplogroups
	haplogroups := make([]*model.MitochondrialVariantHaplogroup, len(doc.Haplogroups))
	for i, hap := range doc.Haplogroups {
		haplogroups[i] = &model.MitochondrialVariantHaplogroup{
			ID:     &hap.ID,
			An:     &hap.AN,
			AcHet:  &hap.ACHet,
			AcHom:  &hap.ACHom,
			Faf:    &hap.FAF,
			FafHom: &hap.FAFHom,
		}
	}
	variant.Haplogroups = haplogroups

	// Convert populations
	populations := make([]*model.MitochondrialVariantPopulation, len(doc.Populations))
	for i, pop := range doc.Populations {
		populations[i] = &model.MitochondrialVariantPopulation{
			ID:    pop.ID,
			An:    pop.AN,
			AcHet: pop.ACHet,
			AcHom: pop.ACHom,
			HeteroplasmyDistribution: convertHistogramToModel(pop.HeteroplasmyDistribution),
		}
	}
	variant.Populations = populations

	// Convert genotype quality metrics
	genotypeQualityMetrics := make([]*model.MitochondrialVariantGenotypeQualityMetric, len(doc.GenotypeQualityMetrics))
	for i, metric := range doc.GenotypeQualityMetrics {
		genotypeQualityMetrics[i] = &model.MitochondrialVariantGenotypeQualityMetric{
			Name: metric.Name,
			All:  convertHistogramToModel(metric.All),
			Alt:  convertHistogramToModel(metric.Alt),
		}
	}
	variant.GenotypeQualityMetrics = genotypeQualityMetrics

	// Convert genotype quality filters
	genotypeQualityFilters := make([]*model.MitochondrialVariantGenotypeQualityFilter, len(doc.GenotypeQualityFilters))
	for i, filter := range doc.GenotypeQualityFilters {
		genotypeQualityFilters[i] = &model.MitochondrialVariantGenotypeQualityFilter{
			Name:     filter.Name,
			Filtered: convertHistogramToModel(filter.Filtered),
		}
	}
	variant.GenotypeQualityFilters = genotypeQualityFilters

	// Convert site quality metrics
	siteQualityMetrics := make([]*model.MitochondrialVariantSiteQualityMetric, len(doc.SiteQualityMetrics))
	for i, metric := range doc.SiteQualityMetrics {
		siteQualityMetrics[i] = &model.MitochondrialVariantSiteQualityMetric{
			Name:  metric.Name,
			Value: &metric.Value,
		}
	}
	variant.SiteQualityMetrics = siteQualityMetrics

	// Convert transcript consequences
	variant.TranscriptConsequences = convertTranscriptConsequences(doc.TranscriptConsequences)

	return variant
}

// convertMitochondrialVariantSummaryToModel converts a MitochondrialVariantDocument to a MitochondrialVariant summary model
func convertMitochondrialVariantSummaryToModel(doc *MitochondrialVariantDocument) *model.MitochondrialVariant {
	referenceGenome := model.ReferenceGenomeIDGRCh38
	if doc.ReferenceGenome == "GRCh37" {
		referenceGenome = model.ReferenceGenomeIDGRCh37
	}

	variant := &model.MitochondrialVariant{
		VariantID:       doc.VariantID,
		ReferenceGenome: referenceGenome,
		Pos:             doc.Pos,
		AcHet:           &doc.ACHet,
		AcHom:           &doc.ACHom,
		An:              &doc.AN,
		MaxHeteroplasmy: &doc.MaxHetP,
		Filters:         doc.Filters,
		Flags:           doc.Flags,
	}

	// Handle optional RSID
	if len(doc.RSIDs) > 0 {
		variant.Rsid = &doc.RSIDs[0]
		variant.Rsids = doc.RSIDs
	}

	// Extract gene and transcript info from transcript consequences
	if len(doc.TranscriptConsequences) > 0 {
		consequence := doc.TranscriptConsequences[0]
		if geneID, ok := consequence["gene_id"].(string); ok {
			variant.GeneID = &geneID
		}
		if geneSymbol, ok := consequence["gene_symbol"].(string); ok {
			variant.GeneSymbol = &geneSymbol
		}
		if transcriptID, ok := consequence["transcript_id"].(string); ok {
			variant.TranscriptID = &transcriptID
		}
		if hgvsc, ok := consequence["hgvsc"].(string); ok {
			variant.Hgvsc = &hgvsc
		}
		if hgvsp, ok := consequence["hgvsp"].(string); ok {
			variant.Hgvsp = &hgvsp
		}
		if lof, ok := consequence["lof"].(string); ok {
			variant.Lof = &lof
		}
		if lofFilter, ok := consequence["lof_filter"].(string); ok {
			variant.LofFilter = &lofFilter
		}
		if lofFlags, ok := consequence["lof_flags"].(string); ok {
			variant.LofFlags = &lofFlags
		}
		if consequenceTerms, ok := consequence["consequence_terms"].([]interface{}); ok && len(consequenceTerms) > 0 {
			if mostSevere, ok := consequenceTerms[0].(string); ok {
				variant.Consequence = &mostSevere
			}
		}
	}

	return variant
}

// convertHistogramToModel converts a HistogramDocument to a Histogram model
func convertHistogramToModel(hist *HistogramDocument) *model.Histogram {
	if hist == nil {
		return nil
	}

	return &model.Histogram{
		BinEdges: hist.BinEdges,
		BinFreq:  hist.BinFreq,
		NSmaller: &hist.NSmaller,
		NLarger:  &hist.NLarger,
	}
}

// convertTranscriptConsequences converts raw transcript consequence data to the model format
func convertTranscriptConsequences(consequences []map[string]interface{}) []*model.TranscriptConsequence {
	result := make([]*model.TranscriptConsequence, 0, len(consequences))

	for _, csq := range consequences {
		// Filter out non-ENSG genes (only include Ensembl genes like in TypeScript)
		if geneID, ok := csq["gene_id"].(string); !ok || !strings.HasPrefix(geneID, "ENSG") {
			continue
		}

		tc := &model.TranscriptConsequence{}

		// Basic identifiers
		if geneID, ok := csq["gene_id"].(string); ok {
			tc.GeneID = geneID
		}
		if geneSymbol, ok := csq["gene_symbol"].(string); ok {
			tc.GeneSymbol = &geneSymbol
		}
		if transcriptID, ok := csq["transcript_id"].(string); ok {
			tc.TranscriptID = transcriptID
		}

		// Consequences
		if consequenceTerms, ok := csq["consequence_terms"].([]interface{}); ok {
			terms := make([]string, len(consequenceTerms))
			for i, term := range consequenceTerms {
				if termStr, ok := term.(string); ok {
					terms[i] = termStr
				}
			}
			tc.ConsequenceTerms = terms
		}

		// HGVS notations
		if hgvsc, ok := csq["hgvsc"].(string); ok {
			tc.Hgvsc = &hgvsc
		}
		if hgvsp, ok := csq["hgvsp"].(string); ok {
			tc.Hgvsp = &hgvsp
		}

		// LoF annotations
		if lof, ok := csq["lof"].(string); ok {
			tc.Lof = &lof
		}
		if lofFilter, ok := csq["lof_filter"].(string); ok {
			tc.LofFilter = &lofFilter
		}
		if lofFlags, ok := csq["lof_flags"].(string); ok {
			tc.LofFlags = &lofFlags
		}

		result = append(result, tc)
	}

	return result
}
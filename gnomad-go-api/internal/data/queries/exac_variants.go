package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

const ExacVariantIndex = "exac_variants"

// ExacVariantFetcher implements variant fetching for ExAC dataset.
type ExacVariantFetcher struct {
	BaseVariantFetcher
}

func (f *ExacVariantFetcher) FetchVariantByID(ctx context.Context, client *elastic.Client, variantID string) (*model.VariantDetails, error) {
	// Build query
	query := f.buildVariantQuery("variant_id", variantID)

	// Execute search
	hit, err := f.executeSearch(ctx, client, query)
	if err != nil {
		return nil, err
	}

	if hit == nil {
		return nil, &VariantNotFoundError{ID: variantID, Dataset: f.DatasetID}
	}

	// Parse and shape data
	return f.shapeVariantData(ctx, client, hit)
}

func (f *ExacVariantFetcher) FetchVariantByRSID(ctx context.Context, client *elastic.Client, rsid string) (*model.VariantDetails, error) {
	query := f.buildVariantQuery("rsids", rsid)

	hit, err := f.executeSearch(ctx, client, query)
	if err != nil {
		return nil, err
	}

	if hit == nil {
		return nil, &VariantNotFoundError{ID: rsid, Dataset: f.DatasetID}
	}

	return f.shapeVariantData(ctx, client, hit)
}

func (f *ExacVariantFetcher) FetchVariantByVRSID(ctx context.Context, client *elastic.Client, vrsID string) (*model.VariantDetails, error) {
	// ExAC uses CAID for VRS-like identifiers
	query := f.buildVariantQuery("caid", vrsID)

	hit, err := f.executeSearch(ctx, client, query)
	if err != nil {
		return nil, err
	}

	if hit == nil {
		return nil, &VariantNotFoundError{ID: vrsID, Dataset: f.DatasetID}
	}

	return f.shapeVariantData(ctx, client, hit)
}

func (f *ExacVariantFetcher) buildVariantQuery(field, value string) map[string]any {
	return map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": map[string]any{
					"term": map[string]any{
						field: value,
					},
				},
			},
		},
		"_source": map[string]any{
			"includes": []string{"value"},
		},
		"size": 1,
	}
}

func (f *ExacVariantFetcher) executeSearch(ctx context.Context, client *elastic.Client, query map[string]any) (*elastic.Hit, error) {
	response, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	if len(response.Hits.Hits) == 0 {
		return nil, nil
	}

	// For rsIDs, check if we have multiple results
	if len(response.Hits.Hits) > 1 {
		return nil, fmt.Errorf("multiple variants found, query using variant ID to select one")
	}

	return &response.Hits.Hits[0], nil
}

func (f *ExacVariantFetcher) shapeVariantData(ctx context.Context, client *elastic.Client, hit *elastic.Hit) (*model.VariantDetails, error) {
	// Extract the 'value' field from _source
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid document structure")
	}

	// Parse into struct
	var variant ExacVariantDocument
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(jsonBytes, &variant); err != nil {
		return nil, err
	}

	// Build result
	result := &model.VariantDetails{
		VariantID:       variant.VariantID,
		ReferenceGenome: model.ReferenceGenomeIDGRCh37,
		Chrom:           variant.Chrom,
		Pos:             variant.Pos,
		Ref:             variant.Ref,
		Alt:             variant.Alt,
		Caid:            toStringPtr(variant.CAID),
		Rsids:           nullIfEmpty(variant.RSIDs),
		Flags:           nullIfEmpty(variant.Flags),
		// ExAC has no genome data
		Genome: nil,
	}

	// Add exome data if present
	if variant.Exome != nil {
		result.Exome = f.buildExomeData(variant.Exome)

		// Get flags for context
		var exomeFlags []string
		if variant.Exome.Flags != nil {
			exomeFlags = variant.Exome.Flags
		}
		// Add variant-level flags to exome
		if len(exomeFlags) > 0 {
			result.Exome.Flags = uniqueStrings(exomeFlags)
		}
	}

	// Add transcript consequences
	result.TranscriptConsequences = f.buildTranscriptConsequences(variant.TranscriptConsequences)

	// LOF curation results would be fetched here if available for ExAC
	// For now, we'll leave LofCuration as nil

	// Coverage - fetch actual coverage data
	// Use the original contig with chr prefix for coverage queries
	coverage, err := FetchVariantCoverage(ctx, client, variant.Locus.Contig, variant.Pos)
	if err != nil {
		// Log error but don't fail - return empty coverage instead
		coverage = &model.VariantCoverageDetails{
			Exome:  &model.VariantCoverage{},
			Genome: &model.VariantCoverage{},
		}
	}
	result.Coverage = coverage

	return result, nil
}

func (f *ExacVariantFetcher) buildExomeData(exomeData *ExacExomeData) *model.VariantDetailsExomeData {
	if exomeData == nil {
		return nil
	}

	// Build filters (add AC0 if needed)
	filters := make([]string, 0)

	// Add original filters from the exome data
	if exomeData.Filters != nil {
		filters = append(filters, exomeData.Filters...)
	}

	// Add AC0 filter if AC is 0 and not already present
	if exomeData.AC == 0 && !contains(filters, "AC0") {
		filters = append(filters, "AC0")
	}

	// Build populations
	populations := f.buildPopulations(exomeData.Populations)

	// Calculate allele frequency
	var af *float64
	if exomeData.AN > 0 {
		afValue := float64(exomeData.AC) / float64(exomeData.AN)
		af = &afValue
	}

	// Build quality metrics
	qualityMetrics := f.buildQualityMetrics(exomeData)

	return &model.VariantDetailsExomeData{
		Ac:              exomeData.AC,
		An:              exomeData.AN,
		AcHemi:          exomeData.HemizygoteCount,
		AcHom:           exomeData.HomozygoteCount,
		HemizygoteCount: toIntPtr(exomeData.HemizygoteCount),
		HomozygoteCount: toIntPtr(exomeData.HomozygoteCount),
		Af:              af,
		Populations:     populations,
		QualityMetrics:  qualityMetrics,
		Filters:         uniqueStrings(filters),
		// ExAC has no age distribution data
		AgeDistribution: nil,
	}
}

func (f *ExacVariantFetcher) buildPopulations(pops []ExacPopulationData) []*model.PopulationAlleleFrequencies {
	populations := make([]*model.PopulationAlleleFrequencies, 0, len(pops))
	for _, pop := range pops {
		// Filter out sex and subpopulation data per TypeScript logic
		if strings.Contains(pop.ID, "_") || pop.ID == "XX" || pop.ID == "XY" {
			continue
		}

		populations = append(populations, &model.PopulationAlleleFrequencies{
			ID:              pop.ID,
			Ac:              pop.AC,
			An:              pop.AN,
			AcHemi:          toIntPtrAlways(pop.HemizygoteCount),  // Always return pointer, even for 0
			AcHom:           pop.HomozygoteCount,
			HomozygoteCount: pop.HomozygoteCount,
			HemizygoteCount: toIntPtr(pop.HemizygoteCount),
		})
	}

	// Sort populations for consistent output
	sortPopulations(populations)
	return populations
}

func (f *ExacVariantFetcher) buildQualityMetrics(exomeData *ExacExomeData) *model.VariantQualityMetrics {
	if exomeData == nil {
		return nil
	}

	qm := &exomeData.QualityMetrics

	var (
		ab   *model.AlleleBalanceHistogram
		gd   *model.GenotypeDepthHistogram
		gq   *model.GenotypeQualityHistogram
		site []*model.VariantSiteQualityMetric
	)

	// Allele balance (alt only for ExAC)
	if len(qm.AlleleBalance.AltRaw.BinEdges) > 0 {
		ab = &model.AlleleBalanceHistogram{
			Alt: &model.Histogram{
				BinEdges: qm.AlleleBalance.AltRaw.BinEdges,
				BinFreq:  qm.AlleleBalance.AltRaw.BinFreq,
			},
		}
	}

	// Genotype depth - ExAC has raw histograms only
	// Per TypeScript comment, return raw histograms as the main histograms
	if len(qm.GenotypeDepth.AllRaw.BinEdges) > 0 || len(qm.GenotypeDepth.AltRaw.BinEdges) > 0 {
		gd = &model.GenotypeDepthHistogram{}
		if len(qm.GenotypeDepth.AllRaw.BinEdges) > 0 {
			gd.All = &model.Histogram{
				BinEdges: qm.GenotypeDepth.AllRaw.BinEdges,
				BinFreq:  qm.GenotypeDepth.AllRaw.BinFreq,
			}
		}
		if len(qm.GenotypeDepth.AltRaw.BinEdges) > 0 {
			gd.Alt = &model.Histogram{
				BinEdges: qm.GenotypeDepth.AltRaw.BinEdges,
				BinFreq:  qm.GenotypeDepth.AltRaw.BinFreq,
			}
		}
	}

	// Genotype quality - ExAC has raw histograms only
	// Per TypeScript comment, return raw histograms as the main histograms
	if len(qm.GenotypeQuality.AllRaw.BinEdges) > 0 || len(qm.GenotypeQuality.AltRaw.BinEdges) > 0 {
		gq = &model.GenotypeQualityHistogram{}
		if len(qm.GenotypeQuality.AllRaw.BinEdges) > 0 {
			gq.All = &model.Histogram{
				BinEdges: qm.GenotypeQuality.AllRaw.BinEdges,
				BinFreq:  qm.GenotypeQuality.AllRaw.BinFreq,
			}
		}
		if len(qm.GenotypeQuality.AltRaw.BinEdges) > 0 {
			gq.Alt = &model.Histogram{
				BinEdges: qm.GenotypeQuality.AltRaw.BinEdges,
				BinFreq:  qm.GenotypeQuality.AltRaw.BinFreq,
			}
		}
	}

	// Site quality metrics
	for _, sqm := range qm.SiteQualityMetrics {
		site = append(site, &model.VariantSiteQualityMetric{
			Metric: sqm.Metric,
			Value:  &sqm.Value,
		})
	}

	return &model.VariantQualityMetrics{
		AlleleBalance:      ab,
		GenotypeDepth:      gd,
		GenotypeQuality:    gq,
		SiteQualityMetrics: site,
	}
}

func (f *ExacVariantFetcher) buildTranscriptConsequences(consequences []map[string]interface{}) []*model.TranscriptConsequence {
	if len(consequences) == 0 {
		return nil
	}

	result := make([]*model.TranscriptConsequence, 0, len(consequences))
	for _, cons := range consequences {
		tc := &model.TranscriptConsequence{
			GeneID:       toString(cons["gene_id"]),
			TranscriptID: toString(cons["transcript_id"]),
			Hgvsc:        toStringPtr(cons["hgvs_c"]),
			Hgvsp:        toStringPtr(cons["hgvs_p"]),
		}

		// Handle consequence terms
		if terms, ok := cons["consequence_terms"].([]interface{}); ok {
			tc.ConsequenceTerms = make([]string, 0, len(terms))
			for _, term := range terms {
				tc.ConsequenceTerms = append(tc.ConsequenceTerms, toString(term))
			}
		}

		result = append(result, tc)
	}

	return result
}

// Batch fetching methods.
func (f *ExacVariantFetcher) FetchVariantsByGene(ctx context.Context, client *elastic.Client, gene *model.Gene) ([]*model.Variant, error) {
	if gene == nil {
		return nil, fmt.Errorf("gene object is required")
	}

	// Filter exons to CDS regions (or all if no CDS)
	filteredRegions := gene.Exons
	cdsExons := make([]*model.Exon, 0)
	for _, exon := range gene.Exons {
		if exon.FeatureType == "CDS" {
			cdsExons = append(cdsExons, exon)
		}
	}
	if len(cdsExons) > 0 {
		filteredRegions = cdsExons
	}

	// Add padding to regions
	const padding = 75
	rangeQueries := make([]map[string]interface{}, 0)
	for _, region := range filteredRegions {
		rangeQueries = append(rangeQueries, map[string]interface{}{
			"range": map[string]interface{}{
				"locus.position": map[string]interface{}{
					"gte": region.Start - padding,
					"lte": region.Stop + padding,
				},
			},
		})
	}

	// Build query
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{"term": map[string]interface{}{"gene_id": gene.GeneID}},
					{"bool": map[string]interface{}{"should": rangeQueries}},
				},
			},
		},
		"_source": []string{"value"},
		"sort":    []map[string]interface{}{{"locus.position": map[string]string{"order": "asc"}}},
		"size":    10000,
	}

	// Execute search
	resp, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch ExAC variants by gene: %w", err)
	}

	// Convert to variant models
	variants := make([]*model.Variant, 0)
	for _, hit := range resp.Hits.Hits {
		value, ok := hit.Source["value"].(map[string]interface{})
		if !ok {
			continue
		}

		// Parse document
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			continue
		}
		var doc ExacVariantDocument
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue
		}

		// Check if variant has data - ExAC only has exome data
		if doc.Exome == nil || doc.Exome.AC == 0 {
			continue
		}

		// Shape variant summary
		variant := f.shapeVariantSummary(&doc, gene.GeneID)
		if variant != nil {
			variants = append(variants, variant)
		}
	}

	return variants, nil
}

// shapeVariantSummary converts an ExAC document to a summary Variant model for lists
func (f *ExacVariantFetcher) shapeVariantSummary(doc *ExacVariantDocument, geneID string) *model.Variant {
	if doc == nil {
		return nil
	}

	// Build exome data
	var exomeData *model.VariantDetailsExomeData
	if doc.Exome != nil && doc.Exome.AC > 0 {
		exomeData = f.buildExomeData(doc.Exome)
	}

	// Create the variant
	variant := &model.Variant{
		VariantID:       doc.VariantID,
		ReferenceGenome: model.ReferenceGenomeIDGRCh37,
		Chrom:           doc.Chrom,
		Pos:             doc.Pos,
		Ref:             doc.Ref,
		Alt:             doc.Alt,
		Exome:           exomeData,
		Genome:          nil, // ExAC has no genome data
		Flags:           ensureEmptyArray(doc.Flags),
		Rsids:           ensureEmptyArray(doc.RSIDs),
		Rsid:            getFirstRsid(doc.RSIDs),
		Caid:            toStringPtr(doc.CAID),
		Coverage: &model.VariantCoverageDetails{
			Exome:  &model.VariantCoverage{},
			Genome: &model.VariantCoverage{},
		},
	}

	// Add flattened transcript consequence fields from the first relevant consequence
	if len(doc.TranscriptConsequences) > 0 {
		// Find the first consequence for this gene
		var relevantConsequence map[string]interface{}
		for _, csq := range doc.TranscriptConsequences {
			if csqGeneID, ok := csq["gene_id"].(string); ok && csqGeneID == geneID {
				relevantConsequence = csq
				break
			}
		}

		// If no gene-specific consequence found, use the first one
		if relevantConsequence == nil && len(doc.TranscriptConsequences) > 0 {
			relevantConsequence = doc.TranscriptConsequences[0]
		}

		if relevantConsequence != nil {
			if consequence, ok := relevantConsequence["major_consequence"].(string); ok {
				variant.Consequence = &consequence
			}
			if geneSymbol, ok := relevantConsequence["gene_symbol"].(string); ok {
				variant.GeneSymbol = &geneSymbol
			}
			if hgvsc, ok := relevantConsequence["hgvsc"].(string); ok {
				variant.Hgvsc = &hgvsc
			}
			if hgvsp, ok := relevantConsequence["hgvsp"].(string); ok {
				variant.Hgvsp = &hgvsp
			}
			// Set hgvs to hgvsp if available, otherwise hgvsc
			if hgvsp, ok := relevantConsequence["hgvsp"].(string); ok && hgvsp != "" {
				variant.Hgvs = &hgvsp
			} else if hgvsc, ok := relevantConsequence["hgvsc"].(string); ok {
				variant.Hgvs = &hgvsc
			}
			if lof, ok := relevantConsequence["lof"].(string); ok {
				variant.Lof = &lof
			}
			if lofFilter, ok := relevantConsequence["lof_filter"].(string); ok {
				variant.LofFilter = &lofFilter
			}
			if lofFlags, ok := relevantConsequence["lof_flags"].(string); ok {
				variant.LofFlags = &lofFlags
			}
			if transcriptID, ok := relevantConsequence["transcript_id"].(string); ok {
				variant.TranscriptID = &transcriptID
			}
			if transcriptVersion, ok := relevantConsequence["transcript_version"].(string); ok {
				variant.TranscriptVersion = &transcriptVersion
			}
			// Set the gene ID
			variant.GeneID = &geneID
		}
	}

	// Add full transcript consequences
	variant.TranscriptConsequences = f.buildTranscriptConsequences(doc.TranscriptConsequences)

	return variant
}

func (f *ExacVariantFetcher) FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.Variant, error) {
	return nil, fmt.Errorf("ExAC region variant fetching not yet implemented")
}

func (f *ExacVariantFetcher) FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.Variant, error) {
	return nil, fmt.Errorf("ExAC transcript variant fetching not yet implemented")
}

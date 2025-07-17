package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// GnomadV3VariantFetcher implements variant fetching for gnomAD v3.
type GnomadV3VariantFetcher struct {
	BaseVariantFetcher
	Subset string // "all", "non_v2", "non_cancer", "non_neuro", "non_topmed", "controls_and_biobanks"
}

func (f *GnomadV3VariantFetcher) FetchVariantByID(ctx context.Context, client *elastic.Client, variantID string) (*model.VariantDetails, error) {
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

func (f *GnomadV3VariantFetcher) FetchVariantByRSID(ctx context.Context, client *elastic.Client, rsid string) (*model.VariantDetails, error) {
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

func (f *GnomadV3VariantFetcher) FetchVariantByVRSID(ctx context.Context, client *elastic.Client, vrsID string) (*model.VariantDetails, error) {
	// V3 doesn't have VRS IDs, but we can try with CAID
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

func (f *GnomadV3VariantFetcher) buildVariantQuery(field, value string) map[string]any {
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

func (f *GnomadV3VariantFetcher) executeSearch(ctx context.Context, client *elastic.Client, query map[string]any) (*elastic.Hit, error) {
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

func (f *GnomadV3VariantFetcher) shapeVariantData(ctx context.Context, client *elastic.Client, hit *elastic.Hit) (*model.VariantDetails, error) {
	// Extract the 'value' field from _source
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid document structure")
	}

	// Parse into struct
	var doc GnomadV3VariantDocument
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(jsonBytes, &doc); err != nil {
		return nil, err
	}

	// Check if variant exists in subset
	if !f.variantExistsInSubset(&doc) {
		return nil, &VariantNotFoundError{ID: doc.VariantID, Dataset: f.DatasetID}
	}

	// Extract variant info from locus and alleles
	if doc.Locus.Contig != "" && len(doc.Alleles) >= 2 {
		doc.Chrom = strings.TrimPrefix(doc.Locus.Contig, "chr")
		doc.Pos = doc.Locus.Position
		doc.Ref = doc.Alleles[0]
		doc.Alt = doc.Alleles[1]
	}

	// Shape the data
	variant := &model.VariantDetails{
		VariantID:       doc.VariantID,
		ReferenceGenome: model.ReferenceGenomeIDGRCh38,
		Chrom:           doc.Chrom,
		Pos:             doc.Pos,
		Ref:             doc.Ref,
		Alt:             doc.Alt,
		Rsids:           nullIfEmpty(doc.RSIDs),
	}

	// Add CAID if present
	if doc.CAID != "" {
		variant.Caid = &doc.CAID
	}

	// Shape genome data
	if doc.Genome != nil && doc.Genome.Freq != nil && doc.Genome.Freq[f.Subset] != nil {
		variant.Genome = f.shapeGenomeData(doc.Genome, f.Subset)
	}

	// V3 has no exome data
	variant.Exome = nil

	// V3 has no joint data
	variant.Joint = nil

	// Convert document to map for flag processing
	docMap := f.convertDocumentToMap(&doc)

	// Add flags with proper context
	context := FlagContext{
		Type: "region", // Default to region context for single variant queries
	}
	variant.Flags = GetFlagsForContext(docMap, context, f.Subset)

	// Add other fields
	variant.ColocatedVariants = f.getColocatedVariants(doc.ColocatedVariants)
	variant.TranscriptConsequences = ShapeTranscriptConsequences(doc.TranscriptConsequences, TranscriptConsequenceOptions{
		IncludeENSEMBLOnly: true,
	})

	// Transform in_silico_predictors from struct to map
	predictorsMap := f.convertInSilicoPredictorsToMap(doc.InSilicoPredictors)
	variant.InSilicoPredictors = CreateInSilicoPredictorsList(predictorsMap)

	// Coverage - fetch actual coverage data
	// Use the original contig with chr prefix for coverage queries
	coverage, err := FetchVariantCoverage(ctx, client, doc.Locus.Contig, doc.Pos)
	if err != nil {
		// Log error but don't fail - return empty coverage instead
		coverage = &model.VariantCoverageDetails{
			Exome:  &model.VariantCoverage{},
			Genome: &model.VariantCoverage{},
		}
	}
	variant.Coverage = coverage

	return variant, nil
}

func (f *GnomadV3VariantFetcher) variantExistsInSubset(doc *GnomadV3VariantDocument) bool {
	// Check if variant has data in the subset
	if doc.Genome == nil || doc.Genome.Freq == nil || doc.Genome.Freq[f.Subset] == nil {
		return false
	}

	// Check if variant has raw allele count > 0
	return doc.Genome.Freq[f.Subset].ACRaw > 0
}

func (f *GnomadV3VariantFetcher) shapeGenomeData(data *GnomadV3GenomeData, subset string) *model.VariantDetailsGenomeData {
	freqData := data.Freq[subset]
	if freqData == nil {
		return nil
	}

	// Get filters - combine genome-level filters with subset-specific filters
	filters := mergeStringSlices(data.Filters, freqData.Filters)

	// Add AC=0 filter if needed
	filters = AddAC0FilterIfNeeded(filters, freqData.AC)

	shaped := &model.VariantDetailsGenomeData{
		Ac:      freqData.AC,
		An:      freqData.AN,
		AcHemi:  freqData.HemizygoteCount,
		AcHom:   freqData.HomozygoteCount,
		Filters: filters,
	}

	// Shape populations with prefix merging (hgdp: and 1kg: prefixes)
	shaped.Populations = f.shapeAndMergePopulations(freqData.Populations, freqData)

	// Add quality metrics
	if len(data.QualityMetrics.AlleleBalance.AltAdj.BinEdges) > 0 {
		shaped.QualityMetrics = &model.VariantQualityMetrics{
			AlleleBalance: &model.AlleleBalanceHistogram{
				Alt: &model.Histogram{
					BinEdges: data.QualityMetrics.AlleleBalance.AltAdj.BinEdges,
					BinFreq:  data.QualityMetrics.AlleleBalance.AltAdj.BinFreq,
				},
			},
			GenotypeDepth: &model.GenotypeDepthHistogram{
				All: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeDepth.AllAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeDepth.AllAdj.BinFreq,
				},
				Alt: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeDepth.AltAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeDepth.AltAdj.BinFreq,
				},
			},
			GenotypeQuality: &model.GenotypeQualityHistogram{
				All: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeQuality.AllAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeQuality.AllAdj.BinFreq,
				},
				Alt: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeQuality.AltAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeQuality.AltAdj.BinFreq,
				},
			},
			SiteQualityMetrics: f.shapeSiteQualityMetrics(data.QualityMetrics.SiteQualityMetrics),
		}
	}

	return shaped
}

func (f *GnomadV3VariantFetcher) shapeAndMergePopulations(basePopulations []GnomadV3PopulationData, freqData *GnomadV3FrequencyData) []*model.PopulationAlleleFrequencies {
	// Create map to track populations
	popMap := make(map[string]*model.PopulationAlleleFrequencies)

	// Add base populations
	for _, pop := range basePopulations {
		popMap[pop.ID] = &model.PopulationAlleleFrequencies{
			ID:              pop.ID,
			Ac:              pop.AC,
			An:              pop.AN,
			HomozygoteCount: pop.HomozygoteCount,
			HemizygoteCount: &pop.HemizygoteCount,
		}
	}

	// Add HGDP populations with "hgdp:" prefix
	if freqData.HGDP != nil && freqData.HGDP.ACRaw > 0 {
		for _, pop := range freqData.HGDP.Populations {
			prefixedID := "hgdp:" + pop.ID
			popMap[prefixedID] = &model.PopulationAlleleFrequencies{
				ID:              prefixedID,
				Ac:              pop.AC,
				An:              pop.AN,
				HomozygoteCount: pop.HomozygoteCount,
				HemizygoteCount: &pop.HemizygoteCount,
			}
		}
	}

	// Add 1KG populations with "1kg:" prefix - but only for non_v2 subset
	if freqData.TGP != nil && freqData.TGP.ACRaw > 0 && f.Subset != "non_v2" {
		for _, pop := range freqData.TGP.Populations {
			prefixedID := "1kg:" + pop.ID
			popMap[prefixedID] = &model.PopulationAlleleFrequencies{
				ID:              prefixedID,
				Ac:              pop.AC,
				An:              pop.AN,
				HomozygoteCount: pop.HomozygoteCount,
				HemizygoteCount: &pop.HemizygoteCount,
			}
		}
	}

	// Convert to sorted slice
	result := make([]*model.PopulationAlleleFrequencies, 0, len(popMap))
	for _, pop := range popMap {
		result = append(result, pop)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].ID < result[j].ID
	})

	return result
}

func (f *GnomadV3VariantFetcher) shapeSiteQualityMetrics(metrics []struct {
	Metric string   `json:"metric"`
	Value  *float64 `json:"value"`
}) []*model.VariantSiteQualityMetric {
	var result []*model.VariantSiteQualityMetric
	for _, m := range metrics {
		// Only include metrics with finite values
		if m.Value != nil && *m.Value != 0 {
			result = append(result, &model.VariantSiteQualityMetric{
				Metric: m.Metric,
				Value:  m.Value,
			})
		}
	}
	return result
}

func (f *GnomadV3VariantFetcher) getColocatedVariants(colocatedMap map[string][]string) []string {
	if f.Subset == "" || colocatedMap == nil {
		return nil
	}

	return colocatedMap[f.Subset]
}

// convertInSilicoPredictorsToMap converts V3 in silico predictors struct to generic map
func (f *GnomadV3VariantFetcher) convertInSilicoPredictorsToMap(predictors GnomadV3InSilicoPredictors) map[string]interface{} {
	result := make(map[string]interface{})

	// REVEL
	if predictors.REVEL != nil && predictors.REVEL.REVELScore != nil {
		result["revel"] = *predictors.REVEL.REVELScore
	}

	// CADD
	if predictors.CADD != nil && predictors.CADD.Phred != nil {
		result["cadd"] = map[string]interface{}{
			"phred": *predictors.CADD.Phred,
		}
	}

	// SpliceAI
	if predictors.SpliceAI != nil && predictors.SpliceAI.SpliceAIScore != nil {
		result["spliceai"] = *predictors.SpliceAI.SpliceAIScore
	}

	// Note: The shared helper CreateInSilicoPredictorsList handles the formatting
	// and flags based on the predictor names in the map

	return result
}

// shapeVariantSummary converts a gnomAD v3 document to a summary Variant model for lists
func (f *GnomadV3VariantFetcher) shapeVariantSummary(doc *GnomadV3VariantDocument, geneID string) *model.Variant {
	if doc == nil {
		return nil
	}
	
	// Build genome data
	var genomeData *model.VariantDetailsGenomeData
	if doc.Genome != nil && doc.Genome.Freq[f.Subset] != nil && doc.Genome.Freq[f.Subset].ACRaw > 0 {
		genomeData = f.shapeGenomeData(doc.Genome, f.Subset)
	}
	
	// To match TS, filter populations here to remove XX/XY and sub-pops
	if genomeData != nil && genomeData.Populations != nil {
		filteredPops := []*model.PopulationAlleleFrequencies{}
		for _, pop := range genomeData.Populations {
			if !strings.Contains(pop.ID, "_") && pop.ID != "XX" && pop.ID != "XY" {
				filteredPops = append(filteredPops, pop)
			}
		}
		genomeData.Populations = filteredPops
	}
	
	// Create the variant
	variant := &model.Variant{
		VariantID:       doc.VariantID,
		ReferenceGenome: model.ReferenceGenomeIDGRCh38,
		Chrom:           doc.Chrom,
		Pos:             doc.Pos,
		Ref:             doc.Ref,
		Alt:             doc.Alt,
		Genome:          genomeData,
		Flags:           ensureEmptyArray(doc.Flags),
		Rsids:           ensureEmptyArray(doc.RSIDs),
		Rsid:            getFirstRsid(doc.RSIDs),
		Caid:            toStringPtr(doc.CAID),
	}
	
	// Add flattened transcript consequence fields
	if len(doc.TranscriptConsequences) > 0 {
		// Region/Gene/Transcript-aware consequence selection
		var context FlagContext
		if geneID != "" {
			context = FlagContext{Type: "gene", GeneID: geneID}
		} else {
			context = FlagContext{Type: "region"}
		}
		
		relevantConsequence := GetConsequenceForContext(doc.TranscriptConsequences, context)
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

			if csqGeneID, ok := relevantConsequence["gene_id"].(string); ok {
				variant.GeneID = &csqGeneID
			}
		}
	}

	return variant
}

// Helper functions (defined in gnomad_v2_variants.go)

// convertDocumentToMap converts a GnomadV3VariantDocument to a generic map for flag processing
func (f *GnomadV3VariantFetcher) convertDocumentToMap(doc *GnomadV3VariantDocument) map[string]interface{} {
	result := make(map[string]interface{})

	// Add base flags
	result["flags"] = doc.Flags

	// Add transcript consequences
	if doc.TranscriptConsequences != nil {
		result["transcript_consequences"] = doc.TranscriptConsequences
	}

	// Add genome data
	if doc.Genome != nil && doc.Genome.Freq != nil {
		genomeMap := make(map[string]interface{})
		// V3 has freq data keyed by subset
		freqMap := make(map[string]interface{})
		for subset, freq := range doc.Genome.Freq {
			if freq != nil {
				freqMap[subset] = map[string]interface{}{
					"ac":      float64(freq.AC),
					"filters": freq.Filters,
				}
			}
		}
		genomeMap["freq"] = freqMap
		result["genome"] = genomeMap
	}

	return result
}

// Batch fetching methods
func (f *GnomadV3VariantFetcher) FetchVariantsByGene(ctx context.Context, client *elastic.Client, gene *model.Gene) ([]*model.Variant, error) {
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
		return nil, fmt.Errorf("failed to fetch gnomAD v3 variants by gene: %w", err)
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
		var doc GnomadV3VariantDocument
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue
		}

		// Check if variant has data in subset
		if doc.Genome == nil || doc.Genome.Freq == nil || doc.Genome.Freq[f.Subset] == nil || doc.Genome.Freq[f.Subset].ACRaw <= 0 {
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

func (f *GnomadV3VariantFetcher) FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.Variant, error) {
	// Build the query to find variants in the region
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{
						"term": map[string]interface{}{
							"locus.contig": "chr" + chrom,
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
		},
		"_source": []string{"value"},
		"size":    10000, // Limit results
		"sort": []interface{}{
			map[string]interface{}{
				"locus.position": map[string]interface{}{
					"order": "asc",
				},
			},
		},
	}

	// Execute search
	resp, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gnomAD v3 variants by region: %w", err)
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
		var doc GnomadV3VariantDocument
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue
		}
		
		if doc.Chrom == "" && doc.Locus.Contig != "" {
			doc.Chrom, doc.Pos, doc.Ref, doc.Alt = ExtractVariantInfo(map[string]interface{}{
				"contig":   doc.Locus.Contig,
				"position": float64(doc.Locus.Position),
			}, []interface{}{doc.Alleles[0], doc.Alleles[1]})
		}

		// Check if variant has data in subset
		if doc.Genome == nil || doc.Genome.Freq == nil || doc.Genome.Freq[f.Subset] == nil || doc.Genome.Freq[f.Subset].ACRaw <= 0 {
			continue
		}

		// Shape variant summary
		variant := f.shapeVariantSummary(&doc, "")
		if variant != nil {
			variants = append(variants, variant)
		}
	}

	return variants, nil
}

func (f *GnomadV3VariantFetcher) FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.Variant, error) {
	// Build the query to find variants for this transcript
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{
						"term": map[string]interface{}{
							"transcript_id": transcriptID,
						},
					},
				},
			},
		},
		"_source": []string{"value"},
		"size":    10000,
		"sort": []interface{}{
			map[string]interface{}{
				"locus.position": map[string]interface{}{
					"order": "asc",
				},
			},
		},
	}

	// Execute search
	resp, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gnomAD v3 variants by transcript: %w", err)
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
		var doc GnomadV3VariantDocument
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue
		}

		// Re-extract locus info
		if doc.Chrom == "" && doc.Locus.Contig != "" {
			doc.Chrom, doc.Pos, doc.Ref, doc.Alt = ExtractVariantInfo(map[string]interface{}{
				"contig":   doc.Locus.Contig,
				"position": float64(doc.Locus.Position),
			}, []interface{}{doc.Alleles[0], doc.Alleles[1]})
		}
		
		// Check if variant has data in subset
		if doc.Genome == nil || doc.Genome.Freq == nil || doc.Genome.Freq[f.Subset] == nil || doc.Genome.Freq[f.Subset].ACRaw <= 0 {
			continue
		}

		// For transcript variants, we need to find the specific transcript consequence
		// and use that gene_id for context
		var geneID string
		if doc.TranscriptConsequences != nil {
			for _, tc := range doc.TranscriptConsequences {
				if tid, ok := tc["transcript_id"].(string); ok && tid == transcriptID {
					if gid, ok := tc["gene_id"].(string); ok {
						geneID = gid
						break
					}
				}
			}
		}
		
		// Shape variant summary
		variant := f.shapeVariantSummary(&doc, geneID)
		if variant != nil {
			variants = append(variants, variant)
		}
	}

	return variants, nil
}

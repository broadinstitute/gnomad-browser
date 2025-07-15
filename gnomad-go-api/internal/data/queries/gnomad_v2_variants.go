package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

const GnomadV2Index = "gnomad_v2_variants"

// GnomadV2VariantFetcher implements variant fetching for gnomAD v2.
type GnomadV2VariantFetcher struct {
	BaseVariantFetcher
	Subset string // "gnomad", "non_neuro", "non_cancer", "controls_only"
}

func (f *GnomadV2VariantFetcher) FetchVariantByID(ctx context.Context, client *elastic.Client, variantID string) (*model.VariantDetails, error) {
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
	return f.shapeVariantData(hit)
}

func (f *GnomadV2VariantFetcher) FetchVariantByRSID(ctx context.Context, client *elastic.Client, rsid string) (*model.VariantDetails, error) {
	query := f.buildVariantQuery("rsids", rsid)

	hit, err := f.executeSearch(ctx, client, query)
	if err != nil {
		return nil, err
	}

	if hit == nil {
		return nil, &VariantNotFoundError{ID: rsid, Dataset: f.DatasetID}
	}

	return f.shapeVariantData(hit)
}

func (f *GnomadV2VariantFetcher) FetchVariantByVRSID(ctx context.Context, client *elastic.Client, vrsID string) (*model.VariantDetails, error) {
	// V2 uses CAID for VRS-like identifiers
	query := f.buildVariantQuery("caid", vrsID)

	hit, err := f.executeSearch(ctx, client, query)
	if err != nil {
		return nil, err
	}

	if hit == nil {
		return nil, &VariantNotFoundError{ID: vrsID, Dataset: f.DatasetID}
	}

	return f.shapeVariantData(hit)
}

func (f *GnomadV2VariantFetcher) buildVariantQuery(field, value string) map[string]any {
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

func (f *GnomadV2VariantFetcher) executeSearch(ctx context.Context, client *elastic.Client, query map[string]any) (*elastic.Hit, error) {
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

func (f *GnomadV2VariantFetcher) shapeVariantData(hit *elastic.Hit) (*model.VariantDetails, error) {
	// Extract the 'value' field from _source
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid document structure")
	}

	// Parse into struct
	var variant GnomadV2VariantDocument
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(jsonBytes, &variant); err != nil {
		return nil, err
	}

	// Get subset-specific keys
	exomeSubset := f.Subset
	genomeSubset := f.Subset
	if f.Subset == "non_cancer" {
		genomeSubset = "gnomad" // Special mapping for v2
	}

	// Check if variant exists in subset
	var hasExomeData, hasGenomeData bool
	if variant.Exome != nil && variant.Exome.Freq[exomeSubset] != nil {
		hasExomeData = variant.Exome.Freq[exomeSubset].ACRaw > 0
	}
	if variant.Genome != nil && variant.Genome.Freq[genomeSubset] != nil {
		hasGenomeData = variant.Genome.Freq[genomeSubset].ACRaw > 0
	}

	if !hasExomeData && !hasGenomeData {
		return nil, &VariantNotFoundError{ID: variant.VariantID, Dataset: f.DatasetID}
	}

	// Build result
	result := &model.VariantDetails{
		VariantID:         variant.VariantID,
		ReferenceGenome:   model.ReferenceGenomeIDGRCh37,
		Chrom:             variant.Chrom,
		Pos:               variant.Pos,
		Ref:               variant.Ref,
		Alt:               variant.Alt,
		Caid:              toStringPtr(variant.CAID),
		Rsids:             nullIfEmpty(variant.RSIDs),
		ColocatedVariants: f.getColocatedVariants(variant.ColocatedVariants),
		Flags:             nullIfEmpty(variant.Flags),
	}

	// Add exome data if present
	if hasExomeData {
		result.Exome = f.buildExomeData(variant.Exome.Freq[exomeSubset], variant.Exome, exomeSubset)
	}

	// Add genome data if present
	if hasGenomeData {
		result.Genome = f.buildGenomeData(variant.Genome.Freq[genomeSubset], variant.Genome, genomeSubset)
	}

	// Add transcript consequences
	result.TranscriptConsequences = f.buildTranscriptConsequences(variant.TranscriptConsequences)

	return result, nil
}

func (f *GnomadV2VariantFetcher) getColocatedVariants(colocated map[string][]string) []string {
	if colocated == nil {
		return nil
	}
	if variants, ok := colocated[f.Subset]; ok {
		return nullIfEmpty(variants)
	}
	return nil
}

func (f *GnomadV2VariantFetcher) buildExomeData(freqData *GnomadV2FrequencyData, exomeData *GnomadV2ExomeData, subset string) *model.VariantDetailsExomeData {
	if freqData == nil {
		return nil
	}

	// Build filters (add AC0 if needed)
	filters := make([]string, 0)

	// Add original filters from the exome data
	if exomeData.Filters != nil {
		filters = append(filters, exomeData.Filters...)
	}

	// Add frequency-specific filters
	if freqData.Filters != nil {
		filters = append(filters, freqData.Filters...)
	}

	// Add AC0 filter if AC is 0 and not already present
	if freqData.AC == 0 && !contains(filters, "AC0") {
		filters = append(filters, "AC0")
	}

	// Build populations
	populations := f.buildPopulations(freqData.Populations)

	// Calculate allele frequency
	var af *float64
	if freqData.AN > 0 {
		afValue := float64(freqData.AC) / float64(freqData.AN)
		af = &afValue
	}

	// Build quality metrics
	var qualityMetrics *model.VariantQualityMetrics
	if exomeData != nil {
		qualityMetrics = f.buildQualityMetrics(&exomeData.QualityMetrics)
	}

	// Build age distribution
	var ageDistribution *model.AgeDistribution
	if exomeData != nil && exomeData.AgeDistribution[subset] != nil {
		ageDistribution = f.buildAgeDistribution(exomeData.AgeDistribution[subset])
	}

	return &model.VariantDetailsExomeData{
		Ac:              freqData.AC,
		An:              freqData.AN,
		AcHemi:          freqData.HemizygoteCount,
		AcHom:           freqData.HomozygoteCount,
		HemizygoteCount: toIntPtr(freqData.HemizygoteCount),
		HomozygoteCount: toIntPtr(freqData.HomozygoteCount),
		Af:              af,
		Populations:     populations,
		QualityMetrics:  qualityMetrics,
		AgeDistribution: ageDistribution,
		Filters:         uniqueStrings(filters),
	}
}

func (f *GnomadV2VariantFetcher) buildGenomeData(freqData *GnomadV2FrequencyData, genomeData *GnomadV2GenomeData, subset string) *model.VariantDetailsGenomeData {
	if freqData == nil {
		return nil
	}

	// Build filters (add AC0 if needed)
	filters := make([]string, 0)

	// Add original filters from the genome data
	if genomeData.Filters != nil {
		filters = append(filters, genomeData.Filters...)
	}

	// Add frequency-specific filters
	if freqData.Filters != nil {
		filters = append(filters, freqData.Filters...)
	}

	// Add AC0 filter if AC is 0 and not already present
	if freqData.AC == 0 && !contains(filters, "AC0") {
		filters = append(filters, "AC0")
	}

	// Build populations
	populations := f.buildPopulations(freqData.Populations)

	// Calculate allele frequency
	var af *float64
	if freqData.AN > 0 {
		afValue := float64(freqData.AC) / float64(freqData.AN)
		af = &afValue
	}

	// Build quality metrics
	var qualityMetrics *model.VariantQualityMetrics
	if genomeData != nil {
		qualityMetrics = f.buildQualityMetrics(&genomeData.QualityMetrics)
	}

	// Build age distribution
	var ageDistribution *model.AgeDistribution
	if genomeData != nil && genomeData.AgeDistribution[subset] != nil {
		ageDistribution = f.buildAgeDistribution(genomeData.AgeDistribution[subset])
	}

	return &model.VariantDetailsGenomeData{
		Ac:              freqData.AC,
		An:              freqData.AN,
		AcHemi:          freqData.HemizygoteCount,
		AcHom:           freqData.HomozygoteCount,
		HemizygoteCount: toIntPtr(freqData.HemizygoteCount),
		HomozygoteCount: toIntPtr(freqData.HomozygoteCount),
		Af:              af,
		Populations:     populations,
		QualityMetrics:  qualityMetrics,
		AgeDistribution: ageDistribution,
		Filters:         uniqueStrings(filters),
	}
}

func (f *GnomadV2VariantFetcher) buildPopulations(pops []GnomadV2PopulationData) []*model.PopulationAlleleFrequencies {
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
			AcHom:           pop.HomozygoteCount,
			HomozygoteCount: pop.HomozygoteCount,
			HemizygoteCount: toIntPtr(pop.HemizygoteCount),
		})
	}

	// Sort populations for consistent output
	sortPopulations(populations)
	return populations
}

func (f *GnomadV2VariantFetcher) buildQualityMetrics(qm interface{}) *model.VariantQualityMetrics {
	// Cast to the proper type
	var (
		ab   *model.AlleleBalanceHistogram
		gd   *model.GenotypeDepthHistogram
		gq   *model.GenotypeQualityHistogram
		site []*model.VariantSiteQualityMetric
	)

	switch q := qm.(type) {
	case *struct {
		AlleleBalance struct {
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_raw"`
		} `json:"allele_balance"`
		GenotypeDepth struct {
			AllRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"all_raw"`
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_raw"`
		} `json:"genotype_depth"`
		GenotypeQuality struct {
			AllRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"all_raw"`
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_raw"`
		} `json:"genotype_quality"`
		SiteQualityMetrics []struct {
			Metric string  `json:"metric"`
			Value  float64 `json:"value"`
		} `json:"site_quality_metrics"`
	}:
		// Allele balance (alt only for v2)
		if len(q.AlleleBalance.AltRaw.BinEdges) > 0 {
			ab = &model.AlleleBalanceHistogram{
				Alt: &model.Histogram{
					BinEdges: q.AlleleBalance.AltRaw.BinEdges,
					BinFreq:  q.AlleleBalance.AltRaw.BinFreq,
				},
			}
		}

		// Genotype depth
		if len(q.GenotypeDepth.AllRaw.BinEdges) > 0 || len(q.GenotypeDepth.AltRaw.BinEdges) > 0 {
			gd = &model.GenotypeDepthHistogram{}
			if len(q.GenotypeDepth.AllRaw.BinEdges) > 0 {
				gd.All = &model.Histogram{
					BinEdges: q.GenotypeDepth.AllRaw.BinEdges,
					BinFreq:  q.GenotypeDepth.AllRaw.BinFreq,
				}
			}
			if len(q.GenotypeDepth.AltRaw.BinEdges) > 0 {
				gd.Alt = &model.Histogram{
					BinEdges: q.GenotypeDepth.AltRaw.BinEdges,
					BinFreq:  q.GenotypeDepth.AltRaw.BinFreq,
				}
			}
		}

		// Genotype quality
		if len(q.GenotypeQuality.AllRaw.BinEdges) > 0 || len(q.GenotypeQuality.AltRaw.BinEdges) > 0 {
			gq = &model.GenotypeQualityHistogram{}
			if len(q.GenotypeQuality.AllRaw.BinEdges) > 0 {
				gq.All = &model.Histogram{
					BinEdges: q.GenotypeQuality.AllRaw.BinEdges,
					BinFreq:  q.GenotypeQuality.AllRaw.BinFreq,
				}
			}
			if len(q.GenotypeQuality.AltRaw.BinEdges) > 0 {
				gq.Alt = &model.Histogram{
					BinEdges: q.GenotypeQuality.AltRaw.BinEdges,
					BinFreq:  q.GenotypeQuality.AltRaw.BinFreq,
				}
			}
		}

		// Site quality metrics
		for _, sqm := range q.SiteQualityMetrics {
			site = append(site, &model.VariantSiteQualityMetric{
				Metric: sqm.Metric,
				Value:  &sqm.Value,
			})
		}
	}

	return &model.VariantQualityMetrics{
		AlleleBalance:      ab,
		GenotypeDepth:      gd,
		GenotypeQuality:    gq,
		SiteQualityMetrics: site,
	}
}

func (f *GnomadV2VariantFetcher) buildAgeDistribution(ad *GnomadV2AgeDistribution) *model.AgeDistribution {
	if ad == nil {
		return nil
	}

	var het, hom *model.Histogram

	if len(ad.Het.BinEdges) > 0 {
		het = &model.Histogram{
			BinEdges: ad.Het.BinEdges,
			BinFreq:  intSliceToFloat64(ad.Het.BinFreq),
			NSmaller: toIntPtr(ad.Het.NSmaller),
			NLarger:  toIntPtr(ad.Het.NLarger),
		}
	}

	if len(ad.Hom.BinEdges) > 0 {
		hom = &model.Histogram{
			BinEdges: ad.Hom.BinEdges,
			BinFreq:  intSliceToFloat64(ad.Hom.BinFreq),
			NSmaller: toIntPtr(ad.Hom.NSmaller),
			NLarger:  toIntPtr(ad.Hom.NLarger),
		}
	}

	return &model.AgeDistribution{
		Het: het,
		Hom: hom,
	}
}

func (f *GnomadV2VariantFetcher) buildTranscriptConsequences(consequences []map[string]interface{}) []*model.TranscriptConsequence {
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
func (f *GnomadV2VariantFetcher) FetchVariantsByGene(ctx context.Context, client *elastic.Client, geneID string, transcriptID *string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v2 gene variant fetching not yet implemented")
}

func (f *GnomadV2VariantFetcher) FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v2 region variant fetching not yet implemented")
}

func (f *GnomadV2VariantFetcher) FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v2 transcript variant fetching not yet implemented")
}

// Helper functions

func intSliceToFloat64(ints []int) []float64 {
	result := make([]float64, len(ints))
	for i, v := range ints {
		result[i] = float64(v)
	}
	return result
}

func toIntPtr(v int) *int {
	if v == 0 {
		return nil
	}
	return &v
}

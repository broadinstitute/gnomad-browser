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
	return f.shapeVariantData(hit)
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

	return f.shapeVariantData(hit)
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

	return f.shapeVariantData(hit)
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

func (f *ExacVariantFetcher) shapeVariantData(hit *elastic.Hit) (*model.VariantDetails, error) {
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

// Batch fetching methods - not yet implemented for ExAC
func (f *ExacVariantFetcher) FetchVariantsByGene(ctx context.Context, client *elastic.Client, geneID string, transcriptID *string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("ExAC gene variant fetching not yet implemented")
}

func (f *ExacVariantFetcher) FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("ExAC region variant fetching not yet implemented")
}

func (f *ExacVariantFetcher) FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("ExAC transcript variant fetching not yet implemented")
}

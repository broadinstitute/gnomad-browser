package queries

import (
	"context"
	"encoding/json"
	"fmt"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

const LofCurationIndex = "gnomad_v2_lof_curation_results"

// fetchLofCurationResultsByVariant fetches LoF curation data for a specific variant
func fetchLofCurationResultsByVariant(ctx context.Context, client *elastic.Client, variantID string) ([]*model.VariantLofCuration, error) {
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": map[string]interface{}{
					"term": map[string]interface{}{
						"variant_id": variantID,
					},
				},
			},
		},
		"size": 1,
	}

	response, err := client.Search(ctx, LofCurationIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch LoF curation results: %w", err)
	}

	if len(response.Hits.Hits) == 0 {
		return []*model.VariantLofCuration{}, nil
	}

	// Extract the lof_curations from the first hit
	hit := response.Hits.Hits[0]
	value, ok := hit.Source["value"].(map[string]interface{})
	if !ok {
		return []*model.VariantLofCuration{}, nil
	}

	lofCurations, ok := value["lof_curations"].([]interface{})
	if !ok {
		return []*model.VariantLofCuration{}, nil
	}

	// Convert to model
	var result []*model.VariantLofCuration
	for _, curation := range lofCurations {
		curationMap, ok := curation.(map[string]interface{})
		if !ok {
			continue
		}

		lofCuration := &model.VariantLofCuration{
			GeneID:      toString(curationMap["gene_id"]),
			GeneVersion: toString(curationMap["gene_version"]),
			GeneSymbol:  toStringPtr(curationMap["gene_symbol"]),
			Verdict:     toString(curationMap["verdict"]),
			Project:     toString(curationMap["project"]),
		}

		// Handle flags array
		if flags, ok := curationMap["flags"].([]interface{}); ok {
			lofCuration.Flags = make([]string, 0, len(flags))
			for _, flag := range flags {
				if flagStr, ok := flag.(string); ok {
					lofCuration.Flags = append(lofCuration.Flags, flagStr)
				}
			}
		}

		result = append(result, lofCuration)
	}

	return result, nil
}

// fetchLofCurationResultsByGene fetches LoF curation data for all variants in a gene
func fetchLofCurationResultsByGene(ctx context.Context, client *elastic.Client, gene *model.Gene) ([]LofCurationResult, error) {
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": map[string]interface{}{
					"term": map[string]interface{}{
						"gene_id": gene.GeneID,
					},
				},
			},
		},
		"size": 1000,
	}

	response, err := client.Search(ctx, LofCurationIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch LoF curation results by gene: %w", err)
	}

	var results []LofCurationResult
	for _, hit := range response.Hits.Hits {
		value, ok := hit.Source["value"].(map[string]interface{})
		if !ok {
			continue
		}

		var result LofCurationResult
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			continue
		}
		if err := json.Unmarshal(jsonBytes, &result); err != nil {
			continue
		}

		results = append(results, result)
	}

	return results, nil
}

// fetchLofCurationResultsByRegion fetches LoF curation data for all variants in a region
func fetchLofCurationResultsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]LofCurationResult, error) {
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{
						"term": map[string]interface{}{
							"locus.contig": chrom,
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
		"size": 1000,
	}

	response, err := client.Search(ctx, LofCurationIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch LoF curation results by region: %w", err)
	}

	var results []LofCurationResult
	for _, hit := range response.Hits.Hits {
		value, ok := hit.Source["value"].(map[string]interface{})
		if !ok {
			continue
		}

		var result LofCurationResult
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			continue
		}
		if err := json.Unmarshal(jsonBytes, &result); err != nil {
			continue
		}

		results = append(results, result)
	}

	return results, nil
}

// LofCurationResult represents a document from the LoF curation index
type LofCurationResult struct {
	VariantID     string `json:"variant_id"`
	LofCurations  []LofCurationData `json:"lof_curations"`
}

// LofCurationData represents individual LoF curation entries
type LofCurationData struct {
	GeneID      string   `json:"gene_id"`
	GeneVersion string   `json:"gene_version"`
	GeneSymbol  string   `json:"gene_symbol"`
	Verdict     string   `json:"verdict"`
	Flags       []string `json:"flags"`
	Project     string   `json:"project"`
}
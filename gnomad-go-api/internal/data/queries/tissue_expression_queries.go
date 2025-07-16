package queries

import (
	"context"
	"fmt"
	"sort"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// GTEx tissue expression functions

// FetchGtexTissueExpression fetches GTEx tissue expression data for a transcript
func FetchGtexTissueExpression(ctx context.Context, esClient *elastic.Client, transcriptID string, referenceGenome string) ([]*model.GtexTissue, error) {
	// Use transcript indices map (defined in transcript_queries.go)
	var transcriptIndices = map[string]string{
		"GRCh37": "transcripts_grch37",
		"GRCh38": "transcripts_grch38",
	}

	index, ok := transcriptIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unsupported reference genome: %s", referenceGenome)
	}

	// Check if this is GRCh37 (GTEx tissue expression is only available for GRCh37)
	if referenceGenome != "GRCh37" {
		return nil, nil // Return nil for non-GRCh37 reference genomes
	}

	// Use SearchByID to get the transcript document
	hit, err := esClient.SearchByID(ctx, index, "transcript_id", transcriptID)
	if err != nil {
		return nil, fmt.Errorf("error fetching transcript %s: %w", transcriptID, err)
	}

	if hit == nil {
		return nil, nil // Transcript not found
	}

	// Extract the source
	source := hit.Source

	// Extract the 'value' field from the source
	value, ok := source["value"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid document structure: missing 'value' field")
	}

	// Get the gtex_tissue_expression field
	tissueExpressionData, ok := value["gtex_tissue_expression"]
	if !ok || tissueExpressionData == nil {
		return nil, nil // No tissue expression data
	}

	// Handle different formats: map[string]interface{} or map[string]float64
	var gtexTissues []*model.GtexTissue

	switch tissueData := tissueExpressionData.(type) {
	case map[string]interface{}:
		// Handle map format (tissue -> value)
		gtexTissues = make([]*model.GtexTissue, 0, len(tissueData))
		for tissue, valueInterface := range tissueData {
			var value float64
			switch v := valueInterface.(type) {
			case float64:
				value = v
			case float32:
				value = float64(v)
			case int:
				value = float64(v)
			case int64:
				value = float64(v)
			default:
				continue // Skip invalid values
			}

			gtexTissues = append(gtexTissues, &model.GtexTissue{
				Tissue: tissue,
				Value:  value,
			})
		}

	case []interface{}:
		// Handle array format with tissue/value objects
		for _, item := range tissueData {
			if itemMap, ok := item.(map[string]interface{}); ok {
				// Handle tissue/value object structure
				tissue, tissueOk := itemMap["tissue"].(string)
				value, valueOk := itemMap["value"].(float64)

				if tissueOk && valueOk {
					gtexTissues = append(gtexTissues, &model.GtexTissue{
						Tissue: tissue,
						Value:  value,
					})
				}
			}
		}

	default:
		return nil, nil // Unsupported format
	}

	// Sort tissues alphabetically for consistent ordering
	sort.Slice(gtexTissues, func(i, j int) bool {
		return gtexTissues[i].Tissue < gtexTissues[j].Tissue
	})

	return gtexTissues, nil
}

// FetchPextData fetches Pext data for a gene
func FetchPextData(ctx context.Context, esClient *elastic.Client, geneID string, referenceGenome string) (*model.Pext, error) {
	// Pext data is stored in the gene document, so fetch the gene first
	gene, err := FetchGeneByID(ctx, esClient, geneID, referenceGenome)
	if err != nil {
		return nil, fmt.Errorf("error fetching gene for pext data: %w", err)
	}

	if gene == nil {
		return nil, nil // Gene not found
	}

	// Return the pext data from the gene
	return gene.Pext, nil
}

// FetchPextRegion fetches Pext region data for a genomic region
func FetchPextRegion(ctx context.Context, esClient *elastic.Client, chrom string, start int, stop int, referenceGenome string) ([]*model.PextRegion, error) {
	// Get the gene index for the reference genome (using global geneIndices from genes.go)
	index, ok := geneIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unsupported reference genome: %s", referenceGenome)
	}

	// Build query to find genes overlapping the region
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []interface{}{
					map[string]interface{}{
						"term": map[string]interface{}{
							"chrom": chrom,
						},
					},
					map[string]interface{}{
						"range": map[string]interface{}{
							"start": map[string]interface{}{
								"lte": stop,
							},
						},
					},
					map[string]interface{}{
						"range": map[string]interface{}{
							"stop": map[string]interface{}{
								"gte": start,
							},
						},
					},
				},
			},
		},
		"_source": []string{"value.pext"},
		"size":    100, // Limit to 100 genes
	}

	// Execute the search
	response, err := esClient.Search(ctx, index, query)
	if err != nil {
		return nil, fmt.Errorf("error searching for genes in region: %w", err)
	}

	var allPextRegions []*model.PextRegion

	// Process each gene result
	for _, hit := range response.Hits.Hits {
		source := hit.Source
		value, ok := source["value"].(map[string]interface{})
		if !ok {
			continue
		}

		pextData, ok := value["pext"]
		if !ok || pextData == nil {
			continue
		}

		// Decode pext data - handle the structure directly
		if pextMap, ok := pextData.(map[string]interface{}); ok {
			// Get regions from pext data
			if regionsData, regionsOk := pextMap["regions"].([]interface{}); regionsOk {
				for _, regionData := range regionsData {
					if regionMap, regionMapOk := regionData.(map[string]interface{}); regionMapOk {
						// Extract region fields
						regionStart, startOk := regionMap["start"].(float64)
						regionStop, stopOk := regionMap["stop"].(float64)
						regionMean, meanOk := regionMap["mean"].(float64)

						if startOk && stopOk && meanOk {
							// Check if this pext region overlaps with the requested region
							if int(regionStart) <= stop && int(regionStop) >= start {
								var tissues []*model.PextRegionTissue

								// Handle tissues array
								if tissuesData, tissuesOk := regionMap["tissues"].([]interface{}); tissuesOk {
									for _, tissueData := range tissuesData {
										if tissueMap, tissueMapOk := tissueData.(map[string]interface{}); tissueMapOk {
											tissueNameInterface, tissueNameOk := tissueMap["tissue"]
											tissueValueInterface, tissueValueOk := tissueMap["value"]

											var tissueName *string
											var tissueValue *float64

											if tissueNameOk && tissueNameInterface != nil {
												if tn, ok := tissueNameInterface.(string); ok {
													tissueName = &tn
												}
											}

											if tissueValueOk && tissueValueInterface != nil {
												if tv, ok := tissueValueInterface.(float64); ok {
													tissueValue = &tv
												}
											}

											tissues = append(tissues, &model.PextRegionTissue{
												Tissue: tissueName,
												Value:  tissueValue,
											})
										}
									}
								}

								allPextRegions = append(allPextRegions, &model.PextRegion{
									Start:   int(regionStart),
									Stop:    int(regionStop),
									Mean:    regionMean,
									Tissues: tissues,
								})
							}
						}
					}
				}
			}
		}
	}

	return allPextRegions, nil
}


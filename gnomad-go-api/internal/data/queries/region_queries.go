package queries

import (
	"context"
	"fmt"
	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// Valid chromosomes for region queries
var validChromosomes = map[string]bool{
	"1": true, "2": true, "3": true, "4": true, "5": true, "6": true,
	"7": true, "8": true, "9": true, "10": true, "11": true, "12": true,
	"13": true, "14": true, "15": true, "16": true, "17": true, "18": true,
	"19": true, "20": true, "21": true, "22": true, "X": true, "Y": true, "M": true,
}


// Chromosome numbers for x position calculation
var chromosomeNumbers = map[string]int{
	"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
	"7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12,
	"13": 13, "14": 14, "15": 15, "16": 16, "17": 17, "18": 18,
	"19": 19, "20": 20, "21": 21, "22": 22, "X": 23, "Y": 24, "M": 25,
}

// ValidateRegion validates region parameters
func ValidateRegion(chrom string, start int, stop int) error {
	if !validChromosomes[chrom] {
		return fmt.Errorf("Invalid chromosome: '%s'", chrom)
	}

	if start < 1 {
		return fmt.Errorf("Region start must be greater than 0")
	}

	if start >= 1e9 {
		return fmt.Errorf("Region start must be less than 1,000,000,000")
	}

	if stop < 1 {
		return fmt.Errorf("Region stop must be greater than 0")
	}

	if stop >= 1e9 {
		return fmt.Errorf("Region stop must be less than 1,000,000,000")
	}

	if start > stop {
		return fmt.Errorf("Region stop must be greater than region start")
	}

	return nil
}

// XPosition calculates the x position for a chromosome and position
func XPosition(chrom string, pos int) int64 {
	chromNum, ok := chromosomeNumbers[chrom]
	if !ok {
		return 0
	}
	return int64(chromNum)*1e9 + int64(pos)
}

// FetchRegion fetches a region and returns a Region model
func FetchRegion(ctx context.Context, esClient *elastic.Client, chrom string, start int, stop int, referenceGenome string) (*model.Region, error) {
	// Validate region parameters
	if err := ValidateRegion(chrom, start, stop); err != nil {
		return nil, err
	}

	// Convert reference genome to enum
	refGenome := model.ReferenceGenomeID(referenceGenome)

	// Create the region object
	region := &model.Region{
		ReferenceGenome: refGenome,
		Chrom:           chrom,
		Start:           start,
		Stop:            stop,
	}

	return region, nil
}

// FetchGenesInRegion fetches genes that overlap with the specified region using x-coordinates
func FetchGenesInRegion(ctx context.Context, esClient *elastic.Client, chrom string, xstart int64, xstop int64, referenceGenome string) ([]*model.RegionGene, error) {
	index, ok := geneIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unknown reference genome: %s", referenceGenome)
	}

	// Build the query to find genes overlapping with the region using xstart and xstop
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{
						"range": map[string]interface{}{
							"xstart": map[string]interface{}{
								"lte": xstop,
							},
						},
					},
					{
						"range": map[string]interface{}{
							"xstop": map[string]interface{}{
								"gte": xstart,
							},
						},
					},
				},
			},
		},
		"_source": map[string]interface{}{
			"includes": []string{"value"},
		},
		"sort": []map[string]interface{}{
			{"xstart": "asc"},
		},
		"size": 1000, // Limit results to avoid too many genes
	}

	// Execute the search
	response, err := esClient.Search(ctx, index, query)
	if err != nil {
		return []*model.RegionGene{}, fmt.Errorf("error searching for genes in region: %w", err)
	}

	// Convert results to RegionGene models
	regionGenes := make([]*model.RegionGene, 0)
	for _, hit := range response.Hits.Hits {
		source := hit.Source
		// Gene documents have data at root level or under "value" depending on index structure
		var dataSource map[string]interface{}
		if value, ok := source["value"].(map[string]interface{}); ok {
			dataSource = value
		} else {
			dataSource = source
		}

		// Extract basic gene information
		geneID, _ := dataSource["gene_id"].(string)
		symbol, _ := dataSource["symbol"].(string)
		geneStart, _ := dataSource["start"].(float64)
		geneStop, _ := dataSource["stop"].(float64)

		// Convert exons
		exons := make([]*model.Exon, 0)
		if exonsData, ok := dataSource["exons"].([]interface{}); ok {
			for _, exonData := range exonsData {
				if exonMap, ok := exonData.(map[string]interface{}); ok {
					featureType, _ := exonMap["feature_type"].(string)
					exonStart, _ := exonMap["start"].(float64)
					exonStop, _ := exonMap["stop"].(float64)

					exons = append(exons, &model.Exon{
						FeatureType: featureType,
						Start:       int(exonStart),
						Stop:        int(exonStop),
					})
				}
			}
		}

		// Convert transcripts
		transcripts := make([]*model.RegionGeneTranscript, 0)
		if transcriptsData, ok := dataSource["transcripts"].([]interface{}); ok {
			for _, transcriptData := range transcriptsData {
				if transcriptMap, ok := transcriptData.(map[string]interface{}); ok {
					transcriptID, _ := transcriptMap["transcript_id"].(string)
					transcriptStart, _ := transcriptMap["start"].(float64)
					transcriptStop, _ := transcriptMap["stop"].(float64)

					// Convert transcript exons
					transcriptExons := make([]*model.Exon, 0)
					if transcriptExonsData, ok := transcriptMap["exons"].([]interface{}); ok {
						for _, exonData := range transcriptExonsData {
							if exonMap, ok := exonData.(map[string]interface{}); ok {
								featureType, _ := exonMap["feature_type"].(string)
								exonStart, _ := exonMap["start"].(float64)
								exonStop, _ := exonMap["stop"].(float64)

								transcriptExons = append(transcriptExons, &model.Exon{
									FeatureType: featureType,
									Start:       int(exonStart),
									Stop:        int(exonStop),
								})
							}
						}
					}

					transcripts = append(transcripts, &model.RegionGeneTranscript{
						TranscriptID: transcriptID,
						Start:        int(transcriptStart),
						Stop:         int(transcriptStop),
						Exons:        transcriptExons,
					})
				}
			}
		}

		regionGenes = append(regionGenes, &model.RegionGene{
			GeneID:      geneID,
			Symbol:      symbol,
			Start:       int(geneStart),
			Stop:        int(geneStop),
			Exons:       exons,
			Transcripts: transcripts,
		})
	}

	return regionGenes, nil
}

// NOTE: FetchVariantsInRegion has been removed and replaced by dataset-specific
// FetchVariantsByRegion methods in the VariantFetcher implementations.
// This ensures proper handling of dataset-specific query requirements.

// NOTE: convertDocumentToVariant has been removed as it's replaced by 
// dataset-specific variant shaping methods in the VariantFetcher implementations.

// NOTE: extractExomeData, extractGenomeData, extractJointData, getSubsetForDataset, 
// and getVariantIndexForDataset functions have been removed as they're replaced by 
// dataset-specific methods in the VariantFetcher implementations.

// NOTE: FetchVariantsByGene has been removed as it's replaced by dataset-specific
// FetchVariantsByGene methods in the VariantFetcher implementations.


package queries

import (
	"context"
	"fmt"
	"math"

	"github.com/mitchellh/mapstructure"
	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// Coverage indices mapping based on the TypeScript implementation
var coverageIndices = map[string]map[string]string{
	"gnomad_r4": {
		"exome":  "gnomad_v4_exome_coverage",
		"genome": "gnomad_v3_genome_coverage",
	},
	"gnomad_r2_1": {
		"exome":  "gnomad_v2_exome_coverage",
		"genome": "gnomad_v2_genome_coverage",
	},
	"exac": {
		"exome":  "exac_exome_coverage",
		"genome": "", // ExAC doesn't have genome coverage
	},
}

// CoverageDocument represents the Elasticsearch document structure for coverage
type CoverageDocument struct {
	Locus struct {
		Contig   string `json:"contig"`
		Position int    `json:"position"`
	} `json:"locus"`
	Mean   *float64 `json:"mean"`
	Median *float64 `json:"median"`
	Over1  *float64 `json:"over_1"`
	Over5  *float64 `json:"over_5"`
	Over10 *float64 `json:"over_10"`
	Over15 *float64 `json:"over_15"`
	Over20 *float64 `json:"over_20"`
	Over25 *float64 `json:"over_25"`
	Over30 *float64 `json:"over_30"`
	Over50 *float64 `json:"over_50"`
	Over100 *float64 `json:"over_100"`
}

// CoverageRegion represents a genomic region for coverage queries
type CoverageRegion struct {
	Start int `json:"start"`
	Stop  int `json:"stop"`
}

// FetchFeatureCoverage fetches coverage data for a specific feature (gene/transcript)
func FetchFeatureCoverage(ctx context.Context, esClient *elastic.Client, featureID string, datasetID string, regions []CoverageRegion, chrom string) (*model.FeatureCoverage, error) {
	datasetIndices, ok := coverageIndices[datasetID]
	if !ok {
		return nil, fmt.Errorf("unknown dataset: %s", datasetID)
	}

	var exomeCoverage []*model.CoverageBin
	var genomeCoverage []*model.CoverageBin
	var err error

	// Fetch exome coverage if index exists
	if exomeIndex := datasetIndices["exome"]; exomeIndex != "" {
		exomeCoverage, err = fetchCoverageForRegions(ctx, esClient, exomeIndex, chrom, regions)
		if err != nil {
			return nil, fmt.Errorf("error fetching exome coverage: %w", err)
		}
	}

	// Fetch genome coverage if index exists
	if genomeIndex := datasetIndices["genome"]; genomeIndex != "" {
		genomeCoverage, err = fetchCoverageForRegions(ctx, esClient, genomeIndex, chrom, regions)
		if err != nil {
			return nil, fmt.Errorf("error fetching genome coverage: %w", err)
		}
	}

	return &model.FeatureCoverage{
		Exome:  exomeCoverage,
		Genome: genomeCoverage,
	}, nil
}

// FetchRegionCoverage fetches coverage data for a genomic region
func FetchRegionCoverage(ctx context.Context, esClient *elastic.Client, chrom string, start, stop int, datasetID string) (*model.RegionCoverage, error) {
	datasetIndices, ok := coverageIndices[datasetID]
	if !ok {
		return nil, fmt.Errorf("unknown dataset: %s", datasetID)
	}

	regions := []CoverageRegion{{Start: start, Stop: stop}}

	var exomeCoverage []*model.CoverageBin
	var genomeCoverage []*model.CoverageBin
	var err error

	// Fetch exome coverage if index exists
	if exomeIndex := datasetIndices["exome"]; exomeIndex != "" {
		exomeCoverage, err = fetchCoverageForRegions(ctx, esClient, exomeIndex, chrom, regions)
		if err != nil {
			return nil, fmt.Errorf("error fetching exome coverage: %w", err)
		}
	}

	// Fetch genome coverage if index exists
	if genomeIndex := datasetIndices["genome"]; genomeIndex != "" {
		genomeCoverage, err = fetchCoverageForRegions(ctx, esClient, genomeIndex, chrom, regions)
		if err != nil {
			return nil, fmt.Errorf("error fetching genome coverage: %w", err)
		}
	}

	return &model.RegionCoverage{
		Exome:  exomeCoverage,
		Genome: genomeCoverage,
	}, nil
}

// fetchCoverageForRegions fetches coverage data for multiple genomic regions
func fetchCoverageForRegions(ctx context.Context, esClient *elastic.Client, indexName string, chrom string, regions []CoverageRegion) ([]*model.CoverageBin, error) {
	if len(regions) == 0 {
		return []*model.CoverageBin{}, nil
	}

	// Calculate bucket size based on total region size
	totalSize := 0
	for _, region := range regions {
		totalSize += region.Stop - region.Start + 1
	}
	
	// For now, without aggregation support, return empty coverage
	// TODO: Implement aggregation support in the elastic client
	return []*model.CoverageBin{}, fmt.Errorf("coverage aggregation not yet implemented - requires aggregation support in elastic client")
}

// calculateBucketSize determines the appropriate bucket size for aggregation
func calculateBucketSize(totalSize int) int {
	if totalSize <= 100000 {
		return 1 // 1bp resolution for small regions
	} else if totalSize <= 1000000 {
		return 10 // 10bp buckets for medium regions
	}
	return 100 // 100bp buckets for large regions
}

// buildCoverageQuery constructs the Elasticsearch query for coverage data
func buildCoverageQuery(chrom string, regions []CoverageRegion, bucketSize int) map[string]interface{} {
	// Build range queries for each region
	shouldClauses := make([]map[string]interface{}, len(regions))
	for i, region := range regions {
		shouldClauses[i] = map[string]interface{}{
			"range": map[string]interface{}{
				"locus.position": map[string]interface{}{
					"gte": region.Start,
					"lte": region.Stop,
				},
			},
		}
	}

	return map[string]interface{}{
		"size": 0, // We only want aggregations, not individual documents
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{
						"term": map[string]interface{}{
							"locus.contig": chrom,
						},
					},
					{
						"bool": map[string]interface{}{
							"should": shouldClauses,
						},
					},
				},
			},
		},
		"aggs": map[string]interface{}{
			"coverage": map[string]interface{}{
				"histogram": map[string]interface{}{
					"field":    "locus.position",
					"interval": bucketSize,
				},
				"aggs": map[string]interface{}{
					"mean": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "mean",
						},
					},
					"median": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "median",
						},
					},
					"over_1": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "over_1",
						},
					},
					"over_5": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "over_5",
						},
					},
					"over_10": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "over_10",
						},
					},
					"over_15": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "over_15",
						},
					},
					"over_20": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "over_20",
						},
					},
					"over_25": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "over_25",
						},
					},
					"over_30": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "over_30",
						},
					},
					"over_50": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "over_50",
						},
					},
					"over_100": map[string]interface{}{
						"avg": map[string]interface{}{
							"field": "over_100",
						},
					},
				},
			},
		},
	}
}

// parseCoverageAggregation parses the Elasticsearch aggregation response
// TODO: Implement this once aggregation support is added to the elastic client
func parseCoverageAggregation(response *elastic.SearchResponse, bucketSize int) ([]*model.CoverageBin, error) {
	// Placeholder for aggregation parsing
	return []*model.CoverageBin{}, fmt.Errorf("aggregation parsing not implemented")
}

// extractFloatValue extracts a float value from an aggregation bucket
func extractFloatValue(bucket map[string]interface{}, field string) *float64 {
	aggInterface, ok := bucket[field].(map[string]interface{})
	if !ok {
		return nil
	}

	valueInterface, ok := aggInterface["value"]
	if !ok {
		return nil
	}

	// Handle both float64 and nil values
	switch v := valueInterface.(type) {
	case float64:
		if math.IsNaN(v) {
			return nil
		}
		return &v
	case nil:
		return nil
	default:
		return nil
	}
}

// FetchMitochondrialCoverage fetches mitochondrial coverage data
func FetchMitochondrialCoverage(ctx context.Context, esClient *elastic.Client, chrom string, start, stop int, datasetID string) ([]*model.MitochondrialCoverageBin, error) {
	// Mitochondrial coverage uses different indices and structure
	var indexName string
	switch datasetID {
	case "gnomad_r4":
		indexName = "gnomad_v4_mitochondrial_coverage"
	case "gnomad_r2_1":
		indexName = "gnomad_v2_mitochondrial_coverage"
	default:
		return nil, fmt.Errorf("mitochondrial coverage not available for dataset: %s", datasetID)
	}

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
		"sort": []map[string]interface{}{
			{
				"locus.position": map[string]interface{}{
					"order": "asc",
				},
			},
		},
		"size": 10000, // Adjust based on expected data size
	}

	response, err := esClient.Search(ctx, indexName, query)
	if err != nil {
		return nil, fmt.Errorf("error executing mitochondrial coverage search: %w", err)
	}

	return parseMitochondrialCoverageHits(response)
}

// parseMitochondrialCoverageHits parses individual hits from mitochondrial coverage search
func parseMitochondrialCoverageHits(response *elastic.SearchResponse) ([]*model.MitochondrialCoverageBin, error) {
	if len(response.Hits.Hits) == 0 {
		return []*model.MitochondrialCoverageBin{}, nil
	}

	hitsArray := response.Hits.Hits

	var coverageBins []*model.MitochondrialCoverageBin
	for _, hit := range hitsArray {
		source := hit.Source

		var doc CoverageDocument
		// Convert the source to our document structure
		if err := mapToStruct(source, &doc); err != nil {
			continue
		}

		if doc.Mean != nil {
			bin := &model.MitochondrialCoverageBin{
				Pos:  doc.Locus.Position,
				Mean: *doc.Mean,
			}
			coverageBins = append(coverageBins, bin)
		}
	}

	return coverageBins, nil
}

// mapToStruct is a helper function to convert map to struct using mapstructure
func mapToStruct(data map[string]interface{}, result interface{}) error {
	return mapstructure.Decode(data, result)
}
package queries

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"

	"github.com/mitchellh/mapstructure"
)

// roundFloat64Ptr rounds a float64 pointer to 5 decimal places
func roundFloat64Ptr(value *float64) *float64 {
	if value == nil {
		return nil
	}
	rounded := math.Round(*value*100000) / 100000
	return &rounded
}

// Coverage indices mapping based on the TypeScript implementation
var coverageIndices = map[string]map[string]string{
	"gnomad_r4": {
		"exome":  "gnomad_v4_exome_coverage",
		"genome": "gnomad_v3_genome_coverage",
	},
	"gnomad_r3": {
		"exome":  "", // gnomAD v3 has no exome coverage
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
	Mean    *float64 `json:"mean"`
	Median  *float64 `json:"median"`
	Over1   *float64 `json:"over_1"`
	Over5   *float64 `json:"over_5"`
	Over10  *float64 `json:"over_10"`
	Over15  *float64 `json:"over_15"`
	Over20  *float64 `json:"over_20"`
	Over25  *float64 `json:"over_25"`
	Over30  *float64 `json:"over_30"`
	Over50  *float64 `json:"over_50"`
	Over100 *float64 `json:"over_100"`
}

// CoverageRegion represents a genomic region for coverage queries
type CoverageRegion struct {
	Start int `json:"start"`
	Stop  int `json:"stop"`
}

// isGRCh38 returns true if the dataset uses GRCh38 reference genome
func isGRCh38(datasetID string) bool {
	return datasetID == "gnomad_r4" || datasetID == "gnomad_r3"
}

// extendRegions adds padding to regions (equivalent to TypeScript extendRegions function)
func extendRegions(amount int, regions []CoverageRegion) []CoverageRegion {
	paddedRegions := make([]CoverageRegion, len(regions))
	for i, region := range regions {
		paddedRegions[i] = CoverageRegion{
			Start: region.Start - amount,
			Stop:  region.Stop + amount,
		}
	}
	return paddedRegions
}

// mergeOverlappingRegions merges overlapping regions (equivalent to TypeScript mergeOverlappingRegions function)
func mergeOverlappingRegions(sortedRegions []CoverageRegion) []CoverageRegion {
	if len(sortedRegions) == 0 {
		return []CoverageRegion{}
	}

	mergedRegions := []CoverageRegion{sortedRegions[0]}
	previousRegion := &mergedRegions[0]

	for i := 1; i < len(sortedRegions); i++ {
		nextRegion := sortedRegions[i]

		if nextRegion.Start <= previousRegion.Stop+1 {
			if nextRegion.Stop > previousRegion.Stop {
				previousRegion.Stop = nextRegion.Stop
			}
		} else {
			mergedRegions = append(mergedRegions, nextRegion)
			previousRegion = &mergedRegions[len(mergedRegions)-1]
		}
	}

	return mergedRegions
}

// totalRegionSize calculates the total size of all regions (equivalent to TypeScript totalRegionSize function)
func totalRegionSize(regions []CoverageRegion) int {
	total := 0
	for _, region := range regions {
		total += region.Stop - region.Start
	}
	return total
}

// FetchFeatureCoverage fetches coverage data for a specific feature (gene/transcript)
func FetchFeatureCoverage(ctx context.Context, esClient *elastic.Client, featureID string, datasetID string, regions []CoverageRegion, chrom string) (*model.FeatureCoverage, error) {
	datasetIndices, ok := coverageIndices[datasetID]
	if !ok {
		return nil, fmt.Errorf("unknown dataset: %s", datasetID)
	}

	// Add padding to regions (like TypeScript extendRegions function)
	paddedRegions := extendRegions(75, regions)
	
	// Sort regions by start position
	sort.Slice(paddedRegions, func(i, j int) bool {
		return paddedRegions[i].Start < paddedRegions[j].Start
	})
	
	// Merge overlapping regions
	mergedRegions := mergeOverlappingRegions(paddedRegions)
	
	// Calculate bucket size based on total merged region size (like TypeScript)
	totalSize := totalRegionSize(mergedRegions)
	bucketSize := int(math.Max(math.Floor(float64(totalSize)/500), 1))

	var exomeCoverage []*model.CoverageBin
	var genomeCoverage []*model.CoverageBin
	var err error

	// Fetch exome coverage if index exists
	if exomeIndex := datasetIndices["exome"]; exomeIndex != "" {
		exomeCoverage, err = fetchCoverageForRegionsWithBucketSize(ctx, esClient, exomeIndex, chrom, mergedRegions, isGRCh38(datasetID), bucketSize)
		if err != nil {
			return nil, fmt.Errorf("error fetching exome coverage: %w", err)
		}
	}

	// Fetch genome coverage if index exists
	if genomeIndex := datasetIndices["genome"]; genomeIndex != "" {
		genomeCoverage, err = fetchCoverageForRegionsWithBucketSize(ctx, esClient, genomeIndex, chrom, mergedRegions, isGRCh38(datasetID), bucketSize)
		if err != nil {
			return nil, fmt.Errorf("error fetching genome coverage: %w", err)
		}
	}

	// Ensure arrays are not nil (GraphQL expects non-nil arrays)
	if exomeCoverage == nil {
		exomeCoverage = []*model.CoverageBin{}
	}
	if genomeCoverage == nil {
		genomeCoverage = []*model.CoverageBin{}
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

	// For region queries, we add padding to match browser behavior
	regions := []CoverageRegion{{Start: start - 75, Stop: stop + 75}}

	var exomeCoverage []*model.CoverageBin
	var genomeCoverage []*model.CoverageBin
	var err error

	// Fetch exome coverage if index exists
	if exomeIndex := datasetIndices["exome"]; exomeIndex != "" {
		exomeCoverage, err = fetchCoverageForRegions(ctx, esClient, exomeIndex, chrom, regions, isGRCh38(datasetID))
		if err != nil {
			return nil, fmt.Errorf("error fetching exome coverage: %w", err)
		}
	}

	// Fetch genome coverage if index exists
	if genomeIndex := datasetIndices["genome"]; genomeIndex != "" {
		genomeCoverage, err = fetchCoverageForRegions(ctx, esClient, genomeIndex, chrom, regions, isGRCh38(datasetID))
		if err != nil {
			return nil, fmt.Errorf("error fetching genome coverage: %w", err)
		}
	}

	// Ensure arrays are not nil (GraphQL expects non-nil arrays)
	if exomeCoverage == nil {
		exomeCoverage = []*model.CoverageBin{}
	}
	if genomeCoverage == nil {
		genomeCoverage = []*model.CoverageBin{}
	}

	return &model.RegionCoverage{
		Exome:  exomeCoverage,
		Genome: genomeCoverage,
	}, nil
}

// FetchVariantCoverage fetches coverage data for a specific variant position
// This version is kept for backward compatibility and uses gnomad_r4 as default
func FetchVariantCoverage(ctx context.Context, esClient *elastic.Client, chrom string, pos int) (*model.VariantCoverageDetails, error) {
	return FetchVariantCoverageForDataset(ctx, esClient, chrom, pos, "gnomad_r4")
}

// FetchVariantCoverageForDataset fetches coverage data for a specific variant position and dataset
func FetchVariantCoverageForDataset(ctx context.Context, esClient *elastic.Client, chrom string, pos int, dataset string) (*model.VariantCoverageDetails, error) {
	datasetIndices, ok := coverageIndices[dataset]
	if !ok {
		return nil, fmt.Errorf("unknown dataset: %s", dataset)
	}

	// Create region for single position
	regions := []CoverageRegion{{Start: pos, Stop: pos}}

	var exomeCoverage *model.VariantCoverage
	var genomeCoverage *model.VariantCoverage

	// For variant coverage, we need to use chr prefix for v4
	chromName := chrom
	if isGRCh38(dataset) && !strings.HasPrefix(chrom, "chr") {
		chromName = "chr" + chrom
	}

	// Fetch exome coverage if index exists
	if exomeIndex := datasetIndices["exome"]; exomeIndex != "" {
		// Pass isGRCh38 based on dataset
		exomeBins, err := fetchCoverageForRegions(ctx, esClient, exomeIndex, chromName, regions, isGRCh38(dataset))
		if err != nil {
			return nil, fmt.Errorf("error fetching exome coverage: %w", err)
		}
		if len(exomeBins) > 0 {
			bin := exomeBins[0]
			exomeCoverage = &model.VariantCoverage{
				Mean:    bin.Mean,
				Median:  bin.Median,
				Over1:   bin.Over1,
				Over5:   bin.Over5,
				Over10:  bin.Over10,
				Over15:  bin.Over15,
				Over20:  bin.Over20,
				Over25:  bin.Over25,
				Over30:  bin.Over30,
				Over50:  bin.Over50,
				Over100: bin.Over100,
			}
		}
	}

	// Fetch genome coverage if index exists
	if genomeIndex := datasetIndices["genome"]; genomeIndex != "" {
		// Pass isGRCh38 based on dataset
		genomeBins, err := fetchCoverageForRegions(ctx, esClient, genomeIndex, chromName, regions, isGRCh38(dataset))
		if err != nil {
			return nil, fmt.Errorf("error fetching genome coverage: %w", err)
		}
		if len(genomeBins) > 0 {
			bin := genomeBins[0]
			genomeCoverage = &model.VariantCoverage{
				Mean:    bin.Mean,
				Median:  bin.Median,
				Over1:   bin.Over1,
				Over5:   bin.Over5,
				Over10:  bin.Over10,
				Over15:  bin.Over15,
				Over20:  bin.Over20,
				Over25:  bin.Over25,
				Over30:  bin.Over30,
				Over50:  bin.Over50,
				Over100: bin.Over100,
			}
		}
	}

	// Ensure we always return valid coverage objects
	if exomeCoverage == nil {
		exomeCoverage = &model.VariantCoverage{}
	}
	if genomeCoverage == nil {
		genomeCoverage = &model.VariantCoverage{}
	}

	return &model.VariantCoverageDetails{
		Exome:  exomeCoverage,
		Genome: genomeCoverage,
	}, nil
}

// fetchCoverageForRegionsWithBucketSize fetches coverage data for multiple genomic regions with specified bucket size
func fetchCoverageForRegionsWithBucketSize(ctx context.Context, esClient *elastic.Client, indexName string, chrom string, regions []CoverageRegion, isGRCh38Dataset bool, bucketSize int) ([]*model.CoverageBin, error) {
	if len(regions) == 0 {
		return []*model.CoverageBin{}, nil
	}

	// For GRCh38, use chr prefix
	chromName := chrom
	if isGRCh38Dataset && !strings.HasPrefix(chrom, "chr") {
		chromName = "chr" + chrom
	}

	// Build and execute query
	query := buildCoverageQuery(chromName, regions, bucketSize)
	response, err := esClient.Search(ctx, indexName, query)
	if err != nil {
		return nil, fmt.Errorf("error executing coverage search: %w", err)
	}

	// Parse aggregation results
	return parseCoverageAggregation(response, bucketSize)
}

// fetchCoverageForRegions fetches coverage data for multiple genomic regions
func fetchCoverageForRegions(ctx context.Context, esClient *elastic.Client, indexName string, chrom string, regions []CoverageRegion, isGRCh38Dataset bool) ([]*model.CoverageBin, error) {
	if len(regions) == 0 {
		return []*model.CoverageBin{}, nil
	}

	// Calculate bucket size based on total region size
	totalSize := 0
	for _, region := range regions {
		totalSize += region.Stop - region.Start + 1
	}

	// Match TS implementation for bucket size
	bucketSize := int(math.Max(math.Floor(float64(totalSize)/500), 1))

	// For GRCh38, use chr prefix
	chromName := chrom
	if isGRCh38Dataset && !strings.HasPrefix(chrom, "chr") {
		chromName = "chr" + chrom
	}

	// Build and execute query
	query := buildCoverageQuery(chromName, regions, bucketSize)
	response, err := esClient.Search(ctx, indexName, query)
	if err != nil {
		return nil, fmt.Errorf("error executing coverage search: %w", err)
	}

	// Parse aggregation results
	return parseCoverageAggregation(response, bucketSize)
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
func parseCoverageAggregation(response *elastic.SearchResponse, bucketSize int) ([]*model.CoverageBin, error) {
	if response.Aggregations == nil {
		return []*model.CoverageBin{}, nil
	}

	// Get the coverage aggregation
	coverageAgg, ok := response.Aggregations["coverage"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("coverage aggregation not found in response")
	}

	// Get the buckets
	bucketsInterface, ok := coverageAgg["buckets"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("buckets not found in coverage aggregation")
	}

	// Parse buckets into CoverageBin structs
	var coverageBins []*model.CoverageBin
	for _, bucketInterface := range bucketsInterface {
		bucket, ok := bucketInterface.(map[string]interface{})
		if !ok {
			continue
		}

		// Get the key (position)
		keyInterface, ok := bucket["key"]
		if !ok {
			continue
		}

		var pos int
		switch key := keyInterface.(type) {
		case float64:
			pos = int(key)
		case int:
			pos = key
		default:
			continue
		}

		// Create coverage bin with ceil operation for over_X values to match TypeScript
		bin := &model.CoverageBin{
			Pos:     pos,
			Mean:    extractFloatValue(bucket, "mean"),
			Median:  extractFloatValue(bucket, "median"),
			Over1:   extractFloatValueWithCeil(bucket, "over_1"),
			Over5:   extractFloatValueWithCeil(bucket, "over_5"),
			Over10:  extractFloatValueWithCeil(bucket, "over_10"),
			Over15:  extractFloatValueWithCeil(bucket, "over_15"),
			Over20:  extractFloatValueWithCeil(bucket, "over_20"),
			Over25:  extractFloatValueWithCeil(bucket, "over_25"),
			Over30:  extractFloatValueWithCeil(bucket, "over_30"),
			Over50:  extractFloatValueWithCeil(bucket, "over_50"),
			Over100: extractFloatValueWithCeil(bucket, "over_100"),
		}

		coverageBins = append(coverageBins, bin)
	}

	return coverageBins, nil
}

// extractFloatValue extracts a float value from an aggregation bucket
func extractFloatValue(bucket map[string]interface{}, field string) *float64 {
	aggInterface, ok := bucket[field].(map[string]interface{})
	if !ok {
		// Return 0 instead of nil to match TypeScript behavior
		zero := 0.0
		return &zero
	}

	valueInterface, ok := aggInterface["value"]
	if !ok {
		// Return 0 instead of nil to match TypeScript behavior
		zero := 0.0
		return &zero
	}

	// Handle both float64 and nil values
	switch v := valueInterface.(type) {
	case float64:
		if math.IsNaN(v) {
			// Return 0 instead of nil to match TypeScript behavior
			zero := 0.0
			return &zero
		}
		return &v
	case nil:
		// Return 0 instead of nil to match TypeScript behavior
		zero := 0.0
		return &zero
	default:
		// Return 0 instead of nil to match TypeScript behavior
		zero := 0.0
		return &zero
	}
}

// extractFloatValueWithCeil extracts and rounds a float value using ceiling operation to match TypeScript behavior
func extractFloatValueWithCeil(bucket map[string]interface{}, field string) *float64 {
	value := extractFloatValue(bucket, field)
	if value == nil {
		// This should never happen now, but keep for safety
		zero := 0.0
		return &zero
	}
	// Apply Math.ceil() equivalent: round up to 2 decimal places (multiply by 100, ceil, divide by 100)
	rounded := math.Ceil(*value * 100) / 100
	return &rounded
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
				Pos:  float64(doc.Locus.Position),
				Mean: doc.Mean,
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


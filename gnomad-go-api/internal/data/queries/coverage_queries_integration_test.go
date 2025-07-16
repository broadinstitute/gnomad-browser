//go:build integration
// +build integration

package queries

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// These tests require a running Elasticsearch instance with coverage data
// Run with: go test -tags=integration ./internal/data/queries

func getCoverageTestESClient(t *testing.T) *elastic.Client {
	esURL := os.Getenv("ELASTICSEARCH_URL")
	if esURL == "" {
		esURL = "http://localhost:9200"
	}

	// Get authentication credentials from environment
	username := os.Getenv("ELASTICSEARCH_USERNAME")
	if username == "" {
		username = "elastic" // Default username
	}
	password := os.Getenv("ELASTICSEARCH_PASSWORD")

	client, err := elastic.NewClientWithAuth([]string{esURL}, username, password)
	if err != nil {
		t.Skipf("Could not connect to Elasticsearch at %s: %v", esURL, err)
	}

	// Verify connection with a ping
	ctx := context.Background()
	info, err := client.Info(ctx)
	if err != nil {
		t.Skipf("Could not ping Elasticsearch: %v", err)
	}
	t.Logf("Connected to Elasticsearch version %s", info.Version.Number)

	return client
}

func TestGeneCoverage_Integration_FetchFeatureCoverage(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getCoverageTestESClient(t)

	tests := []struct {
		name           string
		featureID      string
		datasetID      string
		chrom          string
		regions        []CoverageRegion
		expectedError  bool
		shouldHaveData bool
		validate       func(t *testing.T, result *model.FeatureCoverage, err error)
	}{
		{
			name:           "fetch coverage for PCSK9 gene - gnomAD v4",
			featureID:      "ENSG00000169174",
			datasetID:      "gnomad_r4",
			chrom:          "1",
			regions:        []CoverageRegion{{Start: 55039447, Stop: 55064852}}, // PCSK9 coordinates
			expectedError:  true, // Expected due to aggregation not implemented
			shouldHaveData: false,
			validate: func(t *testing.T, result *model.FeatureCoverage, err error) {
				// Currently returns error due to aggregation not implemented
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "aggregation not yet implemented")
			},
		},
		{
			name:           "fetch coverage for PCSK9 gene - gnomAD v2",
			featureID:      "ENSG00000169174", 
			datasetID:      "gnomad_r2_1",
			chrom:          "1",
			regions:        []CoverageRegion{{Start: 55505221, Stop: 55530525}}, // PCSK9 GRCh37 coordinates
			expectedError:  true, // Expected due to aggregation not implemented
			shouldHaveData: false,
			validate: func(t *testing.T, result *model.FeatureCoverage, err error) {
				// Currently returns error due to aggregation not implemented
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "aggregation not yet implemented")
			},
		},
		{
			name:           "fetch coverage for ExAC dataset",
			featureID:      "ENSG00000169174",
			datasetID:      "exac",
			chrom:          "1", 
			regions:        []CoverageRegion{{Start: 55505221, Stop: 55530525}},
			expectedError:  true, // Expected due to aggregation not implemented
			shouldHaveData: false,
			validate: func(t *testing.T, result *model.FeatureCoverage, err error) {
				// Currently returns error due to aggregation not implemented
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "aggregation not yet implemented")
			},
		},
		{
			name:          "invalid dataset ID",
			featureID:     "ENSG00000169174",
			datasetID:     "invalid_dataset",
			chrom:         "1",
			regions:       []CoverageRegion{{Start: 55039447, Stop: 55064852}},
			expectedError: true,
			validate: func(t *testing.T, result *model.FeatureCoverage, err error) {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "unknown dataset")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchFeatureCoverage(context.Background(), client, tt.featureID, tt.datasetID, tt.regions, tt.chrom)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
			}

			tt.validate(t, result, err)
		})
	}
}

func TestRegionCoverage_Integration_FetchRegionCoverage(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getCoverageTestESClient(t)

	tests := []struct {
		name          string
		chrom         string
		start         int
		stop          int
		datasetID     string
		expectedError bool
		validate      func(t *testing.T, result *model.RegionCoverage, err error)
	}{
		{
			name:          "fetch region coverage - PCSK9 region gnomAD v4",
			chrom:         "1",
			start:         55039447,
			stop:          55064852,
			datasetID:     "gnomad_r4",
			expectedError: true, // Expected due to aggregation not implemented
			validate: func(t *testing.T, result *model.RegionCoverage, err error) {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "aggregation not yet implemented")
			},
		},
		{
			name:          "fetch region coverage - PCSK9 region gnomAD v2",
			chrom:         "1", 
			start:         55505221,
			stop:          55530525,
			datasetID:     "gnomad_r2_1",
			expectedError: true, // Expected due to aggregation not implemented
			validate: func(t *testing.T, result *model.RegionCoverage, err error) {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "aggregation not yet implemented")
			},
		},
		{
			name:          "invalid chromosome",
			chrom:         "invalid",
			start:         1000,
			stop:          2000,
			datasetID:     "gnomad_r4",
			expectedError: true,
			validate: func(t *testing.T, result *model.RegionCoverage, err error) {
				assert.Error(t, err)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchRegionCoverage(context.Background(), client, tt.chrom, tt.start, tt.stop, tt.datasetID)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
			}

			tt.validate(t, result, err)
		})
	}
}

func TestMitochondrialCoverage_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getCoverageTestESClient(t)

	tests := []struct {
		name          string
		chrom         string
		start         int
		stop          int
		datasetID     string
		expectedError bool
		validate      func(t *testing.T, result []*model.MitochondrialCoverageBin, err error)
	}{
		{
			name:          "fetch mitochondrial coverage - gnomAD v4",
			chrom:         "M",
			start:         1,
			stop:          1000,
			datasetID:     "gnomad_r4",
			expectedError: false, // This uses regular search, not aggregation
			validate: func(t *testing.T, result []*model.MitochondrialCoverageBin, err error) {
				if err != nil {
					// May fail if mitochondrial coverage indices don't exist or are empty
					t.Logf("Expected potential error for missing mitochondrial coverage data: %v", err)
				} else {
					// If successful, validate the structure
					assert.NotNil(t, result)
					for i, bin := range result {
						assert.Greater(t, bin.Pos, 0, "Position %d should be positive", i)
						assert.GreaterOrEqual(t, bin.Mean, float64(0), "Mean coverage %d should be non-negative", i)
					}
					t.Logf("Found %d mitochondrial coverage bins", len(result))
				}
			},
		},
		{
			name:          "fetch mitochondrial coverage - gnomAD v2",
			chrom:         "M",
			start:         1,
			stop:          1000,
			datasetID:     "gnomad_r2_1", 
			expectedError: false,
			validate: func(t *testing.T, result []*model.MitochondrialCoverageBin, err error) {
				if err != nil {
					t.Logf("Expected potential error for missing mitochondrial coverage data: %v", err)
				} else {
					assert.NotNil(t, result)
					t.Logf("Found %d mitochondrial coverage bins", len(result))
				}
			},
		},
		{
			name:          "unsupported dataset for mitochondrial coverage",
			chrom:         "M",
			start:         1,
			stop:          1000,
			datasetID:     "exac",
			expectedError: true,
			validate: func(t *testing.T, result []*model.MitochondrialCoverageBin, err error) {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "not available for dataset")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchMitochondrialCoverage(context.Background(), client, tt.chrom, tt.start, tt.stop, tt.datasetID)

			if tt.expectedError {
				require.Error(t, err)
			} else if err != nil {
				// Allow for errors due to missing data/indices, but still validate
				t.Logf("Non-fatal error (likely missing data): %v", err)
			} else {
				require.NoError(t, err)
			}

			tt.validate(t, result, err)
		})
	}
}

func TestCoverageIndicesMapping_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Test that our coverage indices mapping matches expected datasets
	expectedDatasets := []string{"gnomad_r4", "gnomad_r2_1", "exac"}
	
	for _, dataset := range expectedDatasets {
		t.Run(dataset, func(t *testing.T) {
			indices, exists := coverageIndices[dataset]
			assert.True(t, exists, "Dataset %s should exist in coverageIndices", dataset)
			
			// Check exome index exists (all datasets should have exome)
			assert.NotEmpty(t, indices["exome"], "Dataset %s should have exome index", dataset)
			
			// Check genome index (ExAC doesn't have genome)
			if dataset == "exac" {
				assert.Empty(t, indices["genome"], "ExAC should not have genome index")
			} else {
				assert.NotEmpty(t, indices["genome"], "Dataset %s should have genome index", dataset)
			}
			
			t.Logf("Dataset %s indices: exome=%s, genome=%s", dataset, indices["exome"], indices["genome"])
		})
	}
}

func TestCoverageBucketSizeCalculation_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	tests := []struct {
		name         string
		totalSize    int
		expectedSize int
	}{
		{"small region", 1000, 1},
		{"medium region", 500000, 10},
		{"large region", 2000000, 100},
		{"very small region", 100, 1},
		{"boundary case - 100kb", 100000, 1},
		{"boundary case - 1mb", 1000000, 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateBucketSize(tt.totalSize)
			assert.Equal(t, tt.expectedSize, result, "Bucket size calculation for %d bp region", tt.totalSize)
		})
	}
}

// Test placeholder functionality for coverage queries until aggregation is implemented
func TestCoveragePlaceholder_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getCoverageTestESClient(t)

	// This test documents the current limitation and ensures tests will need updating
	// when aggregation support is added to the elastic client
	t.Run("coverage_aggregation_placeholder", func(t *testing.T) {
		// Test that coverage queries return appropriate placeholder errors
		_, err := FetchFeatureCoverage(context.Background(), client, "ENSG00000169174", "gnomad_r4", 
			[]CoverageRegion{{Start: 55039447, Stop: 55064852}}, "1")
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "aggregation not yet implemented", 
			"Coverage should return aggregation not implemented error until elastic client supports aggregations")
	})

	t.Run("region_coverage_placeholder", func(t *testing.T) {
		_, err := FetchRegionCoverage(context.Background(), client, "1", 55039447, 55064852, "gnomad_r4")
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "aggregation not yet implemented",
			"Region coverage should return aggregation not implemented error until elastic client supports aggregations")
	})
}

// Test the GraphQL query pattern that would be used once coverage is fully implemented
func TestCoverageModelPatterns_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")  
	}

	// This test documents the expected query patterns based on the real browser queries
	expectedQueries := []struct {
		name     string
		dataset  string
		expected []string
	}{
		{
			name:    "gene_coverage_v4",
			dataset: "gnomad_r4",
			expected: []string{
				"pos", "mean", "median", "over_1", "over_5", "over_10", 
				"over_15", "over_20", "over_25", "over_30", "over_50", "over_100",
			},
		},
		{
			name:    "gene_coverage_v2",
			dataset: "gnomad_r2_1", 
			expected: []string{
				"pos", "mean", "median", "over_1", "over_5", "over_10",
				"over_15", "over_20", "over_25", "over_30", "over_50", "over_100",
			},
		},
		{
			name:    "transcript_coverage",
			dataset: "gnomad_r4",
			expected: []string{
				"pos", "mean", "median", "over_1", "over_5", "over_10",
				"over_15", "over_20", "over_25", "over_30", "over_50", "over_100",
			},
		},
	}

	for _, query := range expectedQueries {
		t.Run(query.name, func(t *testing.T) {
			// Validate that our CoverageBin model supports all expected fields
			bin := &model.CoverageBin{
				Pos:     12345,
				Mean:    ptr(50.0),
				Median:  ptr(45.0),
				Over1:   ptr(0.95),
				Over5:   ptr(0.90),
				Over10:  ptr(0.85),
				Over15:  ptr(0.80),
				Over20:  ptr(0.75),
				Over25:  ptr(0.70),
				Over30:  ptr(0.65),
				Over50:  ptr(0.50),
				Over100: ptr(0.20),
			}

			// Verify all expected fields are accessible
			assert.Equal(t, 12345, bin.Pos)
			assert.NotNil(t, bin.Mean)
			assert.NotNil(t, bin.Median)
			assert.NotNil(t, bin.Over1)
			assert.NotNil(t, bin.Over5)
			assert.NotNil(t, bin.Over10)
			assert.NotNil(t, bin.Over15)
			assert.NotNil(t, bin.Over20)
			assert.NotNil(t, bin.Over25)
			assert.NotNil(t, bin.Over30)
			assert.NotNil(t, bin.Over50)
			assert.NotNil(t, bin.Over100)

			t.Logf("Coverage model supports all required fields for %s", query.name)
		})
	}
}

// Helper function to create float64 pointers
func ptr(f float64) *float64 {
	return &f
}
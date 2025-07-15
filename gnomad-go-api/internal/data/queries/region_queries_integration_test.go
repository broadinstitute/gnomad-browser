//go:build integration
// +build integration

package queries

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// These tests require a running Elasticsearch instance with gene and variant data
// Run with: go test -tags=integration ./internal/data/queries

// Use the existing getTestESClient function from other integration tests

func TestRegionQueries_Integration_ValidateRegion(t *testing.T) {
	tests := []struct {
		name          string
		chrom         string
		start         int
		stop          int
		expectedError bool
		errorContains string
	}{
		{
			name:          "valid region",
			chrom:         "1",
			start:         100000,
			stop:          200000,
			expectedError: false,
		},
		{
			name:          "invalid chromosome",
			chrom:         "invalid",
			start:         100000,
			stop:          200000,
			expectedError: true,
			errorContains: "Invalid chromosome",
		},
		{
			name:          "start less than 1",
			chrom:         "1",
			start:         0,
			stop:          200000,
			expectedError: true,
			errorContains: "start must be greater than 0",
		},
		{
			name:          "stop less than start",
			chrom:         "1",
			start:         200000,
			stop:          100000,
			expectedError: true,
			errorContains: "stop must be greater than region start",
		},
		{
			name:          "start too large",
			chrom:         "1",
			start:         1000000000,
			stop:          1000000001,
			expectedError: true,
			errorContains: "start must be less than 1,000,000,000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateRegion(tt.chrom, tt.start, tt.stop)
			if tt.expectedError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorContains)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRegionQueries_Integration_XPosition(t *testing.T) {
	tests := []struct {
		name     string
		chrom    string
		pos      int
		expected int64
	}{
		{
			name:     "chromosome 1",
			chrom:    "1",
			pos:      100000,
			expected: 1000000000 + 100000,
		},
		{
			name:     "chromosome X",
			chrom:    "X",
			pos:      100000,
			expected: 23000000000 + 100000,
		},
		{
			name:     "chromosome Y",
			chrom:    "Y",
			pos:      100000,
			expected: 24000000000 + 100000,
		},
		{
			name:     "chromosome M",
			chrom:    "M",
			pos:      100000,
			expected: 25000000000 + 100000,
		},
		{
			name:     "invalid chromosome",
			chrom:    "invalid",
			pos:      100000,
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := XPosition(tt.chrom, tt.pos)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestRegionQueries_Integration_FetchRegion(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name            string
		chrom           string
		start           int
		stop            int
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, result *model.Region)
	}{
		{
			name:            "fetch valid region",
			chrom:           "1",
			start:           55039000,
			stop:            55040000,
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Region) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "1", result.Chrom)
				assert.Equal(t, 55039000, result.Start)
				assert.Equal(t, 55040000, result.Stop)
				assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)
			},
		},
		{
			name:            "fetch invalid region",
			chrom:           "invalid",
			start:           100000,
			stop:            200000,
			referenceGenome: "GRCh38",
			expectedError:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchRegion(context.Background(), client, tt.chrom, tt.start, tt.stop, tt.referenceGenome)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				if tt.validate != nil {
					tt.validate(t, result)
				}
			}
		})
	}
}

func TestRegionQueries_Integration_FetchGenesInRegion(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name            string
		chrom           string
		start           int
		stop            int
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, results []*model.RegionGene)
	}{
		{
			name:            "fetch genes in region with known gene",
			chrom:           "1",
			start:           55039000,
			stop:            55040000,
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, results []*model.RegionGene) {
				t.Helper()
				assert.NotNil(t, results)
				// Note: This test depends on the actual data in the test cluster
				t.Logf("Found %d genes in region", len(results))
				// Validate structure of any genes found
				for _, gene := range results {
					assert.NotEmpty(t, gene.GeneID)
					assert.NotEmpty(t, gene.Symbol)
					assert.Greater(t, gene.Stop, gene.Start)
					assert.NotNil(t, gene.Exons)
					assert.NotNil(t, gene.Transcripts)
				}
			},
		},
		{
			name:            "fetch genes in empty region",
			chrom:           "1",
			start:           1,
			stop:            1000,
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, results []*model.RegionGene) {
				t.Helper()
				assert.NotNil(t, results)
				// This region may or may not have genes
				t.Logf("Found %d genes in empty region", len(results))
			},
		},
		{
			name:            "fetch genes with invalid reference genome",
			chrom:           "1",
			start:           55039000,
			stop:            55040000,
			referenceGenome: "invalid",
			expectedError:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := FetchGenesInRegion(context.Background(), client, tt.chrom, tt.start, tt.stop, tt.referenceGenome)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, results)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, results) // Should return empty slice, not nil
				if tt.validate != nil {
					tt.validate(t, results)
				}
			}
		})
	}
}

func TestRegionQueries_Integration_FetchVariantsInRegion(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		chrom         string
		start         int
		stop          int
		dataset       string
		expectedError bool
		validate      func(t *testing.T, results []*model.Variant)
	}{
		{
			name:          "fetch variants in region - gnomAD v4",
			chrom:         "1",
			start:         55039000,
			stop:          55040000,
			dataset:       "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, results []*model.Variant) {
				t.Helper()
				assert.NotNil(t, results)
				t.Logf("Found %d variants in region", len(results))
				// Validate structure of any variants found
				for _, variant := range results {
					assert.NotEmpty(t, variant.VariantID)
				}
			},
		},
		{
			name:          "fetch variants in region - gnomAD v3",
			chrom:         "1",
			start:         55039000,
			stop:          55040000,
			dataset:       "gnomad_r3_genomes",
			expectedError: false,
			validate: func(t *testing.T, results []*model.Variant) {
				t.Helper()
				assert.NotNil(t, results)
				t.Logf("Found %d variants in region", len(results))
				// Validate structure of any variants found
				for _, variant := range results {
					assert.NotEmpty(t, variant.VariantID)
				}
			},
		},
		{
			name:          "fetch variants with invalid dataset",
			chrom:         "1",
			start:         55039000,
			stop:          55040000,
			dataset:       "invalid_dataset",
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := FetchVariantsInRegion(context.Background(), client, tt.chrom, tt.start, tt.stop, tt.dataset)

			if tt.expectedError {
				assert.Error(t, err)
				assert.Nil(t, results)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, results) // Should return empty slice, not nil
				if tt.validate != nil {
					tt.validate(t, results)
				}
			}
		})
	}
}

func TestRegionQueries_Integration_GetVariantIndexForDataset(t *testing.T) {
	tests := []struct {
		name          string
		dataset       string
		expectedIndex string
		expectedError bool
	}{
		{
			name:          "exac dataset",
			dataset:       "exac",
			expectedIndex: "exac_variants",
			expectedError: false,
		},
		{
			name:          "gnomad_r2_1 dataset",
			dataset:       "gnomad_r2_1",
			expectedIndex: "gnomad_v2_variants",
			expectedError: false,
		},
		{
			name:          "gnomad_r3 dataset",
			dataset:       "gnomad_r3",
			expectedIndex: "gnomad_v3_variants",
			expectedError: false,
		},
		{
			name:          "gnomad_r3_genomes dataset",
			dataset:       "gnomad_r3_genomes",
			expectedIndex: "gnomad_v3_variants",
			expectedError: false,
		},
		{
			name:          "gnomad_r4 dataset",
			dataset:       "gnomad_r4",
			expectedIndex: "gnomad_v4_variants",
			expectedError: false,
		},
		{
			name:          "invalid dataset",
			dataset:       "invalid_dataset",
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := getVariantIndexForDataset(tt.dataset)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedIndex, result)
			}
		})
	}
}
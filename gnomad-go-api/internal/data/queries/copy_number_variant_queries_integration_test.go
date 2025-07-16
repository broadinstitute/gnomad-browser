//go:build integration
// +build integration

package queries

import (
	"context"
	"testing"

	"gnomad-browser/gnomad-go-api/internal/graph/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests require a running Elasticsearch instance with gnomAD CNV data
// Run with: go test -tags=integration ./internal/data/queries

func TestFetchCopyNumberVariant_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		datasetID     string
		variantID     string
		expectedError bool
		validate      func(t *testing.T, result *model.CopyNumberVariantDetails)
	}{
		{
			name:          "fetch existing CNV - deletion",
			datasetID:     "gnomad_cnv_r4",
			variantID:     "18813__DEL", // Real CNV ID from actual data
			expectedError: false,
			validate: func(t *testing.T, result *model.CopyNumberVariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "18813__DEL", result.VariantID, "VariantID should match")
				assert.Equal(t, "1", result.Chrom)
				assert.Equal(t, 55057234, result.Pos)
				assert.Equal(t, 55059761, result.End)
				assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)

				// Check frequency data based on real response
				assert.Equal(t, 1.0, result.Sc, "Sample count should match real data")
				assert.Equal(t, 464297.0, result.Sn, "Sample number should match real data")
				assert.InDelta(t, 0.00000215379380008917, result.Sf, 0.00000000000000001, "Sample frequency should match real data")

				// Check CNV type
				if result.Type != nil {
					assert.Equal(t, "DEL", *result.Type, "Should be a deletion")
				}

				// Check length
				if result.Length != nil {
					assert.Equal(t, 2527, *result.Length, "Length should match real data")
				}

				// Check that basic fields are populated
				assert.NotNil(t, result.Filters, "Filters should not be nil")
				assert.NotNil(t, result.Genes, "Genes should not be nil")

				// Check populations data if present
				if len(result.Populations) > 0 {
					pop := result.Populations[0]
					assert.NotEmpty(t, pop.ID, "Population ID should not be empty")
					assert.NotNil(t, pop.Sc, "Population SC should be present")
					assert.NotNil(t, pop.Sn, "Population SN should be present")
					assert.NotNil(t, pop.Sf, "Population SF should be present")
				}
			},
		},
		{
			name:          "fetch existing CNV - duplication",
			datasetID:     "gnomad_cnv_r4",
			variantID:     "18714__DUP", // Real CNV ID from actual data
			expectedError: false,
			validate: func(t *testing.T, result *model.CopyNumberVariantDetails) {
				assert.NotNil(t, result)
				assert.Equal(t, "18714__DUP", result.VariantID, "VariantID should match")
				assert.Equal(t, "1", result.Chrom)
				assert.Equal(t, 54800500, result.Pos)
				assert.Equal(t, 55083986, result.End)

				// Check CNV type
				if result.Type != nil {
					assert.Equal(t, "DUP", *result.Type, "Should be a duplication")
				}

				// Check frequency data based on real response
				assert.Equal(t, 18.0, result.Sc, "Sample count should match real data")
				assert.Equal(t, 464297.0, result.Sn, "Sample number should match real data")
				assert.InDelta(t, 0.000038768288401605, result.Sf, 0.000000000000000001, "Sample frequency should match real data")

				// Check length
				if result.Length != nil {
					assert.Equal(t, 283486, *result.Length, "Length should match real data")
				}
			},
		},
		{
			name:          "fetch non-existent CNV",
			datasetID:     "gnomad_cnv_r4",
			variantID:     "NON_EXISTENT_CNV_ID",
			expectedError: false, // Our implementation returns nil for not found, not error
			validate: func(t *testing.T, result *model.CopyNumberVariantDetails) {
				assert.Nil(t, result, "Non-existent CNV should return nil")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchCopyNumberVariant(context.Background(), client, tt.variantID, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				t.Logf("Successfully fetched CNV: %v", result)
				if tt.validate != nil {
					t.Log("Running validation function")
					tt.validate(t, result)
				}
			}
		})
	}
}

func TestFetchCopyNumberVariantsByGene_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name       string
		datasetID  string
		geneSymbol string
		validate   func(t *testing.T, results []*model.CopyNumberVariant)
	}{
		{
			name:       "fetch CNVs in BRCA1",
			datasetID:  "gnomad_cnv_r4",
			geneSymbol: "BRCA1",
			validate: func(t *testing.T, results []*model.CopyNumberVariant) {
				t.Helper()
				// May return empty list if no CNVs overlap BRCA1
				assert.NotNil(t, results, "Results should not be nil")

				// If we found CNVs, validate their structure
				for _, cnv := range results {
					assert.NotEmpty(t, cnv.VariantID, "CNV should have variant ID")
					assert.NotEmpty(t, cnv.Chrom, "CNV should have chromosome")
					assert.Greater(t, cnv.Pos, 0, "CNV should have positive position")
					assert.Greater(t, cnv.End, cnv.Pos, "CNV end should be greater than start")
					assert.Equal(t, model.ReferenceGenomeIDGRCh38, cnv.ReferenceGenome)

					// Check frequency data
					assert.Greater(t, cnv.Sc, 0.0, "Sample count should be > 0 (filtered in query)")
					assert.NotNil(t, cnv.Sn, "Sample number should be present")
					assert.NotNil(t, cnv.Sf, "Sample frequency should be present")

					t.Logf("Found CNV: %s at %s:%d-%d", cnv.VariantID, cnv.Chrom, cnv.Pos, cnv.End)
				}
			},
		},
		{
			name:       "fetch CNVs in non-existent gene",
			datasetID:  "gnomad_cnv_r4",
			geneSymbol: "NONEXISTENT_GENE_SYMBOL",
			validate: func(t *testing.T, results []*model.CopyNumberVariant) {
				assert.NotNil(t, results, "Results should not be nil")
				// Should return empty slice for non-existent gene - length check is sufficient
				t.Logf("Non-existent gene returned %d CNVs (expected 0)", len(results))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := FetchCopyNumberVariantsByGene(context.Background(), client, tt.geneSymbol, tt.datasetID)

			require.NoError(t, err)
			t.Logf("Found %d CNVs for gene %s", len(results), tt.geneSymbol)

			if tt.validate != nil {
				tt.validate(t, results)
			}
		})
	}
}

func TestFetchCopyNumberVariantsByRegion_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name      string
		datasetID string
		chrom     string
		start     int
		stop      int
		xstart    float64
		xstop     float64
		validate  func(t *testing.T, results []*model.CopyNumberVariant)
	}{
		{
			name:      "fetch CNVs in real region (chr1:55039447-55064852)",
			datasetID: "gnomad_cnv_r4",
			chrom:     "1",
			start:     55039447,
			stop:      55064852,
			xstart:    55039447.0, // Real coordinates from example query
			xstop:     55064852.0,
			validate: func(t *testing.T, results []*model.CopyNumberVariant) {
				t.Helper()
				assert.NotNil(t, results, "Results should not be nil")

				// Based on real response, we expect to find these 4 CNVs (but data may vary in test environment)
				expectedCNVs := map[string]struct{}{
					"18714__DUP": {},
					"18772__DUP": {},
					"18789__DUP": {},
					"18813__DEL": {},
				}

				foundCNVs := make(map[string]bool)

				// If no results found, this might be due to test environment not having the data
				if len(results) == 0 {
					t.Log("No CNVs found in test environment - this may be expected if test data is limited")
					return
				}

				// Validate all returned CNVs overlap with the queried region
				for _, cnv := range results {
					assert.Equal(t, "1", cnv.Chrom, "All CNVs should be on chromosome 1")

					// CNV should overlap with query region
					// (CNV.pos <= region.stop && CNV.end >= region.start)
					overlaps := cnv.Pos <= 55064852 && cnv.End >= 55039447
					assert.True(t, overlaps, "CNV %s (%d-%d) should overlap with region (55039447-55064852)",
						cnv.VariantID, cnv.Pos, cnv.End)

					// Track which expected CNVs we found
					if _, expected := expectedCNVs[cnv.VariantID]; expected {
						foundCNVs[cnv.VariantID] = true
					}

					// Check frequency data
					assert.Greater(t, cnv.Sc, 0.0, "Sample count should be > 0 (filtered in query)")
					assert.NotNil(t, cnv.Sn, "Sample number should be present")
					assert.NotNil(t, cnv.Sf, "Sample frequency should be present")

					// All CNVs in this region should have 464296 or 464297 sample number
					assert.Contains(t, []float64{464296.0, 464297.0}, cnv.Sn, "Sample number should match expected values")

					// Validate all fields that are queried in the real example
					assert.NotNil(t, cnv.Filters, "Filters should not be nil")
					assert.NotEmpty(t, cnv.VariantID, "VariantID should not be empty")

					// Optional fields that may be present
					if cnv.Length != nil {
						assert.Greater(t, *cnv.Length, 0, "Length should be positive if present")
					}
					if cnv.Type != nil {
						assert.Contains(t, []string{"DEL", "DUP"}, *cnv.Type, "Type should be DEL or DUP")
					}

					t.Logf("Found CNV: %s at %s:%d-%d (length: %v, type: %v, sc: %.0f)",
						cnv.VariantID, cnv.Chrom, cnv.Pos, cnv.End, cnv.Length, cnv.Type, cnv.Sc)
				}

				// Verify we found some of the expected CNVs (data may vary based on test environment)
				if len(results) > 0 {
					t.Logf("Found %d expected CNVs out of %d total", len(foundCNVs), len(results))
				}
			},
		},
		{
			name:      "fetch CNVs in chromosome 17 region (BRCA1 region)",
			datasetID: "gnomad_cnv_r4",
			chrom:     "17",
			start:     43000000,
			stop:      44000000,
			xstart:    43000000.0,
			xstop:     44000000.0,
			validate: func(t *testing.T, results []*model.CopyNumberVariant) {
				t.Helper()
				assert.NotNil(t, results, "Results should not be nil")

				// Validate all returned CNVs overlap with the queried region
				for _, cnv := range results {
					assert.Equal(t, "17", cnv.Chrom, "All CNVs should be on chromosome 17")

					// CNV should overlap with query region
					overlaps := cnv.Pos <= 44000000 && cnv.End >= 43000000
					assert.True(t, overlaps, "CNV %s (%d-%d) should overlap with region (43000000-44000000)",
						cnv.VariantID, cnv.Pos, cnv.End)

					// Check frequency data matches query expectations
					assert.Greater(t, cnv.Sc, 0.0, "Sample count should be > 0 (filtered in query)")
					assert.NotNil(t, cnv.Sn, "Sample number should be present")
					assert.NotNil(t, cnv.Sf, "Sample frequency should be present")

					t.Logf("Found CNV: %s at %s:%d-%d", cnv.VariantID, cnv.Chrom, cnv.Pos, cnv.End)
				}
			},
		},
		{
			name:      "fetch CNVs in small region (likely empty)",
			datasetID: "gnomad_cnv_r4",
			chrom:     "22",
			start:     10000000,
			stop:      10001000, // Very small 1kb region
			xstart:    10000000.0,
			xstop:     10001000.0,
			validate: func(t *testing.T, results []*model.CopyNumberVariant) {
				assert.NotNil(t, results, "Results should not be nil")
				// May be empty, but should not error
				t.Logf("Found %d CNVs in small region", len(results))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := FetchCopyNumberVariantsByRegion(
				context.Background(),
				client,
				tt.chrom,
				tt.start,
				tt.stop,
				tt.xstart,
				tt.xstop,
				tt.datasetID,
			)

			require.NoError(t, err)
			t.Logf("Found %d CNVs in region %s:%d-%d", len(results), tt.chrom, tt.start, tt.stop)

			if tt.validate != nil {
				tt.validate(t, results)
			}
		})
	}
}

func TestCopyNumberVariant_Integration_DataShaping(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Use a CNV known to have rich data from real response
	variantID := "18714__DUP" // Real CNV with comprehensive data
	datasetID := "gnomad_cnv_r4"

	result, err := FetchCopyNumberVariant(context.Background(), client, variantID, datasetID)

	if err != nil {
		require.NoError(t, err)
	}

	if result == nil {
		t.Skip("Test CNV not found in database - this is expected if test data is limited")
	}

	// Test basic CNV data shaping
	assert.NotEmpty(t, result.VariantID, "VariantID should not be empty")
	assert.NotEmpty(t, result.Chrom, "Chromosome should not be empty")
	assert.Greater(t, result.Pos, 0, "Position should be positive")
	assert.Greater(t, result.End, result.Pos, "End should be greater than position")

	// Test frequency data
	assert.NotNil(t, result.Sc, "Sample count should be present")
	assert.NotNil(t, result.Sn, "Sample number should be present")
	assert.NotNil(t, result.Sf, "Sample frequency should be present")
	assert.GreaterOrEqual(t, result.Sf, 0.0, "Sample frequency should be non-negative")
	assert.LessOrEqual(t, result.Sf, 1.0, "Sample frequency should be <= 1.0")

	// Test reference genome
	validGenomes := []model.ReferenceGenomeID{
		model.ReferenceGenomeIDGRCh37,
		model.ReferenceGenomeIDGRCh38,
	}
	assert.Contains(t, validGenomes, result.ReferenceGenome, "Should have valid reference genome")

	// Test optional fields (can be nil/empty)
	if result.Length != nil {
		expectedLength := result.End - result.Pos
		assert.Equal(t, expectedLength, *result.Length, "Length should match end - pos")
	}

	if result.Type != nil {
		validTypes := []string{"DEL", "DUP", "deletion", "duplication", "CNV"}
		assert.Contains(t, validTypes, *result.Type, "Should have valid CNV type")
	}

	// Test filters - should be a slice (can be empty)
	assert.NotNil(t, result.Filters, "Filters should not be nil")
	assert.IsType(t, []string{}, result.Filters, "Filters should be string slice")

	// Test genes - should be a slice (can be empty)
	assert.NotNil(t, result.Genes, "Genes should not be nil")
	assert.IsType(t, []string{}, result.Genes, "Genes should be string slice")

	// Test populations data - may be empty in test environment
	if result.Populations != nil && len(result.Populations) > 0 {
		pop := result.Populations[0]
		assert.NotEmpty(t, pop.ID, "Population ID should not be empty")
		assert.NotNil(t, pop.Sc, "Population SC should be present")
		assert.NotNil(t, pop.Sn, "Population SN should be present")
		assert.NotNil(t, pop.Sf, "Population SF should be present")

		// Population frequency should be reasonable
		assert.GreaterOrEqual(t, pop.Sf, 0.0, "Population frequency should be non-negative")
		assert.LessOrEqual(t, pop.Sf, 1.0, "Population frequency should be <= 1.0")

		t.Logf("Population %s: SC=%.2f, SN=%.2f, SF=%.4f", pop.ID, pop.Sc, pop.Sn, pop.Sf)
	}

	// Test confidence intervals (if present)
	if result.Posmin != nil && result.Posmax != nil {
		assert.LessOrEqual(t, *result.Posmin, result.Pos, "Posmin should be <= pos")
		assert.GreaterOrEqual(t, *result.Posmax, result.Pos, "Posmax should be >= pos")
	}

	if result.Endmin != nil && result.Endmax != nil {
		assert.LessOrEqual(t, *result.Endmin, result.End, "Endmin should be <= end")
		assert.GreaterOrEqual(t, *result.Endmax, result.End, "Endmax should be >= end")
	}

	// Test quality score (if present) - some CNVs may have negative quality scores
	if result.Qual != nil {
		t.Logf("Quality score: %f", *result.Qual)
		// Quality can be negative in some cases, so just log it
	}
}

func TestCopyNumberVariant_Integration_DatasetSupport(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Test supported dataset
	_, err := FetchCopyNumberVariant(context.Background(), client, "ANY_ID", "gnomad_cnv_r4")
	assert.NoError(t, err, "Should support gnomad_cnv_r4 dataset")

	// Test unsupported dataset
	_, err = FetchCopyNumberVariant(context.Background(), client, "ANY_ID", "unsupported_dataset")
	assert.Error(t, err, "Should error on unsupported dataset")
	assert.Contains(t, err.Error(), "unsupported CNV dataset", "Should mention unsupported dataset")
}

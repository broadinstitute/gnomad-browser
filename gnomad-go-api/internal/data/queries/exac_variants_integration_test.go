//go:build integration
// +build integration

package queries

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// These tests require a running Elasticsearch instance with ExAC data
// Run with: go test -tags=integration ./internal/data/queries

func TestExacVariantFetcher_Integration_FetchVariantByID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Initialize ExAC fetcher
	fetcher := &ExacVariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "exac",
			ReferenceGenome: model.ReferenceGenomeIDGRCh37,
			ESIndex:         ExacVariantIndex,
		},
	}

	tests := []struct {
		name          string
		variantID     string
		expectedError bool
		validate      func(t *testing.T, result *model.VariantDetails)
	}{
		{
			name:          "fetch existing ExAC variant",
			variantID:     "1-55505520-G-A",
			expectedError: false,
			validate: func(t *testing.T, result *model.VariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "1-55505520-G-A", result.VariantID, "VariantID should match")
				assert.Equal(t, "1", result.Chrom)
				assert.Equal(t, 55505520, result.Pos)
				assert.Equal(t, "G", result.Ref)
				assert.Equal(t, "A", result.Alt)
				assert.Equal(t, model.ReferenceGenomeIDGRCh37, result.ReferenceGenome)

				// ExAC only has exome data
				assert.NotNil(t, result.Exome, "ExAC should have exome data")
				assert.Nil(t, result.Genome, "ExAC should not have genome data")

				// Check rsID if present
				if result.Rsids != nil {
					assert.Greater(t, len(result.Rsids), 0, "Should have rsID")
				}

				// Check populations exist
				assert.Greater(t, len(result.Exome.Populations), 0, "Should have population data")
			},
		},
		{
			name:          "fetch non-existent variant",
			variantID:     "1-999999999-A-T",
			expectedError: true,
		},
	}

	ctx := context.Background()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := fetcher.FetchVariantByID(ctx, client, tt.variantID)

			if tt.expectedError {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, result)

			if tt.validate != nil {
				tt.validate(t, result)
			}
		})
	}
}

func TestExacVariantFetcher_Integration_FetchVariantByRSID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Initialize ExAC fetcher
	fetcher := &ExacVariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "exac",
			ReferenceGenome: model.ReferenceGenomeIDGRCh37,
			ESIndex:         ExacVariantIndex,
		},
	}

	tests := []struct {
		name          string
		rsid          string
		expectedError bool
		errorMessage  string
		validate      func(t *testing.T, result *model.VariantDetails)
	}{
		// TODO: Find a valid ExAC rsID for testing
		// {
		// 	name:          "fetch existing variant by rsID",
		// 	rsid:          "rs121913340",
		// 	expectedError: false,
		// 	validate: func(t *testing.T, result *model.VariantDetails) {
		// 		t.Helper()
		// 		assert.NotNil(t, result)
		// 		assert.NotNil(t, result.Rsids)
		// 		assert.Contains(t, result.Rsids, "rs121913340")
		// 		assert.NotNil(t, result.Exome, "Should have exome data")
		// 	},
		// },
		{
			name:          "fetch non-existent rsID",
			rsid:          "rs999999999999",
			expectedError: true,
		},
	}

	ctx := context.Background()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := fetcher.FetchVariantByRSID(ctx, client, tt.rsid)

			if tt.expectedError {
				assert.Error(t, err)
				if tt.errorMessage != "" {
					assert.Contains(t, err.Error(), tt.errorMessage)
				}
				return
			}

			require.NoError(t, err)
			require.NotNil(t, result)

			if tt.validate != nil {
				tt.validate(t, result)
			}
		})
	}
}

func TestExacVariantFetcher_Integration_DataQuality(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Initialize ExAC fetcher
	fetcher := &ExacVariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "exac",
			ReferenceGenome: model.ReferenceGenomeIDGRCh37,
			ESIndex:         ExacVariantIndex,
		},
	}

	// Test with known ExAC variant
	ctx := context.Background()
	result, err := fetcher.FetchVariantByID(ctx, client, "1-55505520-G-A")
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify quality metrics structure
	if result.Exome != nil && result.Exome.QualityMetrics != nil {
		qm := result.Exome.QualityMetrics

		// ExAC has raw histograms only
		if qm.GenotypeDepth != nil {
			assert.NotNil(t, qm.GenotypeDepth.All, "Should have all genotype depth histogram")
			assert.NotNil(t, qm.GenotypeDepth.Alt, "Should have alt genotype depth histogram")
		}

		if qm.GenotypeQuality != nil {
			assert.NotNil(t, qm.GenotypeQuality.All, "Should have all genotype quality histogram")
			assert.NotNil(t, qm.GenotypeQuality.Alt, "Should have alt genotype quality histogram")
		}

		// ExAC only has alt allele balance
		if qm.AlleleBalance != nil {
			assert.NotNil(t, qm.AlleleBalance.Alt, "Should have alt allele balance")
		}
	}

	// Verify population data
	if result.Exome != nil {
		assert.Greater(t, len(result.Exome.Populations), 0, "Should have population data")

		// Verify population IDs are correct (no underscores, no XX/XY)
		for _, pop := range result.Exome.Populations {
			assert.NotContains(t, pop.ID, "_", "Population ID should not contain underscores")
			assert.NotEqual(t, "XX", pop.ID, "XX should be filtered out")
			assert.NotEqual(t, "XY", pop.ID, "XY should be filtered out")
		}
	}

	// Verify transcript consequences
	assert.NotNil(t, result.TranscriptConsequences, "Should have transcript consequences")
}

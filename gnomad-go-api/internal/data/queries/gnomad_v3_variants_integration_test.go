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

// These tests require a running Elasticsearch instance with gnomAD v3 data
// Run with: go test -tags=integration ./internal/data/queries

func TestGnomadV3VariantFetcher_Integration_FetchVariantByID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		subset        string
		variantID     string
		expectedError bool
		validate      func(t *testing.T, result *model.VariantDetails)
	}{
		{
			name:          "fetch existing variant - all subset",
			subset:        "all",
			variantID:     "1-55039774-C-T", // Standard gnomAD v3 variant
			expectedError: false,
			validate: func(t *testing.T, result *model.VariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "1-55039774-C-T", result.VariantID, "VariantID should match")
				assert.Equal(t, "1", result.Chrom)
				assert.Equal(t, 55039774, result.Pos)
				assert.Equal(t, "C", result.Ref)
				assert.Equal(t, "T", result.Alt)
				assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)
				
				// V3 should have genome data but no exome or joint data
				assert.NotNil(t, result.Genome, "V3 should have genome data")
				assert.Nil(t, result.Exome, "V3 should not have exome data")
				assert.Nil(t, result.Joint, "V3 should not have joint data")
			},
		},
		{
			name:          "fetch non-existent variant",
			subset:        "all",
			variantID:     "1-999999999-A-T",
			expectedError: true,
		},
		{
			name:          "fetch variant - non_v2 subset",
			subset:        "non_v2",
			variantID:     "1-55039774-C-T", // Standard gnomAD v3 variant
			expectedError: false,
			validate: func(t *testing.T, result *model.VariantDetails) {
				assert.NotNil(t, result)
				assert.NotNil(t, result.Genome, "V3 should have genome data")
				// Verify genome data has appropriate populations
				if result.Genome != nil && result.Genome.Populations != nil {
					// Should not have 1KG populations for non_v2 subset
					for _, pop := range result.Genome.Populations {
						assert.NotContains(t, pop.ID, "1kg:", "non_v2 subset should not contain 1KG populations")
					}
				}
			},
		},
		{
			name:          "fetch variant - non_cancer subset",
			subset:        "non_cancer",
			variantID:     "1-55039774-C-T", // Standard gnomAD v3 variant
			expectedError: false,
			validate: func(t *testing.T, result *model.VariantDetails) {
				assert.NotNil(t, result)
				assert.NotNil(t, result.Genome, "V3 should have genome data")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fetcher := &GnomadV3VariantFetcher{
				BaseVariantFetcher: BaseVariantFetcher{
					DatasetID:       "gnomad_r3_genomes",
					ReferenceGenome: model.ReferenceGenomeIDGRCh38,
					ESIndex:         "gnomad_v3_variants",
				},
				Subset: tt.subset,
			}

			result, err := fetcher.FetchVariantByID(context.Background(), client, tt.variantID)

			if tt.expectedError {
				assert.Error(t, err)
				_, ok := err.(*VariantNotFoundError)
				assert.True(t, ok, "Expected VariantNotFoundError")
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
				t.Logf("Successfully fetched variant: %s", result.VariantID)
				if tt.validate != nil {
					t.Log("Running validation function")
					tt.validate(t, result)
				}
			}
		})
	}
}

func TestGnomadV3VariantFetcher_Integration_FetchVariantByRSID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	}

	// Test with a known rsID (if available in v3 data)
	result, err := fetcher.FetchVariantByRSID(context.Background(), client, "rs12345678")

	if err != nil {
		// If variant not found, skip test
		t.Skipf("RSID test variant not found in v3 data: %v", err)
	}

	require.NotNil(t, result)
	assert.NotEmpty(t, result.VariantID)
	assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)
	
	// Should have genome data but no exome or joint data
	assert.NotNil(t, result.Genome, "V3 should have genome data")
	assert.Nil(t, result.Exome, "V3 should not have exome data")
	assert.Nil(t, result.Joint, "V3 should not have joint data")

	t.Logf("Successfully fetched variant by RSID: %s", result.VariantID)
}

func TestGnomadV3VariantFetcher_Integration_AllSubsets(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Test all v3 subsets
	subsets := []string{"all", "non_v2", "non_cancer", "non_neuro", "non_topmed", "controls_and_biobanks"}
	testVariantID := "1-55039774-C-T"

	for _, subset := range subsets {
		t.Run("subset_"+subset, func(t *testing.T) {
			fetcher := &GnomadV3VariantFetcher{
				BaseVariantFetcher: BaseVariantFetcher{
					DatasetID:       "gnomad_r3_genomes_" + subset,
					ReferenceGenome: model.ReferenceGenomeIDGRCh38,
					ESIndex:         "gnomad_v3_variants",
				},
				Subset: subset,
			}

			result, err := fetcher.FetchVariantByID(context.Background(), client, testVariantID)

			if err != nil {
				// Some subsets might not have the test variant
				t.Logf("Variant not found in subset %s: %v", subset, err)
				return
			}

			require.NotNil(t, result)
			assert.Equal(t, testVariantID, result.VariantID)
			assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)
			
			// Should have genome data but no exome or joint data
			assert.NotNil(t, result.Genome, "V3 should have genome data")
			assert.Nil(t, result.Exome, "V3 should not have exome data")
			assert.Nil(t, result.Joint, "V3 should not have joint data")

			t.Logf("Successfully fetched variant in subset %s: %s", subset, result.VariantID)
		})
	}
}

func TestGnomadV3VariantFetcher_Integration_InSilicoPredictors(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	}

	result, err := fetcher.FetchVariantByID(context.Background(), client, "1-55039774-C-T")

	if err != nil {
		t.Skipf("Test variant not found: %v", err)
	}

	require.NotNil(t, result)

	// Check that in-silico predictors are properly formatted
	if result.InSilicoPredictors != nil {
		for _, predictor := range result.InSilicoPredictors {
			assert.NotEmpty(t, predictor.ID, "Predictor ID should not be empty")
			assert.NotEmpty(t, predictor.Value, "Predictor value should not be empty")
			assert.NotNil(t, predictor.Flags, "Predictor flags should not be nil")
			
			// Check that V3 predictors match expected format
			switch predictor.ID {
			case "revel", "cadd", "primate_ai":
				// These should be numeric values
				assert.Regexp(t, `^\d+(\.\d+)?([eE][+-]?\d+)?$`, predictor.Value, "Numeric predictor should have numeric value")
			case "splice_ai":
				// This might have consequence in parentheses
				assert.Regexp(t, `^\d+(\.\d+)?([eE][+-]?\d+)?(\s*\(.+\))?$`, predictor.Value, "SpliceAI should have numeric value with optional consequence")
			}
		}
	}

	t.Logf("Successfully validated in-silico predictors for variant: %s", result.VariantID)
}

func TestGnomadV3VariantFetcher_Integration_PopulationMerging(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	}

	result, err := fetcher.FetchVariantByID(context.Background(), client, "1-55039774-C-T")

	if err != nil {
		t.Skipf("Test variant not found: %v", err)
	}

	require.NotNil(t, result)
	require.NotNil(t, result.Genome)

	// Check that populations are properly merged with prefixes
	if result.Genome.Populations != nil {
		hgdpFound := false
		tgpFound := false
		baseFound := false

		for _, pop := range result.Genome.Populations {
			if len(pop.ID) >= 5 && pop.ID[:5] == "hgdp:" {
				hgdpFound = true
			} else if len(pop.ID) >= 4 && pop.ID[:4] == "1kg:" {
				tgpFound = true
			} else {
				baseFound = true
			}
		}

		assert.True(t, baseFound, "Should have base populations")
		
		// HGDP and 1KG populations are conditional on data availability
		if hgdpFound {
			t.Log("HGDP populations found with proper prefix")
		}
		if tgpFound {
			t.Log("1KG populations found with proper prefix")
		}
	}

	t.Logf("Successfully validated population merging for variant: %s", result.VariantID)
}
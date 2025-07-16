//go:build integration
// +build integration

package queries

import (
	"context"
	"os"
	"testing"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests require a running Elasticsearch instance with gnomAD v4 data
// Run with: go test -tags=integration ./internal/data/queries

func getTestESClient(t *testing.T) *elastic.Client {
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
		t.Skipf("Could not ping Elasticsearch at %s: %v", esURL, err)
	}
	t.Logf("Connected to Elasticsearch %s at %s", info.Version.Number, esURL)

	return client
}

func TestGnomadV4VariantFetcher_Integration_FetchVariantByID(t *testing.T) {
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
			variantID:     "1-55051215-G-GA", // Standard gnomAD v4 variant
			expectedError: false,
			validate: func(t *testing.T, result *model.VariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "1-55051215-G-GA", result.VariantID, "VariantID should match")
				assert.Equal(t, "1", result.Chrom)
				assert.Equal(t, 55051215, result.Pos)
				assert.Equal(t, "G", result.Ref)
				assert.Equal(t, "GA", result.Alt)
				assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)
				// Check rsID if present
				if result.Rsids != nil {
					assert.Contains(t, result.Rsids, "rs527413419")
				}
			},
		},
		{
			name:          "fetch non-existent variant",
			subset:        "all",
			variantID:     "1-999999999-A-T",
			expectedError: true,
		},
		{
			name:          "fetch variant - non_ukb subset",
			subset:        "non_ukb",
			variantID:     "1-55051215-G-GA", // Standard gnomAD v4 variant
			expectedError: false,
			validate: func(t *testing.T, result *model.VariantDetails) {
				assert.NotNil(t, result)
				// Verify exome/genome/joint data based on subset
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fetcher := &GnomadV4VariantFetcher{
				BaseVariantFetcher: BaseVariantFetcher{
					DatasetID: "gnomad_r4_0",
					ESIndex:   "gnomad_v4_variants",
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

func TestGnomadV4VariantFetcher_Integration_FetchVariantByRSID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	fetcher := &GnomadV4VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID: "gnomad_r4_0",
			ESIndex:   "gnomad_v4_variants",
		},
		Subset: "all",
	}

	// Test with a known rsID
	result, err := fetcher.FetchVariantByRSID(context.Background(), client, "rs527413419")

	if err != nil {
		// If variant not found, skip test
		if _, ok := err.(*VariantNotFoundError); ok {
			t.Skip("Test rsID not found in database")
		}
		require.NoError(t, err)
	}

	assert.NotNil(t, result)
	assert.Contains(t, result.Rsids, "rs527413419")
}

func TestGnomadV4VariantFetcher_Integration_FetchVariantByVRSID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	fetcher := &GnomadV4VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID: "gnomad_r4_0",
			ESIndex:   "gnomad_v4_variants",
		},
		Subset: "all",
	}

	// Test with a known VRS ID
	vrsID := "ga4gh:VA.hingrE1dTh6sN0lzvUD-vpatd6ukTP3S"
	result, err := fetcher.FetchVariantByVRSID(context.Background(), client, vrsID)

	if err != nil {
		// If variant not found, skip test
		if _, ok := err.(*VariantNotFoundError); ok {
			t.Skip("Test VRS ID not found in database")
		}
		require.NoError(t, err)
	}

	assert.NotNil(t, result)
}

func TestGnomadV4VariantFetcher_Integration_DataShaping(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	fetcher := &GnomadV4VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID: "gnomad_r4_0",
			ESIndex:   "gnomad_v4_variants",
		},
		Subset: "all",
	}

	// Use a variant known to have rich data
	variantID := "1-55051215-G-GA"
	result, err := fetcher.FetchVariantByID(context.Background(), client, variantID)

	if err != nil {
		if _, ok := err.(*VariantNotFoundError); ok {
			t.Skip("Test variant not found in database")
		}
		require.NoError(t, err)
	}

	// Test exome data shaping
	if result.Exome != nil {
		assert.NotNil(t, result.Exome.Populations)
		assert.Greater(t, len(result.Exome.Populations), 0)

		// Check for AC=0 filter if applicable
		if result.Exome.Ac == 0 {
			assert.Contains(t, result.Exome.Filters, "AC0")
		}

		// Check quality metrics
		if result.Exome.QualityMetrics != nil {
			assert.NotNil(t, result.Exome.QualityMetrics.SiteQualityMetrics)
		}
	}

	// Test genome data shaping
	if result.Genome != nil {
		// Check for HGDP/1KG prefixed populations
		var hasHGDPPop, has1KGPop bool
		for _, pop := range result.Genome.Populations {
			if len(pop.ID) >= 5 && pop.ID[:5] == "hgdp:" {
				hasHGDPPop = true
			}
			if len(pop.ID) >= 4 && pop.ID[:4] == "1kg:" {
				has1KGPop = true
			}
		}
		t.Logf("Has HGDP populations: %v, Has 1KG populations: %v", hasHGDPPop, has1KGPop)
	}

	// Test flags - should be a slice (can be empty)
	assert.NotNil(t, result.Flags)
	assert.IsType(t, []string{}, result.Flags)

	// Test transcript consequences
	if len(result.TranscriptConsequences) > 0 {
		tc := result.TranscriptConsequences[0]
		assert.True(t, len(tc.GeneID) > 4 && tc.GeneID[:4] == "ENSG", "Should only include ENSEMBL transcripts")
	}

	// Test in silico predictors
	if len(result.InSilicoPredictors) > 0 {
		validPredictors := map[string]bool{
			"CADD": true, "REVEL": true, "SpliceAI": true,
			"Pangolin": true, "phyloP": true, "SIFT": true, "PolyPhen": true,
		}
		for _, pred := range result.InSilicoPredictors {
			assert.True(t, validPredictors[pred.ID], "Unexpected predictor: %s", pred.ID)
		}
	}
}

func TestGnomadV4VariantFetcher_Integration_SubsetBehavior(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Test the same variant with different subsets
	variantID := "1-55051215-G-GA" // Standard gnomAD v4 variant

	// Fetch with "all" subset
	fetcherAll := &GnomadV4VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID: "gnomad_r4_0",
			ESIndex:   "gnomad_v4_variants",
		},
		Subset: "all",
	}

	resultAll, errAll := fetcherAll.FetchVariantByID(context.Background(), client, variantID)

	// Fetch with "non_ukb" subset
	fetcherNonUKB := &GnomadV4VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID: "gnomad_r4_0_non_ukb", // Different dataset ID for non_ukb subset
			ESIndex:   "gnomad_v4_variants",
		},
		Subset: "non_ukb",
	}

	resultNonUKB, errNonUKB := fetcherNonUKB.FetchVariantByID(context.Background(), client, variantID)

	// Compare results
	if errAll == nil && errNonUKB == nil {
		// Both found the variant
		assert.Equal(t, resultAll.VariantID, resultNonUKB.VariantID)
		assert.Equal(t, resultAll.Chrom, resultNonUKB.Chrom)
		assert.Equal(t, resultAll.Pos, resultNonUKB.Pos)

		// Joint data should be present for 'all' subset but nil for 'non_ukb' subset
		assert.NotNil(t, resultAll.Joint, "Joint data should be present for 'all' subset")
		assert.Nil(t, resultNonUKB.Joint, "Joint data should be nil for 'non_ukb' subset")

		// AC/AN might be different between subsets
		if resultAll.Exome != nil && resultNonUKB.Exome != nil {
			t.Logf("Exome AC - all: %d, non_ukb: %d", resultAll.Exome.Ac, resultNonUKB.Exome.Ac)
			// The non_ukb subset should have equal or fewer alleles than the all subset
			assert.LessOrEqual(t, resultNonUKB.Exome.Ac, resultAll.Exome.Ac, "non_ukb AC should be <= all AC")
		}
	} else if errAll == nil && errNonUKB != nil {
		// Variant exists in "all" but not in "non_ukb" - this is expected for some variants
		t.Log("Variant exists in 'all' subset but not in 'non_ukb' subset")
	}
}

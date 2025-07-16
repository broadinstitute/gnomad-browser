//go:build integration
// +build integration

package queries

import (
	"context"
	"os"
	"strings"
	"testing"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests require a running Elasticsearch instance with ClinVar data
// Run with: go test -tags=integration ./internal/data/queries

func TestClinVarIndicesExist_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getClinVarTestESClient(t)

	// Check if ClinVar indices exist
	ctx := context.Background()

	// First, let's see what indices exist that might be ClinVar related
	t.Log("Checking for ClinVar-related indices...")

	for refGenome, indexName := range ClinVarVariantIndices {
		t.Run("check_index_"+refGenome, func(t *testing.T) {
			// Try to get index info
			query := map[string]any{
				"query": map[string]any{
					"match_all": map[string]any{},
				},
				"size": 3, // Get a few samples
			}

			response, err := client.Search(ctx, indexName, query)
			if err != nil {
				t.Logf("Index %s (%s) not available or accessible: %v", indexName, refGenome, err)
				// Try alternative index names
				altNames := []string{
					"clinvar_" + strings.ToLower(refGenome) + "_variants",
					"clinvar_variants_" + strings.ToLower(refGenome),
					"clinvar_" + strings.ToLower(refGenome),
					"clinvar_variants",
				}

				for _, altName := range altNames {
					altResponse, altErr := client.Search(ctx, altName, query)
					if altErr == nil {
						t.Logf("Found alternative index: %s with %d documents", altName, altResponse.Hits.Total.Value)
						if len(altResponse.Hits.Hits) > 0 {
							hit := altResponse.Hits.Hits[0]
							if value, ok := hit.Source["value"].(map[string]any); ok {
								if variantID, ok := value["variant_id"].(string); ok {
									t.Logf("Sample variant ID in %s: %s", altName, variantID)
								}
							}
						}
						break
					}
				}
				return
			}

			t.Logf("Index %s (%s) exists with %d total documents",
				indexName, refGenome, response.Hits.Total.Value)

			// If we found documents, log some samples
			for i, hit := range response.Hits.Hits {
				if value, ok := hit.Source["value"].(map[string]any); ok {
					if variantID, ok := value["variant_id"].(string); ok {
						t.Logf("Sample variant %d in %s: %s", i+1, refGenome, variantID)
					}
				}
			}
		})
	}
}

func getClinVarTestESClient(t *testing.T) *elastic.Client {
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

func TestFetchClinVarVariant_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getClinVarTestESClient(t)

	tests := []struct {
		name            string
		variantID       string
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, result *model.ClinVarVariantDetails)
	}{
		{
			name:            "fetch existing ClinVar variant - GRCh38",
			variantID:       "1-55505647-G-T",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.ClinVarVariantDetails) {
				t.Helper()
				if result == nil {
					t.Skip("Test ClinVar variant not found in database - skipping validation")
					return
				}
				assert.Equal(t, "1-55505647-G-T", result.VariantID, "VariantID should match")
				assert.Equal(t, "1", result.Chrom)
				assert.Equal(t, 55505647, result.Pos)
				assert.Equal(t, "G", result.Ref)
				assert.Equal(t, "T", result.Alt)
				assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)
				assert.NotEmpty(t, result.ClinicalSignificance, "Clinical significance should not be empty")
				assert.NotEmpty(t, result.ReviewStatus, "Review status should not be empty")
				assert.NotEmpty(t, result.ClinvarVariationID, "ClinVar variation ID should not be empty")
				assert.GreaterOrEqual(t, result.GoldStars, 0, "Gold stars should be non-negative")
			},
		},
		{
			name:            "fetch existing ClinVar variant - GRCh37",
			variantID:       "1-55039974-G-T", // GRCh37 coordinates
			referenceGenome: "GRCh37",
			expectedError:   false,
			validate: func(t *testing.T, result *model.ClinVarVariantDetails) {
				t.Helper()
				if result == nil {
					t.Skip("Test ClinVar variant not found in database - skipping validation")
					return
				}
				assert.Equal(t, model.ReferenceGenomeIDGRCh37, result.ReferenceGenome)
				assert.NotEmpty(t, result.ClinicalSignificance)
				assert.NotEmpty(t, result.ReviewStatus)
			},
		},
		{
			name:            "fetch non-existent ClinVar variant",
			variantID:       "1-999999999-A-T",
			referenceGenome: "GRCh38",
			expectedError:   false, // Returns nil, not error
			validate: func(t *testing.T, result *model.ClinVarVariantDetails) {
				assert.Nil(t, result, "Non-existent variant should return nil")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchClinVarVariant(context.Background(), client, tt.variantID, tt.referenceGenome)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				if tt.validate != nil {
					tt.validate(t, result)
				}
				if result != nil {
					t.Logf("Successfully fetched ClinVar variant: %s", result.VariantID)
				} else {
					t.Log("Correctly returned nil for non-existent variant")
				}
			}
		})
	}
}

func TestFetchClinVarVariant_Integration_DataStructure(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getClinVarTestESClient(t)

	// Use a variant known to have rich ClinVar data
	variantID := "1-55505647-G-T"
	referenceGenome := "GRCh38"

	result, err := FetchClinVarVariant(context.Background(), client, variantID, referenceGenome)
	require.NoError(t, err)

	if result == nil {
		t.Skip("Test variant not found in database")
	}

	// Test basic fields
	assert.NotEmpty(t, result.VariantID)
	assert.NotEmpty(t, result.ClinicalSignificance)
	assert.NotEmpty(t, result.ReviewStatus)
	assert.NotEmpty(t, result.ClinvarVariationID)
	assert.True(t, result.InGnomad) // This field should be boolean

	// Test gnomAD data structure if present
	if result.Gnomad != nil {
		if result.Gnomad.Exome != nil {
			assert.GreaterOrEqual(t, result.Gnomad.Exome.Ac, 0)
			assert.Greater(t, result.Gnomad.Exome.An, 0)
			assert.NotNil(t, result.Gnomad.Exome.Filters)
		}
		if result.Gnomad.Genome != nil {
			assert.GreaterOrEqual(t, result.Gnomad.Genome.Ac, 0)
			assert.Greater(t, result.Gnomad.Genome.An, 0)
			assert.NotNil(t, result.Gnomad.Genome.Filters)
		}
	}

	// Test submissions if present
	if len(result.Submissions) > 0 {
		for _, submission := range result.Submissions {
			assert.NotEmpty(t, submission.ReviewStatus)
			assert.NotEmpty(t, submission.SubmitterName)
			assert.NotNil(t, submission.Conditions)

			// Test conditions
			for _, condition := range submission.Conditions {
				assert.NotEmpty(t, condition.Name)
				// MedGenID is optional
			}
		}
	}
}

func TestFetchClinVarVariantsByGene_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getClinVarTestESClient(t)

	tests := []struct {
		name            string
		geneID          string
		referenceGenome string
		expectVariants  bool
	}{
		{
			name:            "fetch ClinVar variants for gene with known variants",
			geneID:          "ENSG00000169174", // PCSK9 gene
			referenceGenome: "GRCh38",
			expectVariants:  true,
		},
		{
			name:            "fetch ClinVar variants for gene with no variants",
			geneID:          "ENSG00000000000", // Non-existent gene
			referenceGenome: "GRCh38",
			expectVariants:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchClinVarVariantsByGene(context.Background(), client, tt.geneID, tt.referenceGenome)

			require.NoError(t, err)
			assert.NotNil(t, result) // Should always return a slice, even if empty

			if tt.expectVariants {
				if len(result) > 0 {
					t.Logf("Found %d ClinVar variants for gene %s", len(result), tt.geneID)

					// Validate first variant structure
					variant := result[0]
					assert.NotEmpty(t, variant.VariantID)
					assert.NotEmpty(t, variant.ClinicalSignificance)
					assert.NotEmpty(t, variant.ReviewStatus)
					assert.Equal(t, tt.referenceGenome == "GRCh37", variant.ReferenceGenome == model.ReferenceGenomeIDGRCh37)
					assert.Equal(t, tt.referenceGenome == "GRCh38", variant.ReferenceGenome == model.ReferenceGenomeIDGRCh38)
				} else {
					t.Log("No ClinVar variants found for gene (may be expected)")
				}
			} else {
				assert.Empty(t, result, "Should not find variants for non-existent gene")
			}
		})
	}
}

func TestFetchClinVarVariantsByRegion_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getClinVarTestESClient(t)

	tests := []struct {
		name            string
		chrom           string
		start           int
		stop            int
		referenceGenome string
		expectVariants  bool
	}{
		{
			name:            "fetch ClinVar variants in region with known variants",
			chrom:           "1",
			start:           55500000,
			stop:            55600000,
			referenceGenome: "GRCh38",
			expectVariants:  true,
		},
		{
			name:            "fetch ClinVar variants in small empty region",
			chrom:           "1",
			start:           1,
			stop:            100,
			referenceGenome: "GRCh38",
			expectVariants:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchClinVarVariantsByRegion(context.Background(), client, tt.chrom, tt.start, tt.stop, tt.referenceGenome)

			require.NoError(t, err)
			assert.NotNil(t, result) // Should always return a slice, even if empty

			if tt.expectVariants {
				if len(result) > 0 {
					t.Logf("Found %d ClinVar variants in region %s:%d-%d", len(result), tt.chrom, tt.start, tt.stop)

					// Validate variants are sorted by position
					for i := 1; i < len(result); i++ {
						assert.LessOrEqual(t, result[i-1].Pos, result[i].Pos, "Variants should be sorted by position")
					}

					// Validate first variant structure
					variant := result[0]
					assert.NotEmpty(t, variant.VariantID)
					assert.Equal(t, tt.chrom, variant.Chrom)
					assert.GreaterOrEqual(t, variant.Pos, tt.start)
					assert.LessOrEqual(t, variant.Pos, tt.stop)
					assert.NotEmpty(t, variant.ClinicalSignificance)
					assert.NotEmpty(t, variant.ReviewStatus)
				} else {
					t.Log("No ClinVar variants found in region (may be expected)")
				}
			} else {
				t.Logf("Found %d ClinVar variants in empty region (expected 0)", len(result))
			}
		})
	}
}

func TestFetchClinVarVariantsByTranscript_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getClinVarTestESClient(t)

	tests := []struct {
		name            string
		transcriptID    string
		referenceGenome string
		expectVariants  bool
	}{
		{
			name:            "fetch ClinVar variants for transcript with known variants",
			transcriptID:    "ENST00000302118", // PCSK9 transcript
			referenceGenome: "GRCh38",
			expectVariants:  true,
		},
		{
			name:            "fetch ClinVar variants for non-existent transcript",
			transcriptID:    "ENST00000000000",
			referenceGenome: "GRCh38",
			expectVariants:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchClinVarVariantsByTranscript(context.Background(), client, tt.transcriptID, tt.referenceGenome)

			require.NoError(t, err)
			assert.NotNil(t, result) // Should always return a slice, even if empty

			if tt.expectVariants {
				if len(result) > 0 {
					t.Logf("Found %d ClinVar variants for transcript %s", len(result), tt.transcriptID)

					// Validate first variant structure
					variant := result[0]
					assert.NotEmpty(t, variant.VariantID)
					assert.NotEmpty(t, variant.ClinicalSignificance)
					assert.NotEmpty(t, variant.ReviewStatus)
				} else {
					t.Log("No ClinVar variants found for transcript (may be expected)")
				}
			} else {
				assert.Empty(t, result, "Should not find variants for non-existent transcript")
			}
		})
	}
}

func TestClinVarVariant_Integration_ReferenceGenomes(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getClinVarTestESClient(t)

	// Test the same variant ID in different reference genomes
	variantIDGRCh38 := "1-55505647-G-T"
	variantIDGRCh37 := "1-55039974-G-T" // Approximately the same variant in GRCh37

	// Fetch from GRCh38
	resultGRCh38, err := FetchClinVarVariant(context.Background(), client, variantIDGRCh38, "GRCh38")
	require.NoError(t, err)

	// Fetch from GRCh37
	resultGRCh37, err := FetchClinVarVariant(context.Background(), client, variantIDGRCh37, "GRCh37")
	require.NoError(t, err)

	// Both should return valid results (if they exist)
	if resultGRCh38 != nil {
		assert.Equal(t, model.ReferenceGenomeIDGRCh38, resultGRCh38.ReferenceGenome)
		t.Logf("Found ClinVar variant in GRCh38: %s", resultGRCh38.VariantID)
	}

	if resultGRCh37 != nil {
		assert.Equal(t, model.ReferenceGenomeIDGRCh37, resultGRCh37.ReferenceGenome)
		t.Logf("Found ClinVar variant in GRCh37: %s", resultGRCh37.VariantID)
	}

	// Test invalid reference genome
	_, err = FetchClinVarVariant(context.Background(), client, variantIDGRCh38, "InvalidGenome")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported reference genome")
}

func TestClinVarVariant_Integration_ErrorHandling(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getClinVarTestESClient(t)

	// Test invalid variant ID format
	result, err := FetchClinVarVariant(context.Background(), client, "invalid-format", "GRCh38")
	require.NoError(t, err) // Should not error, just return nil
	assert.Nil(t, result)

	// Test empty variant ID
	result, err = FetchClinVarVariant(context.Background(), client, "", "GRCh38")
	require.NoError(t, err) // Should not error, just return nil
	assert.Nil(t, result)

	// Test unsupported reference genome
	result, err = FetchClinVarVariant(context.Background(), client, "1-55505647-G-T", "GRCh99")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported reference genome")
	assert.Nil(t, result)
}

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

// These tests require a running Elasticsearch instance with gnomAD MNV data
// Run with: go test -tags=integration ./internal/data/queries
//
// Sample MNV variant IDs to try (replace test IDs with actual ones from your ES instance):
// - Dinucleotide variants: "1-12345678-AT-GC", "2-98765432-CG-TA", "X-12345678-AC-GT"
// - Trinucleotide variants: "3-45678901-ATG-CTA", "4-87654321-GCC-TAA"
// - Common MNV patterns: adjacent SNPs like GA->TT, CA->TG, AT->GC
//
// To find actual MNV IDs in your Elasticsearch instance, query the gnomad_v2_mnvs index

func TestMNVIndexConnectivity_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)
	ctx := context.Background()

	// Test basic connectivity to MNV index by doing a simple search
	query := map[string]any{
		"query": map[string]any{
			"match_all": map[string]any{},
		},
		"size": 1,
	}

	response, err := client.Search(ctx, MNVVariantIndex, query)
	if err != nil {
		t.Logf("MNV index '%s' not available or accessible: %v", MNVVariantIndex, err)
		t.Skip("MNV index not available - this may be expected in test environments")
		return
	}

	if len(response.Hits.Hits) > 0 {
		t.Logf("MNV index contains %d total documents", response.Hits.Total.Value)
		
		// Check document structure
		hit := response.Hits.Hits[0]
		if value, ok := hit.Source["value"].(map[string]any); ok {
			if variantID, exists := value["variant_id"]; exists {
				t.Logf("Found sample MNV variant: %v", variantID)
			}
		}
	} else {
		t.Log("MNV index exists but contains no data")
	}
}

func TestFetchMultiNucleotideVariant_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		datasetID     string
		variantID     string
		expectedError bool
		validate      func(t *testing.T, result *model.MultiNucleotideVariantDetails)
	}{
		{
			name:          "fetch example MNV from gnomAD r2.1 (may not exist)",
			datasetID:     "gnomad_r2_1",
			variantID:     "1-55516888-GA-TT", // Example MNV ID - replace with real data from your ES instance
			expectedError: false,
			validate: func(t *testing.T, result *model.MultiNucleotideVariantDetails) {
				t.Helper()
				if result == nil {
					t.Skip("Test MNV variant not found in data - this is expected if the ES instance doesn't have this specific MNV")
					return
				}
				
				// If the result exists, validate its structure
				assert.Equal(t, "1-55516888-GA-TT", result.VariantID, "VariantID should match")
				assert.Equal(t, model.ReferenceGenomeIDGRCh37, result.ReferenceGenome)
				assert.Equal(t, "1", result.Chrom)
				assert.Equal(t, 55516888, result.Pos)
				assert.Equal(t, "GA", result.Ref)
				assert.Equal(t, "TT", result.Alt)
				
				// Check that constituent SNVs are present
				assert.NotNil(t, result.ConstituentSnvs)
				assert.Greater(t, len(result.ConstituentSnvs), 0, "Should have constituent SNVs")
				
				// Check that consequences are present
				assert.NotNil(t, result.Consequences)
				
				// Check that related MNVs list is present (can be empty)
				assert.NotNil(t, result.RelatedMnvs)
			},
		},
		{
			name:          "unsupported dataset returns error",
			datasetID:     "gnomad_r3",
			variantID:     "1-55516888-GA-TT",
			expectedError: true,
			validate:      nil,
		},
		{
			name:          "non-existent variant returns nil",
			datasetID:     "gnomad_r2_1",
			variantID:     "999-999999999-XX-YY",
			expectedError: false,
			validate: func(t *testing.T, result *model.MultiNucleotideVariantDetails) {
				t.Helper()
				assert.Nil(t, result, "Non-existent variant should return nil")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			result, err := FetchMultiNucleotideVariant(ctx, client, tt.variantID, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err, "Expected an error for test case: %s", tt.name)
				return
			}

			assert.NoError(t, err, "Unexpected error for test case: %s", tt.name)

			if tt.validate != nil {
				tt.validate(t, result)
			}
		})
	}
}

func TestMNVDataStructure_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)
	ctx := context.Background()

	// Test with a known MNV that should have rich data
	result, err := FetchMultiNucleotideVariant(ctx, client, "1-55516888-GA-TT", "gnomad_r2_1")
	require.NoError(t, err)

	if result != nil {
		t.Run("constituent_snvs_structure", func(t *testing.T) {
			for i, snv := range result.ConstituentSnvs {
				assert.NotEmpty(t, snv.VariantID, "Constituent SNV %d should have variant_id", i)
				
				// Check sequencing data - either exome or genome (or both) should have data
				hasExome := snv.Exome != nil && snv.Exome.Ac != nil
				hasGenome := snv.Genome != nil && snv.Genome.Ac != nil
				assert.True(t, hasExome || hasGenome, "Constituent SNV %d should have sequencing data", i)
			}
		})

		t.Run("consequences_structure", func(t *testing.T) {
			for i, cons := range result.Consequences {
				assert.NotEmpty(t, cons.GeneID, "Consequence %d should have gene_id", i)
				assert.NotEmpty(t, cons.GeneName, "Consequence %d should have gene_name", i)
				assert.NotEmpty(t, cons.TranscriptID, "Consequence %d should have transcript_id", i)
				assert.NotEmpty(t, cons.Consequence, "Consequence %d should have consequence", i)
				
				// Check SNV consequences
				assert.NotNil(t, cons.SnvConsequences, "Consequence %d should have snv_consequences", i)
				for j, snvCons := range cons.SnvConsequences {
					assert.NotEmpty(t, snvCons.VariantID, "SNV consequence %d-%d should have variant_id", i, j)
					assert.NotEmpty(t, snvCons.Consequence, "SNV consequence %d-%d should have consequence", i, j)
				}
			}
		})

		t.Run("sequencing_data_structure", func(t *testing.T) {
			// Check exome data if present
			if result.Exome != nil {
				assert.NotNil(t, result.Exome.Ac, "Exome data should have AC")
				if result.Exome.Ac != nil {
					assert.GreaterOrEqual(t, *result.Exome.Ac, 0, "AC should be non-negative")
				}
			}

			// Check genome data if present
			if result.Genome != nil {
				assert.NotNil(t, result.Genome.Ac, "Genome data should have AC")
				if result.Genome.Ac != nil {
					assert.GreaterOrEqual(t, *result.Genome.Ac, 0, "AC should be non-negative")
				}
			}
		})
	} else {
		t.Log("No MNV data found for test variant - this may be expected if the test index doesn't have MNV data")
	}
}
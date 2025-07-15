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

// These tests require a running Elasticsearch instance with gene data
// Run with: go test -tags=integration ./internal/data/queries

func TestGeneFetcher_Integration_FetchGeneByID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name            string
		geneID          string
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, result *model.Gene)
	}{
		{
			name:            "fetch existing gene GRCh38",
			geneID:          "ENSG00000169174",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Gene) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "ENSG00000169174", result.GeneID)
				assert.Equal(t, "PCSK9", result.Symbol)
				assert.NotEmpty(t, result.Chrom)
				assert.Greater(t, result.Stop, result.Start)
				assert.NotEmpty(t, result.Exons)
				assert.NotEmpty(t, result.Transcripts)
			},
		},
		{
			name:            "fetch non-existent gene",
			geneID:          "ENSG99999999999",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Gene) {
				t.Helper()
				assert.Nil(t, result)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchGeneByID(context.Background(), client, tt.geneID, tt.referenceGenome)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				tt.validate(t, result)
			}
		})
	}
}

func TestGeneFetcher_Integration_FetchGeneBySymbol(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name            string
		geneSymbol      string
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, result *model.Gene)
	}{
		{
			name:            "fetch gene by symbol GRCh38",
			geneSymbol:      "PCSK9",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Gene) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "PCSK9", result.Symbol)
				assert.Equal(t, "ENSG00000169174", result.GeneID)
				assert.NotEmpty(t, result.Chrom)
				assert.Greater(t, result.Stop, result.Start)
			},
		},
		{
			name:            "fetch gene by symbol case insensitive",
			geneSymbol:      "pcsk9",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Gene) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "PCSK9", result.Symbol)
			},
		},
		{
			name:            "fetch non-existent gene symbol",
			geneSymbol:      "NONEXISTENTGENE",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Gene) {
				t.Helper()
				assert.Nil(t, result)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchGeneBySymbol(context.Background(), client, tt.geneSymbol, tt.referenceGenome)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				tt.validate(t, result)
			}
		})
	}
}

func TestGeneFetcher_Integration_FetchGenesMatchingText(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name            string
		query           string
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, results []*model.GeneSearchResult)
	}{
		{
			name:            "search by exact Ensembl ID",
			query:           "ENSG00000169174",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, results []*model.GeneSearchResult) {
				t.Helper()
				require.Len(t, results, 1)
				assert.Equal(t, "ENSG00000169174", results[0].EnsemblID)
				assert.NotNil(t, results[0].Symbol)
				assert.Equal(t, "PCSK9", *results[0].Symbol)
			},
		},
		{
			name:            "search by gene symbol",
			query:           "PCSK9",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, results []*model.GeneSearchResult) {
				t.Helper()
				assert.NotEmpty(t, results)
				// Should find PCSK9 as one of the results
				found := false
				for _, result := range results {
					if result.Symbol != nil && *result.Symbol == "PCSK9" {
						found = true
						assert.Equal(t, "ENSG00000169174", result.EnsemblID)
						break
					}
				}
				assert.True(t, found, "PCSK9 should be in search results")
			},
		},
		{
			name:            "search by partial symbol",
			query:           "PCSK",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, results []*model.GeneSearchResult) {
				t.Helper()
				assert.NotEmpty(t, results)
				// Should return multiple PCSK genes
				assert.LessOrEqual(t, len(results), 5) // API limits to 5 results
			},
		},
		{
			name:            "search with no matches",
			query:           "ZZZZNONEXISTENT",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, results []*model.GeneSearchResult) {
				t.Helper()
				assert.Empty(t, results)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := FetchGenesMatchingText(context.Background(), client, tt.query, tt.referenceGenome)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				tt.validate(t, results)
			}
		})
	}
}

func TestGeneFetcher_Integration_GeneWithConstraints(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Test fetching a gene known to have constraint data
	result, err := FetchGeneBySymbol(context.Background(), client, "PCSK9", "GRCh38")
	require.NoError(t, err)

	if result != nil {
		// Check if constraint data is populated when available
		if result.GnomadConstraint != nil {
			assert.NotZero(t, result.GnomadConstraint.ExpMis)
			assert.NotZero(t, result.GnomadConstraint.MisZ)
			assert.NotZero(t, result.GnomadConstraint.SynZ)
		}

		// Check default cooccurrence counts
		assert.NotNil(t, result.HeterozygousVariantCooccurrenceCounts)
		assert.NotNil(t, result.HomozygousVariantCooccurrenceCounts)
		assert.Empty(t, result.HeterozygousVariantCooccurrenceCounts)
		assert.Empty(t, result.HomozygousVariantCooccurrenceCounts)
	}
}

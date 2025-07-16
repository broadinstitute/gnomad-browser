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

// These tests require a running Elasticsearch instance with variant data
// Run with: go test -tags=integration ./internal/data/queries

func TestSearchQueries_Integration_FetchMatchingVariants(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Initialize the dataset fetchers
	InitializeFetchers()

	client := getTestESClient(t)

	tests := []struct {
		name          string
		query         string
		datasetID     string
		expectedError bool
		validate      func(t *testing.T, results []*model.VariantSearchResult)
	}{
		{
			name:          "search by variant ID - gnomAD v4",
			query:         "1-55039974-G-T",
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, results []*model.VariantSearchResult) {
				t.Helper()
				// Note: variant may or may not exist in test data, so we just check no error
				assert.NotNil(t, results)
				if len(results) > 0 {
					assert.NotEmpty(t, results[0].VariantID)
				}
			},
		},
		{
			name:          "search by rsID - gnomAD v4",
			query:         "rs3094315",
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, results []*model.VariantSearchResult) {
				t.Helper()
				// Note: rsID may or may not exist in test data, so we just check no error
				assert.NotNil(t, results)
				if len(results) > 0 {
					assert.NotEmpty(t, results[0].VariantID)
				}
			},
		},
		{
			name:          "search by variant ID - gnomAD v3",
			query:         "1-55039974-G-T",
			datasetID:     "gnomad_r3_genomes",
			expectedError: false,
			validate: func(t *testing.T, results []*model.VariantSearchResult) {
				t.Helper()
				// Note: variant may or may not exist in v3, so we just check no error
				assert.NotNil(t, results)
			},
		},
		{
			name:          "search by variant ID - gnomAD v2",
			query:         "1-55039974-G-T",
			datasetID:     "gnomad_r2_1",
			expectedError: false,
			validate: func(t *testing.T, results []*model.VariantSearchResult) {
				t.Helper()
				// Note: variant may or may not exist in v2, so we just check no error
				assert.NotNil(t, results)
			},
		},
		{
			name:          "search by variant ID - ExAC",
			query:         "1-55039974-G-T",
			datasetID:     "exac",
			expectedError: false,
			validate: func(t *testing.T, results []*model.VariantSearchResult) {
				t.Helper()
				// Note: variant may or may not exist in ExAC, so we just check no error
				assert.NotNil(t, results)
			},
		},
		{
			name:          "search with non-existent variant",
			query:         "1-999999999-AAAA-TTTT",
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, results []*model.VariantSearchResult) {
				t.Helper()
				assert.Empty(t, results)
			},
		},
		{
			name:          "search with unsupported dataset",
			query:         "1-55039974-G-T",
			datasetID:     "unsupported_dataset",
			expectedError: true,
			validate: func(t *testing.T, results []*model.VariantSearchResult) {
				t.Helper()
				// Should not reach here due to expected error
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := FetchMatchingVariants(context.Background(), client, tt.query, tt.datasetID)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				tt.validate(t, results)
			}
		})
	}
}

func TestSearchQueries_Integration_DetectQueryType(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		expected string
	}{
		{
			name:     "variant ID format",
			query:    "1-55039974-G-T",
			expected: "variant_id",
		},
		{
			name:     "rsID format",
			query:    "rs3094315",
			expected: "rsid",
		},
		{
			name:     "rsID format uppercase",
			query:    "RS3094315",
			expected: "rsid",
		},
		{
			name:     "ClinVar format",
			query:    "clinvar_123456",
			expected: "caid",
		},
		{
			name:     "unknown format defaults to variant_id",
			query:    "some_other_format",
			expected: "variant_id",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detectQueryType(tt.query)
			assert.Equal(t, tt.expected, result)
		})
	}
}

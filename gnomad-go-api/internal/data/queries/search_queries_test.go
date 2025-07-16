package queries

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDetectQueryType(t *testing.T) {
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
			name:     "variant ID format with chr prefix",
			query:    "chr1-55039974-G-T",
			expected: "variant_id",
		},
		{
			name:     "rsID format lowercase",
			query:    "rs3094315",
			expected: "rsid",
		},
		{
			name:     "rsID format uppercase",
			query:    "RS3094315",
			expected: "rsid",
		},
		{
			name:     "rsID format with whitespace",
			query:    "  rs3094315  ",
			expected: "rsid",
		},
		{
			name:     "ClinVar format with clinvar",
			query:    "clinvar_123456",
			expected: "caid",
		},
		{
			name:     "ClinVar format with caid",
			query:    "caid_123456",
			expected: "caid",
		},
		{
			name:     "unknown format defaults to variant_id",
			query:    "some_other_format",
			expected: "variant_id",
		},
		{
			name:     "empty query defaults to variant_id",
			query:    "",
			expected: "variant_id",
		},
		{
			name:     "whitespace only query defaults to variant_id",
			query:    "   ",
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

func TestGetIndexForFetcher(t *testing.T) {
	// Initialize the dataset fetchers
	InitializeFetchers()

	tests := []struct {
		name        string
		datasetID   string
		expectedIdx string
	}{
		{
			name:        "gnomAD v4 all",
			datasetID:   "gnomad_r4",
			expectedIdx: "gnomad_v4_variants",
		},
		{
			name:        "gnomAD v4 non-UKB",
			datasetID:   "gnomad_r4_non_ukb",
			expectedIdx: "gnomad_v4_variants",
		},
		{
			name:        "gnomAD v3 genomes",
			datasetID:   "gnomad_r3_genomes",
			expectedIdx: "gnomad_v3_variants",
		},
		{
			name:        "gnomAD v2",
			datasetID:   "gnomad_r2_1",
			expectedIdx: "gnomad_v2_variants",
		},
		{
			name:        "ExAC",
			datasetID:   "exac",
			expectedIdx: "exac_variants",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fetcher, ok := datasetFetchers[tt.datasetID]
			assert.True(t, ok, "Dataset fetcher should exist for %s", tt.datasetID)

			if ok {
				result := getIndexForFetcher(fetcher)
				assert.Equal(t, tt.expectedIdx, result)
			}
		})
	}
}

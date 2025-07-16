//go:build integration
// +build integration

package queries

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests require a running Elasticsearch instance with liftover data
// Run with: go test -tags=integration ./internal/data/queries

func TestFetchLiftover_Integration_BySourceVariant(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name               string
		sourceVariantID    *string
		liftoverVariantID  *string
		referenceGenome    string
		expectedError      bool
		expectedMinResults int // Minimum number of results expected
	}{
		{
			name:               "fetch liftover by source variant - GRCh37",
			sourceVariantID:    stringPtr("1-55516888-G-GA"),
			liftoverVariantID:  nil,
			referenceGenome:    "GRCh37",
			expectedError:      false,
			expectedMinResults: 0,
		},
		{
			name:               "fetch liftover by target variant - GRCh38",
			sourceVariantID:    nil,
			liftoverVariantID:  stringPtr("1-55051499-G-GA"),
			referenceGenome:    "GRCh38",
			expectedError:      false,
			expectedMinResults: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()

			result, err := FetchLiftover(ctx, client, tt.sourceVariantID, tt.liftoverVariantID, tt.referenceGenome)

			if tt.expectedError {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, result)
			assert.GreaterOrEqual(t, len(result), tt.expectedMinResults)

			// If we have results, validate the structure
			if len(result) > 0 {
				for _, liftoverResult := range result {
					assert.NotNil(t, liftoverResult.Source)
					assert.NotNil(t, liftoverResult.Liftover)
					assert.NotEmpty(t, liftoverResult.Source.VariantID)
					assert.NotEmpty(t, liftoverResult.Liftover.VariantID)
					assert.NotNil(t, liftoverResult.Source.ReferenceGenome)
					assert.NotNil(t, liftoverResult.Liftover.ReferenceGenome)
					assert.NotNil(t, liftoverResult.Datasets)
				}
			}
		})
	}
}

func TestFetchLiftover_Integration_ErrorCases(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name              string
		sourceVariantID   *string
		liftoverVariantID *string
		referenceGenome   string
		expectedError     bool
		expectedErrorMsg  string
	}{
		{
			name:              "no variant IDs provided",
			sourceVariantID:   nil,
			liftoverVariantID: nil,
			referenceGenome:   "GRCh37",
			expectedError:     true,
			expectedErrorMsg:  "one of source_variant_id or liftover_variant_id is required",
		},
		{
			name:              "both variant IDs provided",
			sourceVariantID:   stringPtr("1-55516888-G-GA"),
			liftoverVariantID: stringPtr("1-55051499-G-GA"),
			referenceGenome:   "GRCh37",
			expectedError:     true,
			expectedErrorMsg:  "only one of source_variant_id or liftover_variant_id can be provided",
		},
		{
			name:              "invalid source variant ID",
			sourceVariantID:   stringPtr("invalid-variant-id"),
			liftoverVariantID: nil,
			referenceGenome:   "GRCh37",
			expectedError:     true,
			expectedErrorMsg:  "invalid variant ID",
		},
		{
			name:              "invalid liftover variant ID",
			sourceVariantID:   nil,
			liftoverVariantID: stringPtr("invalid-variant-id"),
			referenceGenome:   "GRCh38",
			expectedError:     true,
			expectedErrorMsg:  "invalid variant ID",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()

			result, err := FetchLiftover(ctx, client, tt.sourceVariantID, tt.liftoverVariantID, tt.referenceGenome)

			if tt.expectedError {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedErrorMsg)
				assert.Nil(t, result)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, result)
		})
	}
}


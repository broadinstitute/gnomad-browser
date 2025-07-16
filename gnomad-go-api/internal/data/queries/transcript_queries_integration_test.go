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

// These tests require a running Elasticsearch instance with transcript data
// Run with: go test -tags=integration ./internal/data/queries

func TestTranscriptFetcher_Integration_FetchTranscript(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name            string
		transcriptID    string
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, result *model.Transcript)
	}{
		{
			name:            "fetch existing transcript GRCh38",
			transcriptID:    "ENST00000302118",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Transcript) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "ENST00000302118", result.TranscriptID)
				assert.NotEmpty(t, result.TranscriptVersion)
				assert.NotEmpty(t, result.Chrom)
				assert.Greater(t, result.Stop, result.Start)
				assert.NotEmpty(t, result.Exons)
				assert.NotEmpty(t, result.GeneID)
				assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)

				// Check that gene is populated
				if result.Gene != nil {
					assert.NotEmpty(t, result.Gene.GeneID)
					assert.NotEmpty(t, result.Gene.Symbol)
				}
			},
		},
		{
			name:            "fetch existing transcript GRCh37",
			transcriptID:    "ENST00000302118",
			referenceGenome: "GRCh37",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Transcript) {
				t.Helper()
				if result != nil {
					assert.Equal(t, "ENST00000302118", result.TranscriptID)
					assert.Equal(t, model.ReferenceGenomeIDGRCh37, result.ReferenceGenome)
				}
			},
		},
		{
			name:            "fetch non-existent transcript",
			transcriptID:    "ENST99999999999",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Transcript) {
				t.Helper()
				assert.Nil(t, result)
			},
		},
		{
			name:            "invalid reference genome",
			transcriptID:    "ENST00000302118",
			referenceGenome: "invalid",
			expectedError:   true,
			validate: func(t *testing.T, result *model.Transcript) {
				t.Helper()
				// Should not reach here if error expected
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchTranscript(context.Background(), client, tt.transcriptID, tt.referenceGenome)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				tt.validate(t, result)
			}
		})
	}
}

func TestTranscriptFetcher_Integration_TranscriptWithConstraints(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Test fetching a transcript known to have constraint data
	result, err := FetchTranscript(context.Background(), client, "ENST00000302118", "GRCh38")
	require.NoError(t, err)

	if result != nil {
		// Check if constraint data is populated when available
		if result.GnomadConstraint != nil {
			assert.NotZero(t, result.GnomadConstraint.ExpMis)
			assert.NotZero(t, result.GnomadConstraint.MisZ)
			assert.NotZero(t, result.GnomadConstraint.SynZ)
		}

		// Check ExAC constraint if available (GRCh37 specific)
		if result.ExacConstraint != nil {
			assert.NotZero(t, result.ExacConstraint.SynZ)
			assert.NotZero(t, result.ExacConstraint.MisZ)
		}

		// Check GTEx tissue expression if available (GRCh37 specific)
		if result.GtexTissueExpression != nil {
			assert.NotEmpty(t, result.GtexTissueExpression)
			for _, tissue := range result.GtexTissueExpression {
				assert.NotEmpty(t, tissue.Tissue)
				assert.GreaterOrEqual(t, tissue.Value, 0.0)
			}
		}
	}
}

func TestTranscriptFetcher_Integration_TranscriptStructure(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Test transcript structure validation
	result, err := FetchTranscript(context.Background(), client, "ENST00000302118", "GRCh38")
	require.NoError(t, err)

	if result != nil {
		// Validate exon structure
		assert.NotEmpty(t, result.Exons)
		for _, exon := range result.Exons {
			assert.NotEmpty(t, exon.FeatureType)
			assert.Greater(t, exon.Stop, exon.Start)
		}

		// Validate gene structure if present
		if result.Gene != nil {
			assert.Equal(t, result.GeneID, result.Gene.GeneID)
			assert.NotEmpty(t, result.Gene.Symbol)
			assert.NotEmpty(t, result.Gene.Exons)
			assert.NotEmpty(t, result.Gene.Transcripts)

			// Validate that this transcript is in the gene's transcript list
			found := false
			for _, transcript := range result.Gene.Transcripts {
				if transcript.TranscriptID == result.TranscriptID {
					found = true
					break
				}
			}
			assert.True(t, found, "Transcript should be found in its parent gene's transcript list")
		}
	}
}

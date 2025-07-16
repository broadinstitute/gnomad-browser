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

// These tests require a running Elasticsearch instance with tissue expression data
// Run with: go test -tags=integration ./internal/data/queries

func TestTissueExpressionFetcher_Integration_FetchGtexTissueExpression(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name            string
		transcriptID    string
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, result []*model.GtexTissue)
	}{
		{
			name:            "fetch GTEx for existing transcript GRCh37",
			transcriptID:    "ENST00000302118",
			referenceGenome: "GRCh37",
			expectedError:   false,
			validate: func(t *testing.T, result []*model.GtexTissue) {
				t.Helper()
				// GTEx data should be available for GRCh37
				if result != nil {
					assert.NotEmpty(t, result)
					for _, tissue := range result {
						assert.NotEmpty(t, tissue.Tissue)
						assert.GreaterOrEqual(t, tissue.Value, 0.0)
						
						// Check for expected tissue names (should be snake_case)
						assert.Regexp(t, `^[a-z][a-z0-9_]*$`, tissue.Tissue)
					}
				}
			},
		},
		{
			name:            "no GTEx for GRCh38",
			transcriptID:    "ENST00000302118",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result []*model.GtexTissue) {
				t.Helper()
				// GTEx tissue expression is only available for GRCh37
				assert.Nil(t, result)
			},
		},
		{
			name:            "fetch non-existent transcript",
			transcriptID:    "ENST99999999999",
			referenceGenome: "GRCh37",
			expectedError:   false,
			validate: func(t *testing.T, result []*model.GtexTissue) {
				t.Helper()
				assert.Nil(t, result)
			},
		},
		{
			name:            "invalid reference genome",
			transcriptID:    "ENST00000302118",
			referenceGenome: "invalid",
			expectedError:   true,
			validate: func(t *testing.T, result []*model.GtexTissue) {
				t.Helper()
				// Should not reach here if error expected
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchGtexTissueExpression(context.Background(), client, tt.transcriptID, tt.referenceGenome)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				tt.validate(t, result)
			}
		})
	}
}

func TestTissueExpressionFetcher_Integration_FetchPextData(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name            string
		geneID          string
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, result *model.Pext)
	}{
		{
			name:            "fetch Pext for existing gene GRCh38",
			geneID:          "ENSG00000186092", // Known gene with Pext data
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Pext) {
				t.Helper()
				if result != nil {
					assert.NotEmpty(t, result.Regions)
					assert.NotNil(t, result.Flags)
					
					for _, region := range result.Regions {
						assert.Greater(t, region.Stop, region.Start)
						assert.GreaterOrEqual(t, region.Mean, 0.0)
						assert.LessOrEqual(t, region.Mean, 1.0) // Pext values should be between 0 and 1
						
						for _, tissue := range region.Tissues {
							if tissue.Tissue != nil {
								assert.NotEmpty(t, *tissue.Tissue)
							}
							if tissue.Value != nil {
								assert.GreaterOrEqual(t, *tissue.Value, 0.0)
								assert.LessOrEqual(t, *tissue.Value, 1.0)
							}
						}
					}
				}
			},
		},
		{
			name:            "fetch Pext for existing gene GRCh37",
			geneID:          "ENSG00000186092",
			referenceGenome: "GRCh37",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Pext) {
				t.Helper()
				// Pext data should be available for both reference genomes
				if result != nil {
					assert.NotEmpty(t, result.Regions)
				}
			},
		},
		{
			name:            "fetch non-existent gene",
			geneID:          "ENSG99999999999",
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Pext) {
				t.Helper()
				assert.Nil(t, result)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchPextData(context.Background(), client, tt.geneID, tt.referenceGenome)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				tt.validate(t, result)
			}
		})
	}
}

func TestTissueExpressionFetcher_Integration_FetchPextRegion(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name            string
		chrom           string
		start           int
		stop            int
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, result []*model.PextRegion)
	}{
		{
			name:            "fetch Pext regions for gene-rich region",
			chrom:           "17",
			start:           43044295, // BRCA1 region
			stop:            43125364,
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result []*model.PextRegion) {
				t.Helper()
				// Query region coordinates for validation
				queryStart := 43044295
				queryStop := 43125364
				
				// Should find some Pext regions in this gene-rich area
				if result != nil && len(result) > 0 {
					for _, region := range result {
						assert.Greater(t, region.Stop, region.Start)
						assert.GreaterOrEqual(t, region.Mean, 0.0)
						assert.LessOrEqual(t, region.Mean, 1.0)
						
						// Check that the region overlaps with our query region
						assert.True(t, region.Start <= queryStop && region.Stop >= queryStart,
							"Pext region should overlap with query region")
					}
				}
			},
		},
		{
			name:            "fetch Pext regions for empty region",
			chrom:           "MT", // Mitochondrial chromosome - unlikely to have Pext data
			start:           1,
			stop:            100,
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result []*model.PextRegion) {
				t.Helper()
				// Mitochondrial regions should not have Pext data
				assert.Empty(t, result)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchPextRegion(context.Background(), client, tt.chrom, tt.start, tt.stop, tt.referenceGenome)

			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				tt.validate(t, result)
			}
		})
	}
}

func TestTissueExpressionFetcher_Integration_TissueNames(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Test that tissue names follow expected conventions
	result, err := FetchGtexTissueExpression(context.Background(), client, "ENST00000302118", "GRCh37")
	require.NoError(t, err)

	if result != nil && len(result) > 0 {
		// Check for common GTEx tissue names
		tissueNames := make(map[string]bool)
		for _, tissue := range result {
			tissueNames[tissue.Tissue] = true
		}

		// Some expected tissue types (based on GTEx v8)
		expectedTissues := []string{
			"whole_blood",
			"muscle_skeletal", 
			"lung",
			"skin_sun_exposed_lower_leg",
			"adipose_subcutaneous",
			"artery_tibial",
			"nerve_tibial",
			"thyroid",
		}

		// Check that at least some expected tissues are present
		foundExpected := 0
		for _, expectedTissue := range expectedTissues {
			if tissueNames[expectedTissue] {
				foundExpected++
			}
		}

		// Should find at least a few common tissues
		assert.Greater(t, foundExpected, 0, "Should find at least some common GTEx tissues")

		// All tissue names should follow snake_case convention
		for tissueName := range tissueNames {
			assert.Regexp(t, `^[a-z][a-z0-9_]*$`, tissueName, 
				"Tissue name should be in snake_case format: %s", tissueName)
		}
	}
}
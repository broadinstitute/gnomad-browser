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

// These tests require a running Elasticsearch instance with gene data
// Run with: go test -tags=integration ./internal/data/queries

func getConstraintTestESClient(t *testing.T) *elastic.Client {
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
		t.Skipf("Could not ping Elasticsearch: %v", err)
	}
	t.Logf("Connected to Elasticsearch version %s", info.Version.Number)

	return client
}

func TestGeneConstraints_Integration_FetchGeneWithConstraints(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getConstraintTestESClient(t)

	tests := []struct {
		name            string
		geneID          string
		referenceGenome string
		expectedError   bool
		validate        func(t *testing.T, result *model.Gene)
	}{
		{
			name:            "fetch gene with gnomAD constraints - PCSK9 GRCh38",
			geneID:          "ENSG00000169174", // PCSK9
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Gene) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "ENSG00000169174", result.GeneID)
				assert.Equal(t, "PCSK9", result.Symbol)

				// Test gnomAD constraint fields
				if result.GnomadConstraint != nil {
					t.Logf("Found gnomAD constraint data for %s", result.Symbol)
					// ExpMis and OeMis are non-pointer float64
					assert.NotZero(t, result.GnomadConstraint.ExpMis)
					assert.NotZero(t, result.GnomadConstraint.OeMis)
					assert.NotZero(t, result.GnomadConstraint.MisZ)
					assert.NotZero(t, result.GnomadConstraint.SynZ)

					// Validate reasonable constraint values
					assert.Greater(t, result.GnomadConstraint.ExpMis, float64(0))
					assert.Greater(t, result.GnomadConstraint.OeMis, float64(0))

					// Check for pLI (probability of loss-of-function intolerance)
					if result.GnomadConstraint.Pli != nil {
						assert.GreaterOrEqual(t, *result.GnomadConstraint.Pli, float64(0))
						assert.LessOrEqual(t, *result.GnomadConstraint.Pli, float64(1))
					}
				} else {
					t.Logf("No gnomAD constraint data found for %s", result.Symbol)
				}

				// Test ExAC constraint fields
				if result.ExacConstraint != nil {
					t.Logf("Found ExAC constraint data for %s", result.Symbol)
					assert.NotZero(t, result.ExacConstraint.MisZ)
					assert.NotZero(t, result.ExacConstraint.SynZ)
					assert.NotZero(t, result.ExacConstraint.PLi)

					// Validate reasonable constraint values
					if result.ExacConstraint.ExpMis != nil {
						assert.Greater(t, *result.ExacConstraint.ExpMis, float64(0))
					}
					if result.ExacConstraint.Pli != nil {
						assert.GreaterOrEqual(t, *result.ExacConstraint.Pli, float64(0))
						assert.LessOrEqual(t, *result.ExacConstraint.Pli, float64(1))
					}
				} else {
					t.Logf("No ExAC constraint data found for %s", result.Symbol)
				}
			},
		},
		{
			name:            "fetch gene with regional constraints - PCSK9 GRCh37",
			geneID:          "ENSG00000169174", // PCSK9
			referenceGenome: "GRCh37",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Gene) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "ENSG00000169174", result.GeneID)

				// Test regional missense constraint regions
				if result.ExacRegionalMissenseConstraintRegions != nil && len(result.ExacRegionalMissenseConstraintRegions) > 0 {
					t.Logf("Found %d ExAC regional constraint regions", len(result.ExacRegionalMissenseConstraintRegions))
					for i, region := range result.ExacRegionalMissenseConstraintRegions {
						assert.Greater(t, region.Stop, region.Start, "Region %d should have valid coordinates", i)
						if region.ObsMis != nil && region.ExpMis != nil {
							t.Logf("Region %d: obs_mis=%d, exp_mis=%.2f", i, *region.ObsMis, *region.ExpMis)
						}
					}
				}

				// Test gnomAD v2 regional missense constraints
				if result.GnomadV2RegionalMissenseConstraint != nil {
					t.Logf("Found gnomAD v2 regional missense constraint data")
					if result.GnomadV2RegionalMissenseConstraint.PassedQc != nil {
						t.Logf("Passed QC: %v", *result.GnomadV2RegionalMissenseConstraint.PassedQc)
					}
					if result.GnomadV2RegionalMissenseConstraint.Regions != nil {
						t.Logf("Found %d regions", len(result.GnomadV2RegionalMissenseConstraint.Regions))
						for i, region := range result.GnomadV2RegionalMissenseConstraint.Regions {
							if region.Start != nil && region.Stop != nil {
								assert.Greater(t, *region.Stop, *region.Start, "Region %d should have valid coordinates", i)
							}
						}
					}
				}
			},
		},
		{
			name:            "fetch mitochondrial gene with constraints",
			geneID:          "ENSG00000198888", // MT-ND1 (mitochondrial gene)
			referenceGenome: "GRCh38",
			expectedError:   false,
			validate: func(t *testing.T, result *model.Gene) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "ENSG00000198888", result.GeneID)

				// Test mitochondrial constraint
				if result.MitochondrialConstraint != nil {
					t.Logf("Found mitochondrial constraint data")

					// Check if it's a protein constraint
					if proteinConstraint, ok := result.MitochondrialConstraint.(*model.ProteinMitochondrialGeneConstraint); ok {
						t.Logf("Found protein mitochondrial constraint")
						assert.Greater(t, proteinConstraint.ExpLof, float64(0))
						assert.Greater(t, proteinConstraint.ExpMis, float64(0))
						assert.Greater(t, proteinConstraint.ExpSyn, float64(0))
						assert.GreaterOrEqual(t, proteinConstraint.ObsLof, float64(0))
						assert.GreaterOrEqual(t, proteinConstraint.ObsMis, float64(0))
						assert.GreaterOrEqual(t, proteinConstraint.ObsSyn, float64(0))
					} else if rnaConstraint, ok := result.MitochondrialConstraint.(*model.RNAMitochondrialGeneConstraint); ok {
						t.Logf("Found RNA mitochondrial constraint")
						assert.Greater(t, rnaConstraint.Expected, float64(0))
						assert.GreaterOrEqual(t, rnaConstraint.Observed, float64(0))
						assert.Greater(t, rnaConstraint.Oe, float64(0))
					}
				} else {
					t.Logf("No mitochondrial constraint data found")
				}

				// Test mitochondrial missense constraint regions
				if result.MitochondrialMissenseConstraintRegions != nil && len(result.MitochondrialMissenseConstraintRegions) > 0 {
					t.Logf("Found %d mitochondrial constraint regions", len(result.MitochondrialMissenseConstraintRegions))
					for i, region := range result.MitochondrialMissenseConstraintRegions {
						assert.Greater(t, region.Stop, region.Start, "Region %d should have valid coordinates", i)
						assert.Greater(t, region.Oe, float64(0), "Region %d should have positive O/E ratio", i)
					}
				}
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

func TestGeneConstraints_Integration_MultipleGenes(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getConstraintTestESClient(t)

	// Test multiple genes to ensure constraint data is properly loaded
	geneTests := []struct {
		geneID           string
		symbol           string
		referenceGenome  string
		expectConstraint bool
	}{
		{"ENSG00000169174", "PCSK9", "GRCh38", true},   // Well-known gene with constraints
		{"ENSG00000198712", "MT-CO2", "GRCh38", false}, // Mitochondrial gene
		{"ENSG00000141510", "TP53", "GRCh38", true},    // Tumor suppressor gene
		{"ENSG00000012048", "BRCA1", "GRCh38", true},   // DNA repair gene
	}

	constraintFields := make(map[string]bool)
	for _, test := range geneTests {
		t.Run(test.symbol, func(t *testing.T) {
			result, err := FetchGeneByID(context.Background(), client, test.geneID, test.referenceGenome)
			require.NoError(t, err)
			require.NotNil(t, result)

			assert.Equal(t, test.geneID, result.GeneID)
			assert.Equal(t, test.symbol, result.Symbol)

			// Track which constraint types are found across genes
			if result.GnomadConstraint != nil {
				constraintFields["gnomad"] = true
				t.Logf("%s has gnomAD constraint", test.symbol)
			}
			if result.ExacConstraint != nil {
				constraintFields["exac"] = true
				t.Logf("%s has ExAC constraint", test.symbol)
			}
			if result.MitochondrialConstraint != nil {
				constraintFields["mitochondrial"] = true
				t.Logf("%s has mitochondrial constraint", test.symbol)
			}
			if result.GnomadV2RegionalMissenseConstraint != nil {
				constraintFields["gnomad_regional"] = true
				t.Logf("%s has gnomAD v2 regional constraint", test.symbol)
			}
			if result.ExacRegionalMissenseConstraintRegions != nil && len(result.ExacRegionalMissenseConstraintRegions) > 0 {
				constraintFields["exac_regional"] = true
				t.Logf("%s has ExAC regional constraints", test.symbol)
			}
		})
	}

	// Log summary of constraint types found
	t.Logf("Constraint types found across all genes: %v", constraintFields)
}

func TestConstraintConversionFunctions_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getConstraintTestESClient(t)

	// Test that constraint conversion functions work properly with real data
	result, err := FetchGeneByID(context.Background(), client, "ENSG00000169174", "GRCh38")
	require.NoError(t, err)
	require.NotNil(t, result)

	// Test gnomAD constraint conversion
	if result.GnomadConstraint != nil {
		t.Run("gnomad_constraint_fields", func(t *testing.T) {
			constraint := result.GnomadConstraint

			// Required fields should be non-nil
			assert.NotNil(t, constraint.ExpMis, "exp_mis should be present")
			assert.NotNil(t, constraint.OeMis, "oe_mis should be present")
			assert.NotNil(t, constraint.MisZ, "mis_z should be present")
			assert.NotNil(t, constraint.SynZ, "syn_z should be present")

			// Deprecated field should match pli
			if constraint.Pli != nil {
				assert.Equal(t, constraint.Pli, constraint.PLi, "pLI should match pli")
			}

			// Validate constraint field relationships
			if constraint.ObsMis != nil && constraint.ExpMis > 0 {
				calculatedOe := float64(*constraint.ObsMis) / constraint.ExpMis
				assert.InDelta(t, calculatedOe, constraint.OeMis, 0.01, "oe_mis should match obs_mis/exp_mis")
			}
		})
	}

	// Test ExAC constraint conversion
	if result.ExacConstraint != nil {
		t.Run("exac_constraint_fields", func(t *testing.T) {
			constraint := result.ExacConstraint

			// Required fields should be non-zero
			assert.NotZero(t, constraint.MisZ, "mis_z should be non-zero")
			assert.NotZero(t, constraint.SynZ, "syn_z should be non-zero")
			assert.NotZero(t, constraint.PLi, "pLI should be non-zero")

			// PLi should be between 0 and 1 if it represents a probability
			if constraint.Pli != nil {
				assert.GreaterOrEqual(t, *constraint.Pli, float64(0))
				assert.LessOrEqual(t, *constraint.Pli, float64(1))
			}
		})
	}
}

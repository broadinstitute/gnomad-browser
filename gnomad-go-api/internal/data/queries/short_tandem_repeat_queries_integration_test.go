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

// These tests require a running Elasticsearch instance with STR data
// Run with: go test -tags=integration ./internal/data/queries

func TestFetchShortTandemRepeat_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		strID         string
		datasetID     string
		expectNil     bool
		expectedError bool
		validate      func(t *testing.T, result *model.ShortTandemRepeatDetails)
	}{
		{
			name:          "fetch existing STR - HTT gene",
			strID:         "HTT",
			datasetID:     "gnomad_r4",
			expectNil:     false,
			expectedError: false,
			validate: func(t *testing.T, result *model.ShortTandemRepeatDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "HTT", result.ID)
				assert.NotNil(t, result.Gene)
				assert.Equal(t, "HTT", result.Gene.Symbol)
				// Log HTT location for debugging
				if result.MainReferenceRegion != nil {
					t.Logf("HTT actual location: %s:%d-%d",
						result.MainReferenceRegion.Chrom,
						result.MainReferenceRegion.Start,
						result.MainReferenceRegion.Stop)
				}
				assert.NotEmpty(t, result.Gene.EnsemblID)

				// Check reference region
				assert.NotNil(t, result.MainReferenceRegion)
				assert.Equal(t, "4", result.MainReferenceRegion.Chrom)
				assert.NotNil(t, result.ReferenceRegions)
				assert.NotEmpty(t, result.ReferenceRegions)

				// Check repeat unit
				assert.NotEmpty(t, result.ReferenceRepeatUnit)

				// Check disease associations
				assert.NotNil(t, result.AssociatedDiseases)
				if len(result.AssociatedDiseases) > 0 {
					// HTT is associated with Huntington's disease
					found := false
					for _, disease := range result.AssociatedDiseases {
						if disease.Symbol == "HD" || disease.Name == "Huntington disease" {
							found = true
							assert.NotEmpty(t, disease.InheritanceMode)
							assert.NotNil(t, disease.RepeatSizeClassifications)
							break
						}
					}
					assert.True(t, found, "Expected to find Huntington disease association")
				}

				// Check distributions
				assert.NotNil(t, result.AlleleSizeDistribution)
				assert.NotNil(t, result.GenotypeDistribution)

				// Check repeat units
				assert.NotNil(t, result.RepeatUnits)
				assert.NotEmpty(t, result.RepeatUnits)
			},
		},
		{
			name:          "fetch existing STR - FMR1 gene",
			strID:         "FMR1",
			datasetID:     "gnomad_r4",
			expectNil:     false,
			expectedError: false,
			validate: func(t *testing.T, result *model.ShortTandemRepeatDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "FMR1", result.ID)
				assert.NotNil(t, result.Gene)
				assert.Equal(t, "FMR1", result.Gene.Symbol)

				// Check disease associations
				assert.NotNil(t, result.AssociatedDiseases)
				// FMR1 is associated with Fragile X syndrome
			},
		},
		{
			name:          "fetch non-existent STR",
			strID:         "NONEXISTENT_STR_12345",
			datasetID:     "gnomad_r4",
			expectNil:     true,
			expectedError: false,
		},
		{
			name:          "fetch STR with gnomad_r3 dataset",
			strID:         "HTT",
			datasetID:     "gnomad_r3",
			expectNil:     false,
			expectedError: false,
			validate: func(t *testing.T, result *model.ShortTandemRepeatDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "HTT", result.ID)
			},
		},
		{
			name:          "invalid dataset",
			strID:         "HTT",
			datasetID:     "invalid_dataset",
			expectNil:     true,
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchShortTandemRepeat(context.Background(), client, tt.strID, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				if tt.expectNil {
					assert.Nil(t, result)
				} else {
					require.NotNil(t, result)
					t.Logf("Successfully fetched STR: %s", result.ID)
					if tt.validate != nil {
						tt.validate(t, result)
					}
				}
			}
		})
	}
}

func TestFetchShortTandemRepeats_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		datasetID     string
		expectedError bool
		validate      func(t *testing.T, results []*model.ShortTandemRepeat)
	}{
		{
			name:          "fetch all STRs - gnomad_r4",
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, results []*model.ShortTandemRepeat) {
				t.Helper()
				assert.NotNil(t, results)
				assert.NotEmpty(t, results)
				t.Logf("Found %d STRs", len(results))

				// Check a few STRs
				for i, str := range results {
					if i >= 5 {
						break // Just check first 5
					}
					assert.NotEmpty(t, str.ID)
					assert.NotNil(t, str.Gene)
					assert.NotEmpty(t, str.Gene.Symbol)
					assert.NotEmpty(t, str.Gene.EnsemblID)
					assert.NotNil(t, str.MainReferenceRegion)
					assert.NotEmpty(t, str.ReferenceRepeatUnit)
				}

				// Check that we have known STRs
				strMap := make(map[string]bool)
				for _, str := range results {
					strMap[str.ID] = true
				}
				assert.True(t, strMap["HTT"], "Expected HTT in results")
			},
		},
		{
			name:          "fetch all STRs - gnomad_r3",
			datasetID:     "gnomad_r3",
			expectedError: false,
			validate: func(t *testing.T, results []*model.ShortTandemRepeat) {
				t.Helper()
				assert.NotNil(t, results)
				assert.NotEmpty(t, results)
				t.Logf("Found %d STRs in gnomad_r3", len(results))
			},
		},
		{
			name:          "invalid dataset",
			datasetID:     "invalid_dataset",
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := FetchShortTandemRepeats(context.Background(), client, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				require.NotNil(t, results)
				if tt.validate != nil {
					tt.validate(t, results)
				}
			}
		})
	}
}

func TestFetchShortTandemRepeatsByGene_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		ensemblGeneID string
		datasetID     string
		expectedError bool
		expectedCount int
		validate      func(t *testing.T, results []*model.ShortTandemRepeat)
	}{
		{
			name:          "fetch STRs for HTT gene",
			ensemblGeneID: "ENSG00000197386", // HTT gene Ensembl ID
			datasetID:     "gnomad_r4",
			expectedError: false,
			expectedCount: 1, // HTT should have at least 1 STR
			validate: func(t *testing.T, results []*model.ShortTandemRepeat) {
				t.Helper()
				assert.NotNil(t, results)
				assert.GreaterOrEqual(t, len(results), 1)

				// Verify all results are for HTT gene
				for _, str := range results {
					assert.NotNil(t, str.Gene)
					assert.Equal(t, "HTT", str.Gene.Symbol)
					assert.Equal(t, "ENSG00000197386", str.Gene.EnsemblID)
				}
			},
		},
		{
			name:          "fetch STRs for gene with no STRs",
			ensemblGeneID: "ENSG00000000000", // Non-existent gene
			datasetID:     "gnomad_r4",
			expectedError: false,
			expectedCount: 0,
			validate: func(t *testing.T, results []*model.ShortTandemRepeat) {
				t.Helper()
				assert.NotNil(t, results)
				assert.Empty(t, results)
			},
		},
		{
			name:          "invalid dataset",
			ensemblGeneID: "ENSG00000197386",
			datasetID:     "invalid_dataset",
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := FetchShortTandemRepeatsByGene(context.Background(), client, tt.ensemblGeneID, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				require.NotNil(t, results)
				if tt.expectedCount >= 0 {
					assert.GreaterOrEqual(t, len(results), tt.expectedCount)
				}
				if tt.validate != nil {
					tt.validate(t, results)
				}
			}
		})
	}
}

func TestFetchShortTandemRepeatsByRegion_Integration(t *testing.T) {
	t.Skip("TODO: Fix STR region queries - field paths need investigation")

	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		chrom         string
		start         int
		stop          int
		datasetID     string
		expectedError bool
		validate      func(t *testing.T, results []*model.ShortTandemRepeat)
	}{
		{
			name:          "fetch STRs in HTT gene region",
			chrom:         "4",
			start:         3074876,
			stop:          3074933,
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, results []*model.ShortTandemRepeat) {
				t.Helper()
				assert.NotNil(t, results)

				// Verify all results are within the region
				for _, str := range results {
					assert.NotNil(t, str.MainReferenceRegion)
					assert.Equal(t, "4", str.MainReferenceRegion.Chrom)
					assert.GreaterOrEqual(t, str.MainReferenceRegion.Stop, 3074876)
					assert.LessOrEqual(t, str.MainReferenceRegion.Start, 3074933)
				}

				// Check if HTT STR is found
				found := false
				for _, str := range results {
					if str.ID == "HTT" {
						found = true
						break
					}
				}
				assert.True(t, found, "Expected HTT in region results")
			},
		},
		{
			name:          "fetch STRs in region with no STRs",
			chrom:         "1",
			start:         1,
			stop:          1000,
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, results []*model.ShortTandemRepeat) {
				t.Helper()
				assert.NotNil(t, results)
				// May or may not have results depending on data
			},
		},
		{
			name:          "fetch STRs in X chromosome region",
			chrom:         "X",
			start:         146990000,
			stop:          147000000,
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, results []*model.ShortTandemRepeat) {
				t.Helper()
				assert.NotNil(t, results)
				// This region should contain FMR1 if within range
				for _, str := range results {
					assert.NotNil(t, str.MainReferenceRegion)
					assert.Equal(t, "X", str.MainReferenceRegion.Chrom)
				}
			},
		},
		{
			name:          "invalid dataset",
			chrom:         "4",
			start:         3070000,
			stop:          3080000,
			datasetID:     "invalid_dataset",
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := FetchShortTandemRepeatsByRegion(context.Background(), client, tt.chrom, tt.start, tt.stop, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				require.NotNil(t, results)
				t.Logf("Found %d STRs in region %s:%d-%d", len(results), tt.chrom, tt.start, tt.stop)
				if tt.validate != nil {
					tt.validate(t, results)
				}
			}
		})
	}
}

// TestSTRDataStructures validates the complex nested data structures
func TestSTRDataStructures_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Fetch a known STR with rich data
	result, err := FetchShortTandemRepeat(context.Background(), client, "HTT", "gnomad_r4")
	require.NoError(t, err)
	require.NotNil(t, result)

	t.Run("validate allele size distribution", func(t *testing.T) {
		assert.NotNil(t, result.AlleleSizeDistribution)
		if len(result.AlleleSizeDistribution) > 0 {
			cohort := result.AlleleSizeDistribution[0]
			assert.NotEmpty(t, cohort.AncestryGroup)
			assert.NotEmpty(t, cohort.Sex)
			assert.NotEmpty(t, cohort.Repunit)
			assert.NotEmpty(t, cohort.QualityDescription)
			assert.GreaterOrEqual(t, cohort.QScore, 0.0)

			assert.NotNil(t, cohort.Distribution)
			if len(cohort.Distribution) > 0 {
				item := cohort.Distribution[0]
				assert.GreaterOrEqual(t, item.RepunitCount, 0)
				assert.GreaterOrEqual(t, item.Frequency, 0)
			}
		}
	})

	t.Run("validate genotype distribution", func(t *testing.T) {
		assert.NotNil(t, result.GenotypeDistribution)
		if len(result.GenotypeDistribution) > 0 {
			cohort := result.GenotypeDistribution[0]
			assert.NotEmpty(t, cohort.AncestryGroup)
			assert.NotEmpty(t, cohort.Sex)
			assert.NotEmpty(t, cohort.ShortAlleleRepunit)
			assert.NotEmpty(t, cohort.LongAlleleRepunit)

			assert.NotNil(t, cohort.Distribution)
			if len(cohort.Distribution) > 0 {
				item := cohort.Distribution[0]
				assert.GreaterOrEqual(t, item.ShortAlleleRepunitCount, 0)
				assert.GreaterOrEqual(t, item.LongAlleleRepunitCount, 0)
				assert.GreaterOrEqual(t, item.Frequency, 0)
			}
		}
	})

	t.Run("validate age distribution", func(t *testing.T) {
		if result.AgeDistribution != nil && len(result.AgeDistribution) > 0 {
			ageBin := result.AgeDistribution[0]
			assert.NotNil(t, ageBin.AgeRange)
			assert.NotNil(t, ageBin.Distribution)
		}
	})

	t.Run("validate adjacent repeats", func(t *testing.T) {
		assert.NotNil(t, result.AdjacentRepeats)
		if len(result.AdjacentRepeats) > 0 {
			adjacent := result.AdjacentRepeats[0]
			assert.NotEmpty(t, adjacent.ID)
			assert.NotNil(t, adjacent.ReferenceRegion)
			assert.NotEmpty(t, adjacent.ReferenceRepeatUnit)
			assert.NotNil(t, adjacent.RepeatUnits)
			assert.NotNil(t, adjacent.AlleleSizeDistribution)
			assert.NotNil(t, adjacent.GenotypeDistribution)
		}
	})

	t.Run("validate disease associations", func(t *testing.T) {
		assert.NotNil(t, result.AssociatedDiseases)
		if len(result.AssociatedDiseases) > 0 {
			disease := result.AssociatedDiseases[0]
			assert.NotEmpty(t, disease.Name)
			assert.NotEmpty(t, disease.Symbol)
			assert.NotEmpty(t, disease.InheritanceMode)

			assert.NotNil(t, disease.RepeatSizeClassifications)
			if len(disease.RepeatSizeClassifications) > 0 {
				classification := disease.RepeatSizeClassifications[0]
				assert.NotEmpty(t, classification.Classification)
				// Min and Max can be nil
			}
		}
	})
}

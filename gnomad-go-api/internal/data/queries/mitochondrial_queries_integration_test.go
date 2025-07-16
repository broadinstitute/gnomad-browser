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

// These tests require a running Elasticsearch instance with gnomAD mitochondrial data
// Run with: go test -tags=integration ./internal/data/queries

func TestFetchMitochondrialVariant_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		variantID     string
		datasetID     string
		expectedError bool
		validate      func(t *testing.T, result *model.MitochondrialVariantDetails)
	}{
		{
			name:          "fetch existing mitochondrial variant",
			variantID:     "M-8602-T-C", // Example from the GraphQL query provided
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result *model.MitochondrialVariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "M-8602-T-C", result.VariantID, "VariantID should match")
				assert.Equal(t, 8602, result.Pos)
				assert.Equal(t, "T", result.Ref)
				assert.Equal(t, "C", result.Alt)
				assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)

				// Verify mitochondrial-specific fields are present
				assert.NotNil(t, result.AcHet, "Should have heteroplasmic allele count")
				assert.NotNil(t, result.AcHom, "Should have homoplasmic allele count")
				assert.NotNil(t, result.An, "Should have allele number")
				assert.NotNil(t, result.MaxHeteroplasmy, "Should have max heteroplasmy")

				// Verify populations are present
				assert.NotNil(t, result.Populations, "Should have population data")
				assert.Greater(t, len(result.Populations), 0, "Should have at least one population")

				// Verify transcript consequences are present
				assert.NotNil(t, result.TranscriptConsequences, "Should have transcript consequences")

				// Verify flags array is not nil (can be empty)
				assert.NotNil(t, result.Flags, "Flags should not be nil")
			},
		},
		{
			name:          "fetch another mitochondrial variant by variant ID",
			variantID:     "M-16519-T-C", // Another common mitochondrial variant
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result *model.MitochondrialVariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "M-16519-T-C", result.VariantID)
				assert.Equal(t, 16519, result.Pos)
				assert.Equal(t, "T", result.Ref)
				assert.Equal(t, "C", result.Alt)
			},
		},
		{
			name:          "fetch mitochondrial variant by RSID",
			variantID:     "rs28357984", // RSID for a mitochondrial variant
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result *model.MitochondrialVariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.NotEmpty(t, result.VariantID, "Should have variant ID")
				// Should have RSID in rsids field
				assert.NotNil(t, result.Rsids, "Should have rsids")
				if result.Rsids != nil {
					// Convert []*string to []string for comparison
					rsids := make([]string, len(result.Rsids))
					for i, rsid := range result.Rsids {
						if rsid != nil {
							rsids[i] = *rsid
						}
					}
					assert.Contains(t, rsids, "rs28357984", "Should contain the queried RSID")
				}
			},
		},
		{
			name:          "fetch non-existent mitochondrial variant",
			variantID:     "M-99999-A-T",
			datasetID:     "gnomad_r4",
			expectedError: true,
		},
		{
			name:          "unsupported dataset",
			variantID:     "M-8602-T-C",
			datasetID:     "gnomad_r2_1", // Mitochondrial variants not available in r2.1
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchMitochondrialVariant(context.Background(), client, tt.variantID, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err, "Expected an error")
				assert.Nil(t, result, "Result should be nil on error")
			} else {
				require.NoError(t, err, "Should not return error")
				require.NotNil(t, result, "Result should not be nil")
				if tt.validate != nil {
					tt.validate(t, result)
				}
			}
		})
	}
}

func TestFetchMitochondrialVariantsByGene_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		geneID        string
		datasetID     string
		expectedError bool
		validate      func(t *testing.T, result []*model.MitochondrialVariant)
	}{
		{
			name:          "fetch variants for MT-ATP6 gene",
			geneID:        "ENSG00000198899", // MT-ATP6 gene
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result []*model.MitochondrialVariant) {
				t.Helper()
				assert.NotNil(t, result, "Result should not be nil")
				assert.Greater(t, len(result), 0, "Should have at least one variant")

				// Verify each variant has required fields
				for _, variant := range result {
					assert.NotEmpty(t, variant.VariantID, "Each variant should have a variant ID")
					assert.Greater(t, variant.Pos, 0, "Each variant should have a position")
					assert.NotEmpty(t, variant.ReferenceGenome, "Each variant should have reference genome")
				}

				// Variants should be sorted by position
				for i := 1; i < len(result); i++ {
					assert.GreaterOrEqual(t, result[i].Pos, result[i-1].Pos, "Variants should be sorted by position")
				}
			},
		},
		{
			name:          "fetch variants for MT-CO1 gene",
			geneID:        "ENSG00000198804", // MT-CO1 gene
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result []*model.MitochondrialVariant) {
				t.Helper()
				assert.NotNil(t, result, "Result should not be nil")
				// MT-CO1 is a large gene and should have many variants
				assert.Greater(t, len(result), 10, "MT-CO1 should have many variants")
			},
		},
		{
			name:          "fetch variants for non-existent gene",
			geneID:        "ENSG00000000000",
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result []*model.MitochondrialVariant) {
				t.Helper()
				assert.NotNil(t, result, "Result should not be nil")
				assert.Equal(t, 0, len(result), "Should have no variants for non-existent gene")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchMitochondrialVariantsByGene(context.Background(), client, tt.geneID, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err, "Expected an error")
			} else {
				require.NoError(t, err, "Should not return error")
				if tt.validate != nil {
					tt.validate(t, result)
				}
			}
		})
	}
}

func TestFetchMitochondrialVariantsByRegion_Integration(t *testing.T) {
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
		validate      func(t *testing.T, result []*model.MitochondrialVariant)
	}{
		{
			name:          "fetch variants in MT-ATP6 region",
			chrom:         "M",
			start:         8527, // MT-ATP6 gene region
			stop:          9207,
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result []*model.MitochondrialVariant) {
				t.Helper()
				assert.NotNil(t, result, "Result should not be nil")
				assert.Greater(t, len(result), 0, "Should have at least one variant in this region")

				// Verify all variants are within the specified region
				for _, variant := range result {
					assert.GreaterOrEqual(t, variant.Pos, 8527, "Variant position should be >= start")
					assert.LessOrEqual(t, variant.Pos, 9207, "Variant position should be <= stop")
				}

				// Variants should be sorted by position
				for i := 1; i < len(result); i++ {
					assert.GreaterOrEqual(t, result[i].Pos, result[i-1].Pos, "Variants should be sorted by position")
				}
			},
		},
		{
			name:          "fetch variants in control region",
			chrom:         "M",
			start:         16024, // D-loop/control region
			stop:          16569,
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result []*model.MitochondrialVariant) {
				t.Helper()
				assert.NotNil(t, result, "Result should not be nil")
				// Control region should have many variants
				assert.Greater(t, len(result), 20, "Control region should have many variants")
			},
		},
		{
			name:          "fetch variants in small region with no variants",
			chrom:         "M",
			start:         1, // Very beginning of mitochondrial genome
			stop:          10,
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result []*model.MitochondrialVariant) {
				t.Helper()
				assert.NotNil(t, result, "Result should not be nil")
				// This region may or may not have variants, just verify it doesn't error
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchMitochondrialVariantsByRegion(context.Background(), client, tt.chrom, tt.start, tt.stop, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err, "Expected an error")
			} else {
				require.NoError(t, err, "Should not return error")
				if tt.validate != nil {
					tt.validate(t, result)
				}
			}
		})
	}
}

func TestFetchMitochondrialVariantsByTranscript_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		transcriptID  string
		geneID        string
		datasetID     string
		expectedError bool
		validate      func(t *testing.T, result []*model.MitochondrialVariant)
	}{
		{
			name:          "fetch variants for MT-ATP6 transcript",
			transcriptID:  "ENST00000361390", // MT-ATP6 transcript
			geneID:        "ENSG00000198899", // MT-ATP6 gene
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result []*model.MitochondrialVariant) {
				t.Helper()
				assert.NotNil(t, result, "Result should not be nil")
				assert.Greater(t, len(result), 0, "Should have at least one variant")

				// For mitochondrial genes, transcript and gene queries should return the same results
				// Verify each variant has required fields
				for _, variant := range result {
					assert.NotEmpty(t, variant.VariantID, "Each variant should have a variant ID")
					assert.Greater(t, variant.Pos, 0, "Each variant should have a position")
				}
			},
		},
		{
			name:          "fetch variants for MT-CO1 transcript",
			transcriptID:  "ENST00000361381", // MT-CO1 transcript
			geneID:        "ENSG00000198804", // MT-CO1 gene
			datasetID:     "gnomad_r4",
			expectedError: false,
			validate: func(t *testing.T, result []*model.MitochondrialVariant) {
				t.Helper()
				assert.NotNil(t, result, "Result should not be nil")
				assert.Greater(t, len(result), 10, "MT-CO1 should have many variants")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := FetchMitochondrialVariantsByTranscript(context.Background(), client, tt.transcriptID, tt.geneID, tt.datasetID)

			if tt.expectedError {
				assert.Error(t, err, "Expected an error")
			} else {
				require.NoError(t, err, "Should not return error")
				if tt.validate != nil {
					tt.validate(t, result)
				}
			}
		})
	}
}

func TestMitochondrialVariant_Integration_DataStructure(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	// Test the full data structure with a known variant
	result, err := FetchMitochondrialVariant(context.Background(), client, "M-8602-T-C", "gnomad_r4")
	require.NoError(t, err, "Should not return error")
	require.NotNil(t, result, "Result should not be nil")

	t.Run("basic_fields", func(t *testing.T) {
		assert.Equal(t, "M-8602-T-C", result.VariantID)
		assert.Equal(t, 8602, result.Pos)
		assert.Equal(t, "T", result.Ref)
		assert.Equal(t, "C", result.Alt)
		assert.Equal(t, model.ReferenceGenomeIDGRCh38, result.ReferenceGenome)
	})

	t.Run("allele_counts", func(t *testing.T) {
		assert.NotNil(t, result.AcHet, "Should have heteroplasmic allele count")
		assert.NotNil(t, result.AcHom, "Should have homoplasmic allele count")
		assert.NotNil(t, result.An, "Should have allele number")
		assert.GreaterOrEqual(t, *result.An, *result.AcHet+*result.AcHom, "AN should be >= AC_het + AC_hom")
	})

	t.Run("population_data", func(t *testing.T) {
		assert.NotNil(t, result.Populations, "Should have population data")
		assert.Greater(t, len(result.Populations), 0, "Should have at least one population")

		for _, pop := range result.Populations {
			assert.NotEmpty(t, pop.ID, "Population should have ID")
			assert.GreaterOrEqual(t, pop.An, pop.AcHet+pop.AcHom, "Population AN should be >= AC_het + AC_hom")
		}
	})

	t.Run("haplogroups", func(t *testing.T) {
		// Haplogroups may or may not be present for all variants
		if result.Haplogroups != nil && len(result.Haplogroups) > 0 {
			for _, hap := range result.Haplogroups {
				assert.NotNil(t, hap.ID, "Haplogroup should have ID")
			}
		}
	})

	t.Run("quality_metrics", func(t *testing.T) {
		// Quality metrics should be present
		assert.NotNil(t, result.GenotypeQualityMetrics, "Should have genotype quality metrics")

		if len(result.GenotypeQualityMetrics) > 0 {
			for _, metric := range result.GenotypeQualityMetrics {
				assert.NotEmpty(t, metric.Name, "Quality metric should have name")
			}
		}
	})

	t.Run("heteroplasmy", func(t *testing.T) {
		assert.NotNil(t, result.MaxHeteroplasmy, "Should have max heteroplasmy")
		assert.GreaterOrEqual(t, *result.MaxHeteroplasmy, 0.0, "Max heteroplasmy should be >= 0")
		assert.LessOrEqual(t, *result.MaxHeteroplasmy, 1.0, "Max heteroplasmy should be <= 1")
	})

	t.Run("transcript_consequences", func(t *testing.T) {
		assert.NotNil(t, result.TranscriptConsequences, "Should have transcript consequences")

		if len(result.TranscriptConsequences) > 0 {
			for _, csq := range result.TranscriptConsequences {
				assert.NotEmpty(t, csq.GeneID, "Consequence should have gene ID")
				assert.NotEmpty(t, csq.TranscriptID, "Consequence should have transcript ID")
			}
		}
	})
}

func TestMitochondrialVariant_Integration_EdgeCases(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	t.Run("large_region_query", func(t *testing.T) {
		// Query the entire mitochondrial genome
		result, err := FetchMitochondrialVariantsByRegion(context.Background(), client, "M", 1, 16569, "gnomad_r4")
		require.NoError(t, err, "Should not return error")
		assert.NotNil(t, result, "Result should not be nil")
		assert.Greater(t, len(result), 100, "Full mitochondrial genome should have many variants")

		// Verify variants are sorted
		for i := 1; i < len(result); i++ {
			assert.GreaterOrEqual(t, result[i].Pos, result[i-1].Pos, "Variants should be sorted by position")
		}
	})

	t.Run("variant_with_special_characters", func(t *testing.T) {
		// Test variants with complex alleles or special cases
		result, err := FetchMitochondrialVariantsByRegion(context.Background(), client, "M", 300, 400, "gnomad_r4")
		require.NoError(t, err, "Should not return error")
		assert.NotNil(t, result, "Result should not be nil")

		// Just verify we can handle whatever variants are in this region
		for _, variant := range result {
			assert.NotEmpty(t, variant.VariantID, "Each variant should have a variant ID")
		}
	})
}

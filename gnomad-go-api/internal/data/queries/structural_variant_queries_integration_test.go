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

// These tests require a running Elasticsearch instance with gnomAD structural variant data
// Run with: go test -tags=integration ./internal/data/queries

func TestFetchStructuralVariant_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)
	ctx := context.Background()

	tests := []struct {
		name      string
		variantID string
		dataset   model.StructuralVariantDatasetID
		shouldFind bool
		checkFields func(t *testing.T, variant *model.StructuralVariantDetails)
	}{
		{
			name:      "Fetch SV from gnomAD v2.1",
			variantID: "DEL_1_100000_200000", // Example SV ID - replace with real test data
			dataset:   model.StructuralVariantDatasetIDGnomadSvR2_1,
			shouldFind: false, // Set to true when you have test data
			checkFields: func(t *testing.T, variant *model.StructuralVariantDetails) {
				assert.NotEmpty(t, variant.VariantID)
				assert.NotEmpty(t, variant.Chrom)
				assert.Greater(t, variant.Pos, 0)
				assert.GreaterOrEqual(t, variant.End, variant.Pos)
				assert.GreaterOrEqual(t, variant.Ac, 0)
				assert.Greater(t, variant.An, 0)
				assert.Equal(t, model.ReferenceGenomeIDGRCh37, variant.ReferenceGenome)
			},
		},
		{
			name:      "Fetch SV from gnomAD v4",
			variantID: "DEL_1_100000_200000", // Example SV ID - replace with real test data
			dataset:   model.StructuralVariantDatasetIDGnomadSvR4,
			shouldFind: false, // Set to true when you have test data
			checkFields: func(t *testing.T, variant *model.StructuralVariantDetails) {
				assert.NotEmpty(t, variant.VariantID)
				assert.NotEmpty(t, variant.Chrom)
				assert.Greater(t, variant.Pos, 0)
				assert.GreaterOrEqual(t, variant.End, variant.Pos)
				assert.GreaterOrEqual(t, variant.Ac, 0)
				assert.Greater(t, variant.An, 0)
				assert.Equal(t, model.ReferenceGenomeIDGRCh38, variant.ReferenceGenome)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			variant, err := FetchStructuralVariant(ctx, client, tt.variantID, tt.dataset)
			require.NoError(t, err)

			if tt.shouldFind {
				require.NotNil(t, variant, "Expected to find variant %s", tt.variantID)
				tt.checkFields(t, variant)
			} else {
				// For now, we expect not to find test variants since we don't have real test data
				// This validates that the query executes without error
				t.Logf("Query executed successfully for %s (no test data available)", tt.variantID)
			}
		})
	}
}

func TestFetchStructuralVariant_NotFound(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)
	ctx := context.Background()

	// Test with a variant ID that definitely doesn't exist
	variant, err := FetchStructuralVariant(ctx, client, "NONEXISTENT_VARIANT_ID", model.StructuralVariantDatasetIDGnomadSvR4)
	require.NoError(t, err)
	assert.Nil(t, variant, "Expected nil for nonexistent variant")
}

func TestFetchStructuralVariantsByGene_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)
	ctx := context.Background()

	tests := []struct {
		name       string
		geneSymbol string
		dataset    model.StructuralVariantDatasetID
		checkResults func(t *testing.T, variants []*model.StructuralVariant)
	}{
		{
			name:       "Fetch SVs for BRCA1 in gnomAD v4",
			geneSymbol: "BRCA1",
			dataset:    model.StructuralVariantDatasetIDGnomadSvR4,
			checkResults: func(t *testing.T, variants []*model.StructuralVariant) {
				// We expect BRCA1 to have some structural variants
				// But we'll be flexible since we don't know the exact count
				t.Logf("Found %d structural variants for BRCA1", len(variants))
				
				for _, variant := range variants {
					assert.NotEmpty(t, variant.VariantID)
					assert.NotEmpty(t, variant.Chrom)
					assert.Greater(t, variant.Pos, 0)
					assert.GreaterOrEqual(t, variant.End, variant.Pos)
					assert.GreaterOrEqual(t, variant.Ac, 0)
					assert.Greater(t, variant.An, 0)
					assert.Equal(t, model.ReferenceGenomeIDGRCh38, variant.ReferenceGenome)
					
					// Major consequence should be set for gene-based queries
					assert.NotNil(t, variant.MajorConsequence, "Major consequence should be set for gene queries")
				}
			},
		},
		{
			name:       "Fetch SVs for nonexistent gene",
			geneSymbol: "NONEXISTENT_GENE",
			dataset:    model.StructuralVariantDatasetIDGnomadSvR4,
			checkResults: func(t *testing.T, variants []*model.StructuralVariant) {
				assert.Empty(t, variants, "Expected no variants for nonexistent gene")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			variants, err := FetchStructuralVariantsByGene(ctx, client, tt.geneSymbol, tt.dataset)
			require.NoError(t, err)
			require.NotNil(t, variants, "Variants slice should not be nil")
			
			tt.checkResults(t, variants)
		})
	}
}

func TestFetchStructuralVariantsByRegion_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		chrom   string
		start   int
		stop    int
		dataset model.StructuralVariantDatasetID
		checkResults func(t *testing.T, variants []*model.StructuralVariant)
	}{
		{
			name:    "Fetch SVs in small region on chr1",
			chrom:   "1",
			start:   1000000,
			stop:    2000000,
			dataset: model.StructuralVariantDatasetIDGnomadSvR4,
			checkResults: func(t *testing.T, variants []*model.StructuralVariant) {
				t.Logf("Found %d structural variants in region 1:1000000-2000000", len(variants))
				
				for _, variant := range variants {
					assert.NotEmpty(t, variant.VariantID)
					assert.Equal(t, "1", variant.Chrom)
					assert.GreaterOrEqual(t, variant.Ac, 0)
					assert.Greater(t, variant.An, 0)
					assert.Equal(t, model.ReferenceGenomeIDGRCh38, variant.ReferenceGenome)
					
					// Verify the variant overlaps with the requested region
					// For simple variants, pos should be within the region
					if variant.Type != nil && (*variant.Type == "INS" || *variant.Type == "DEL") {
						assert.GreaterOrEqual(t, variant.Pos, 1000000)
						assert.LessOrEqual(t, variant.Pos, 2000000)
					}
				}
			},
		},
		{
			name:    "Fetch SVs in region with no variants",
			chrom:   "Y", // Y chromosome likely has fewer variants
			start:   1000000,
			stop:    1100000,
			dataset: model.StructuralVariantDatasetIDGnomadSvR4,
			checkResults: func(t *testing.T, variants []*model.StructuralVariant) {
				// May or may not find variants, but should not error
				t.Logf("Found %d structural variants in region Y:1000000-1100000", len(variants))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			variants, err := FetchStructuralVariantsByRegion(ctx, client, tt.chrom, tt.start, tt.stop, tt.dataset)
			require.NoError(t, err)
			require.NotNil(t, variants, "Variants slice should not be nil")
			
			tt.checkResults(t, variants)
		})
	}
}

func TestStructuralVariantDatasetParams_AllDatasetsConfigured(t *testing.T) {
	// Test that all enum values have corresponding configuration
	allDatasets := []model.StructuralVariantDatasetID{
		model.StructuralVariantDatasetIDGnomadSvR2_1,
		model.StructuralVariantDatasetIDGnomadSvR2_1Controls,
		model.StructuralVariantDatasetIDGnomadSvR2_1NonNeuro,
		model.StructuralVariantDatasetIDGnomadSvR4,
	}

	for _, dataset := range allDatasets {
		t.Run(string(dataset), func(t *testing.T) {
			params, exists := structuralVariantDatasetParams[dataset]
			assert.True(t, exists, "Dataset %s should have configuration", dataset)
			assert.NotEmpty(t, params.Index, "Index should be configured")
			assert.NotEmpty(t, params.Subset, "Subset should be configured")
			assert.NotNil(t, params.VariantIDParams, "VariantIDParams function should be configured")
			assert.NotEmpty(t, params.ReferenceGenome, "ReferenceGenome should be configured")
		})
	}
}

func TestStructuralVariantDatasetParams_ReferenceGenomes(t *testing.T) {
	// Test that reference genomes are correctly mapped
	v2Datasets := []model.StructuralVariantDatasetID{
		model.StructuralVariantDatasetIDGnomadSvR2_1,
		model.StructuralVariantDatasetIDGnomadSvR2_1Controls,
		model.StructuralVariantDatasetIDGnomadSvR2_1NonNeuro,
	}
	
	for _, dataset := range v2Datasets {
		params := structuralVariantDatasetParams[dataset]
		assert.Equal(t, model.ReferenceGenomeIDGRCh37, params.ReferenceGenome, 
			"v2 datasets should use GRCh37")
	}
	
	v4Datasets := []model.StructuralVariantDatasetID{
		model.StructuralVariantDatasetIDGnomadSvR4,
	}
	
	for _, dataset := range v4Datasets {
		params := structuralVariantDatasetParams[dataset]
		assert.Equal(t, model.ReferenceGenomeIDGRCh38, params.ReferenceGenome, 
			"v4 datasets should use GRCh38")
	}
}
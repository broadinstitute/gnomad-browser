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

// These tests require a running Elasticsearch instance with gnomAD v2 data
// Run with: go test -tags=integration ./internal/data/queries

func TestGnomadV2VariantFetcher_Integration_FetchVariantByID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	tests := []struct {
		name          string
		subset        string
		variantID     string
		expectedError bool
		validate      func(t *testing.T, result *model.VariantDetails)
	}{
		{
			name:          "fetch existing variant with both exome and genome data",
			subset:        "gnomad",
			variantID:     "1-55516888-G-GA", // Known gnomAD v2 variant with both exome and genome data
			expectedError: false,
			validate: func(t *testing.T, result *model.VariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "1-55516888-G-GA", result.VariantID, "VariantID should match")
				assert.Equal(t, "1", result.Chrom)
				assert.Equal(t, 55516888, result.Pos)
				assert.Equal(t, "G", result.Ref)
				assert.Equal(t, "GA", result.Alt)
				assert.Equal(t, model.ReferenceGenomeIDGRCh37, result.ReferenceGenome)
				
				// V2 should have both exome and genome data for this variant
				assert.NotNil(t, result.Exome, "This variant should have exome data")
				assert.NotNil(t, result.Genome, "This variant should have genome data")
				assert.Nil(t, result.Joint, "V2 should not have joint data")

				// Basic frequency data validation
				if result.Exome != nil {
					assert.GreaterOrEqual(t, result.Exome.Ac, 0, "Exome AC should be non-negative")
					assert.Greater(t, result.Exome.An, 0, "Exome AN should be positive")
				}
				if result.Genome != nil {
					assert.GreaterOrEqual(t, result.Genome.Ac, 0, "Genome AC should be non-negative")
					assert.Greater(t, result.Genome.An, 0, "Genome AN should be positive")
				}
			},
		},
		{
			name:          "fetch existing variant with genome only",
			subset:        "gnomad",
			variantID:     "1-55505447-C-T", // Known gnomAD v2 variant from snapshot (genome only)
			expectedError: false,
			validate: func(t *testing.T, result *model.VariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, "1-55505447-C-T", result.VariantID, "VariantID should match")
				
				// This variant only has genome data
				assert.Nil(t, result.Exome, "This variant should not have exome data")
				assert.NotNil(t, result.Genome, "This variant should have genome data")

				// RSIDs should contain the expected value from snapshot
				assert.Contains(t, result.Rsids, "rs45448095", "RSIDs should contain rs45448095")

				// Basic frequency data validation from snapshot
				assert.Equal(t, 2846, result.Genome.Ac, "AC should match snapshot")
				assert.Equal(t, 31384, result.Genome.An, "AN should match snapshot")  
				assert.Equal(t, 0, result.Genome.AcHemi, "AC_hemi should be 0")
				assert.Equal(t, 144, result.Genome.AcHom, "AC_hom should match snapshot")
			},
		},
		{
			name:          "fetch non-existent variant",
			subset:        "gnomad",
			variantID:     "99-99999999-X-Y",
			expectedError: true,
			validate: func(t *testing.T, result *model.VariantDetails) {
				t.Helper()
				assert.Nil(t, result)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fetcher := &GnomadV2VariantFetcher{
				BaseVariantFetcher: BaseVariantFetcher{
					DatasetID:       "gnomad_r2_1",
					ReferenceGenome: model.ReferenceGenomeIDGRCh37,
					ESIndex:         GnomadV2Index,
				},
				Subset: tt.subset,
			}

			ctx := context.Background()
			result, err := fetcher.FetchVariantByID(ctx, client, tt.variantID)

			if tt.expectedError {
				assert.Error(t, err, "Expected an error for test case: %s", tt.name)
				tt.validate(t, result)
			} else {
				require.NoError(t, err, "Expected no error for test case: %s", tt.name)
				tt.validate(t, result)
			}
		})
	}
}

func TestGnomadV2VariantFetcher_Integration_FetchVariantByRSID(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	fetcher := &GnomadV2VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r2_1",
			ReferenceGenome: model.ReferenceGenomeIDGRCh37,
			ESIndex:         GnomadV2Index,
		},
		Subset: "gnomad",
	}

	tests := []struct {
		name          string
		rsid          string
		expectedError bool
		validate      func(t *testing.T, result *model.VariantDetails)
	}{
		{
			name:          "fetch variant by existing rsID",
			rsid:          "rs45448095", // RSID for 1-55505447-C-T variant
			expectedError: false,
			validate: func(t *testing.T, result *model.VariantDetails) {
				t.Helper()
				assert.NotNil(t, result)
				assert.Equal(t, model.ReferenceGenomeIDGRCh37, result.ReferenceGenome)
				assert.Contains(t, result.Rsids, "rs45448095", "RSIDs should contain the queried rsID")
				assert.Equal(t, "1-55505447-C-T", result.VariantID, "Should return the expected variant")
			},
		},
		{
			name:          "fetch variant by non-existent rsID", 
			rsid:          "rs111222333444555666777888999",
			expectedError: true,
			validate: func(t *testing.T, result *model.VariantDetails) {
				t.Helper()
				assert.Nil(t, result)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			result, err := fetcher.FetchVariantByRSID(ctx, client, tt.rsid)

			if tt.expectedError {
				assert.Error(t, err, "Expected an error for test case: %s", tt.name)
				tt.validate(t, result)
			} else {
				require.NoError(t, err, "Expected no error for test case: %s", tt.name)
				tt.validate(t, result)
			}
		})
	}
}

func TestGnomadV2VariantFetcher_Integration_QualityMetrics(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getTestESClient(t)

	fetcher := &GnomadV2VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r2_1",
			ReferenceGenome: model.ReferenceGenomeIDGRCh37,
			ESIndex:         GnomadV2Index,
		},
		Subset: "gnomad",
	}

	ctx := context.Background()
	result, err := fetcher.FetchVariantByID(ctx, client, "1-55516888-G-GA")
	require.NoError(t, err)
	require.NotNil(t, result)

	// Test V2-specific quality metrics structure (raw histograms only)
	// Test both exome and genome quality metrics if available
	if result.Exome != nil && result.Exome.QualityMetrics != nil {
		qm := result.Exome.QualityMetrics
		
		// V2 should have allele balance with alt data only
		if qm.AlleleBalance != nil {
			assert.NotNil(t, qm.AlleleBalance.Alt, "V2 should have alt allele balance histogram")
		}

		// V2 should have genotype depth with both all and alt data
		if qm.GenotypeDepth != nil {
			// May have either or both
			if qm.GenotypeDepth.All != nil {
				assert.Greater(t, len(qm.GenotypeDepth.All.BinEdges), 0, "All genotype depth should have bin edges")
			}
			if qm.GenotypeDepth.Alt != nil {
				assert.Greater(t, len(qm.GenotypeDepth.Alt.BinEdges), 0, "Alt genotype depth should have bin edges")
			}
		}
	}
	
	// Also test genome quality metrics
	if result.Genome != nil && result.Genome.QualityMetrics != nil {
		qm := result.Genome.QualityMetrics
		
		// V2 should have allele balance with alt data only
		if qm.AlleleBalance != nil {
			assert.NotNil(t, qm.AlleleBalance.Alt, "V2 genome should have alt allele balance histogram")
		}

		// V2 should have genotype depth with both all and alt data
		if qm.GenotypeDepth != nil {
			// May have either or both
			if qm.GenotypeDepth.All != nil {
				assert.Greater(t, len(qm.GenotypeDepth.All.BinEdges), 0, "Genome all genotype depth should have bin edges")
			}
			if qm.GenotypeDepth.Alt != nil {
				assert.Greater(t, len(qm.GenotypeDepth.Alt.BinEdges), 0, "Genome alt genotype depth should have bin edges")
			}
		}
	}
}
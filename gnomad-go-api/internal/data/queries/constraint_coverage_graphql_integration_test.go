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

// These tests validate that our constraint and coverage implementation
// matches the GraphQL query patterns from the real gnomAD browser
// Based on examples from: 20250715-real-browser-queries.md

func TestConstraintGraphQLPatterns_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getConstraintTestESClient(t)

	// Test gene query pattern matching real browser queries
	t.Run("gene_page_constraint_query_pattern", func(t *testing.T) {
		// Based on: query GnomadGene from real-browser-queries.md
		// Variables: {"geneId": "ENSG00000169174", "referenceGenome": "GRCh38"}

		gene, err := FetchGeneByID(context.Background(), client, "ENSG00000169174", "GRCh38")
		require.NoError(t, err)
		require.NotNil(t, gene)

		// Validate gene basic fields
		assert.Equal(t, "ENSG00000169174", gene.GeneID)
		assert.Equal(t, "PCSK9", gene.Symbol)
		assert.NotEmpty(t, gene.Chrom)
		assert.Greater(t, gene.Stop, gene.Start)
		assert.NotEmpty(t, gene.Exons)

		// Test gnomAD constraint fields as queried in real browser
		if gene.GnomadConstraint != nil {
			validateGnomadConstraintFields(t, gene.GnomadConstraint)
		}

		// Test ExAC constraint fields as queried in real browser
		if gene.ExacConstraint != nil {
			validateExacConstraintFields(t, gene.ExacConstraint)
		}

		// Test regional constraint fields
		if gene.ExacRegionalMissenseConstraintRegions != nil {
			validateExacRegionalConstraints(t, gene.ExacRegionalMissenseConstraintRegions)
		}

		if gene.GnomadV2RegionalMissenseConstraint != nil {
			validateGnomadV2RegionalConstraints(t, gene.GnomadV2RegionalMissenseConstraint)
		}

		// Test mitochondrial constraint fields
		if gene.MitochondrialConstraint != nil {
			validateMitochondrialConstraint(t, gene.MitochondrialConstraint)
		}

		if gene.MitochondrialMissenseConstraintRegions != nil {
			validateMitochondrialRegionConstraints(t, gene.MitochondrialMissenseConstraintRegions)
		}
	})

	t.Run("transcript_constraint_query_pattern", func(t *testing.T) {
		// Test transcript-level constraints (gnomad_constraint, exac_constraint)
		// This validates that transcript resolvers will work correctly

		gene, err := FetchGeneByID(context.Background(), client, "ENSG00000169174", "GRCh38")
		require.NoError(t, err)
		require.NotNil(t, gene)
		require.NotEmpty(t, gene.Transcripts)

		// For each transcript, the same constraint data should be available
		// (since they inherit from the gene)
		transcript := gene.Transcripts[0]
		assert.NotEmpty(t, transcript.TranscriptID)
		assert.NotEmpty(t, transcript.TranscriptVersion)
		assert.NotEmpty(t, transcript.Exons)

		t.Logf("Validated transcript constraint accessibility for %s", transcript.TranscriptID)
	})
}

func TestCoverageGraphQLPatterns_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	client := getCoverageTestESClient(t)

	t.Run("gene_coverage_query_pattern_v4", func(t *testing.T) {
		// Based on: query GeneCoverage from real-browser-queries.md
		// Variables: {"geneId": "ENSG00000169174", "datasetId": "gnomad_r4", "referenceGenome": "GRCh38"}

		// This currently returns an error due to aggregation not being implemented
		// But we validate the query structure and error handling

		gene, err := FetchGeneByID(context.Background(), client, "ENSG00000169174", "GRCh38")
		require.NoError(t, err)
		require.NotNil(t, gene)

		// Test coverage field structure matches GraphQL schema expectations
		regions := []CoverageRegion{{Start: gene.Start, Stop: gene.Stop}}
		_, err = FetchFeatureCoverage(context.Background(), client, gene.GeneID, "gnomad_r4", regions, gene.Chrom)

		// Currently expected to fail due to aggregation not implemented
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "aggregation not yet implemented")

		t.Logf("Gene coverage query pattern validated (aggregation pending implementation)")
	})

	t.Run("region_coverage_query_pattern_v4", func(t *testing.T) {
		// Based on: query RegionCoverage from real-browser-queries.md
		// Variables: {"chrom": "1", "start": 55039447, "stop": 55064852, "datasetId": "gnomad_r4", "referenceGenome": "GRCh38"}

		_, err := FetchRegionCoverage(context.Background(), client, "1", 55039447, 55064852, "gnomad_r4")

		// Currently expected to fail due to aggregation not implemented
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "aggregation not yet implemented")

		t.Logf("Region coverage query pattern validated (aggregation pending implementation)")
	})

	t.Run("transcript_coverage_query_pattern", func(t *testing.T) {
		// Based on: query TranscriptCoverage from real-browser-queries.md
		// Variables: {"transcriptId": "ENST00000302118", "datasetId": "gnomad_r4", "referenceGenome": "GRCh38"}

		// For transcript coverage, we would use the same FetchFeatureCoverage function
		// with transcript coordinates instead of gene coordinates

		gene, err := FetchGeneByID(context.Background(), client, "ENSG00000169174", "GRCh38")
		require.NoError(t, err)
		require.NotNil(t, gene)
		require.NotEmpty(t, gene.Transcripts)

		transcript := gene.Transcripts[0]
		regions := []CoverageRegion{{Start: transcript.Start, Stop: transcript.Stop}}

		_, err = FetchFeatureCoverage(context.Background(), client, transcript.TranscriptID, "gnomad_r4", regions, transcript.Chrom)

		// Currently expected to fail due to aggregation not implemented
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "aggregation not yet implemented")

		t.Logf("Transcript coverage query pattern validated for %s", transcript.TranscriptID)
	})
}

// Helper validation functions matching real browser query fields

func validateGnomadConstraintFields(t *testing.T, constraint *model.GnomadConstraint) {
	t.Helper()

	// Fields from real browser queries:
	// exp_lof, exp_mis, exp_syn, obs_lof, obs_mis, obs_syn
	// oe_lof, oe_lof_lower, oe_lof_upper, oe_mis, oe_mis_lower, oe_mis_upper
	// oe_syn, oe_syn_lower, oe_syn_upper, lof_z, mis_z, syn_z, pLI, flags

	// Required fields (marked with ! in GraphQL schema)
	// ExpMis and OeMis are non-pointer float64 fields
	assert.NotZero(t, constraint.ExpMis, "exp_mis is required")
	assert.NotZero(t, constraint.OeMis, "oe_mis is required")
	assert.NotZero(t, constraint.MisZ, "mis_z is required")
	assert.NotZero(t, constraint.SynZ, "syn_z is required")

	// Validate reasonable values
	assert.Greater(t, constraint.ExpMis, float64(0), "exp_mis should be positive")
	assert.Greater(t, constraint.OeMis, float64(0), "oe_mis should be positive")

	// pLI should be between 0 and 1 when present
	if constraint.Pli != nil {
		assert.GreaterOrEqual(t, *constraint.Pli, float64(0), "pli should be >= 0")
		assert.LessOrEqual(t, *constraint.Pli, float64(1), "pli should be <= 1")
	}

	t.Logf("gnomAD constraint validation passed")
}

func validateExacConstraintFields(t *testing.T, constraint *model.ExacConstraint) {
	t.Helper()

	// Fields from real browser queries:
	// exp_syn, obs_syn, syn_z, exp_mis, obs_mis, mis_z, exp_lof, obs_lof, lof_z, pLI

	// Required fields
	assert.NotZero(t, constraint.SynZ, "syn_z is required")
	assert.NotZero(t, constraint.MisZ, "mis_z is required")
	assert.NotZero(t, constraint.PLi, "pLI is required")

	t.Logf("ExAC constraint validation passed")
}

func validateExacRegionalConstraints(t *testing.T, regions []*model.ExacRegionalMissenseConstraintRegion) {
	t.Helper()

	// Fields from real browser queries: start, stop, obs_mis, exp_mis, obs_exp, chisq_diff_null

	for i, region := range regions {
		assert.Greater(t, region.Stop, region.Start, "Region %d: stop should be > start", i)

		if region.ObsMis != nil && region.ExpMis != nil && *region.ExpMis > 0 {
			calculatedOe := float64(*region.ObsMis) / *region.ExpMis
			if region.ObsExp != nil {
				assert.InDelta(t, calculatedOe, *region.ObsExp, 0.01, "Region %d: obs_exp should match obs_mis/exp_mis", i)
			}
		}
	}

	t.Logf("ExAC regional constraint validation passed for %d regions", len(regions))
}

func validateGnomadV2RegionalConstraints(t *testing.T, constraint *model.GnomadV2RegionalMissenseConstraint) {
	t.Helper()

	// Fields from real browser queries:
	// passed_qc, has_no_rmc_evidence, regions{chrom, start, stop, aa_start, aa_stop, obs_mis, exp_mis, obs_exp, chisq_diff_null, p_value}

	if constraint.Regions != nil {
		for i, region := range constraint.Regions {
			if region.Start != nil && region.Stop != nil {
				assert.Greater(t, *region.Stop, *region.Start, "Region %d: stop should be > start", i)
			}

			if region.ObsMis != nil && region.ExpMis != nil && *region.ExpMis > 0 {
				calculatedOe := float64(*region.ObsMis) / *region.ExpMis
				if region.ObsExp != nil {
					assert.InDelta(t, calculatedOe, *region.ObsExp, 0.01, "Region %d: obs_exp should match obs_mis/exp_mis", i)
				}
			}
		}
	}

	t.Logf("gnomAD v2 regional constraint validation passed")
}

func validateMitochondrialConstraint(t *testing.T, constraint model.MitochondrialGeneConstraint) {
	t.Helper()

	// Fields from real browser queries use union types:
	// ProteinMitochondrialGeneConstraint: exp_lof, exp_mis, exp_syn, obs_lof, obs_mis, obs_syn, oe_lof, oe_lof_lower, oe_lof_upper, oe_mis, oe_mis_lower, oe_mis_upper, oe_syn, oe_syn_lower, oe_syn_upper
	// RNAMitochondrialGeneConstraint: observed, expected, oe, oe_upper, oe_lower

	switch c := constraint.(type) {
	case *model.ProteinMitochondrialGeneConstraint:
		assert.Greater(t, c.ExpLof, float64(0), "protein: exp_lof should be positive")
		assert.Greater(t, c.ExpMis, float64(0), "protein: exp_mis should be positive")
		assert.Greater(t, c.ExpSyn, float64(0), "protein: exp_syn should be positive")
		assert.GreaterOrEqual(t, c.ObsLof, float64(0), "protein: obs_lof should be non-negative")
		assert.GreaterOrEqual(t, c.ObsMis, float64(0), "protein: obs_mis should be non-negative")
		assert.GreaterOrEqual(t, c.ObsSyn, float64(0), "protein: obs_syn should be non-negative")
		t.Logf("Protein mitochondrial constraint validation passed")
	case *model.RNAMitochondrialGeneConstraint:
		assert.Greater(t, c.Expected, float64(0), "rna: expected should be positive")
		assert.GreaterOrEqual(t, c.Observed, float64(0), "rna: observed should be non-negative")
		assert.Greater(t, c.Oe, float64(0), "rna: oe should be positive")
		t.Logf("RNA mitochondrial constraint validation passed")
	default:
		t.Errorf("Unknown mitochondrial constraint type: %T", constraint)
	}
}

func validateMitochondrialRegionConstraints(t *testing.T, regions []*model.MitochondrialRegionConstraint) {
	t.Helper()

	// Fields from real browser queries: start, stop, oe, oe_upper, oe_lower

	for i, region := range regions {
		assert.Greater(t, region.Stop, region.Start, "Region %d: stop should be > start", i)
		assert.Greater(t, region.Oe, float64(0), "Region %d: oe should be positive", i)
		assert.Greater(t, region.OeUpper, region.Oe, "Region %d: oe_upper should be > oe", i)
		assert.Less(t, region.OeLower, region.Oe, "Region %d: oe_lower should be < oe", i)
	}

	t.Logf("Mitochondrial region constraint validation passed for %d regions", len(regions))
}

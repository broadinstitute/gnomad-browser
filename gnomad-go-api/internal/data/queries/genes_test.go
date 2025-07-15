package queries

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGeneIndices(t *testing.T) {
	// Test that gene indices are properly defined
	assert.Equal(t, "genes_grch37", geneIndices["GRCh37"])
	assert.Equal(t, "genes_grch38", geneIndices["GRCh38"])
}

func TestConvertGeneDocumentToGraphQL(t *testing.T) {
	// Test basic gene document conversion
	doc := &GeneDocument{
		Value: GeneDocumentValue{
			GeneID:        "ENSG00000169174",
			GeneVersion:   "1",
			Symbol:        "PCSK9",
			GencodeSymbol: "PCSK9",
			Chrom:         "1",
			Start:         55039548,
			Stop:          55064853,
			Strand:        "+",
			Flags:         []string{},
			Exons: []ExonDocument{
				{
					FeatureType: "CDS",
					Start:       55039548,
					Stop:        55039648,
				},
			},
			Transcripts: []TranscriptDocument{
				{
					TranscriptID:      "ENST00000302118",
					TranscriptVersion: "5",
					Chrom:             "1",
					Start:             55039548,
					Stop:              55064853,
					Strand:            "+",
					Exons: []ExonDocument{
						{
							FeatureType: "CDS",
							Start:       55039548,
							Stop:        55039648,
						},
					},
				},
			},
		},
	}

	gene := convertGeneDocumentToGraphQL(doc, "GRCh38")

	// Verify basic fields
	assert.Equal(t, "ENSG00000169174", gene.GeneID)
	assert.Equal(t, "1", gene.GeneVersion)
	assert.Equal(t, "PCSK9", gene.Symbol)
	assert.Equal(t, "PCSK9", gene.GencodeSymbol)
	assert.Equal(t, "1", gene.Chrom)
	assert.Equal(t, 55039548, gene.Start)
	assert.Equal(t, 55064853, gene.Stop)
	assert.Equal(t, "+", gene.Strand)

	// Verify exons
	require.Len(t, gene.Exons, 1)
	assert.Equal(t, "CDS", gene.Exons[0].FeatureType)
	assert.Equal(t, 55039548, gene.Exons[0].Start)
	assert.Equal(t, 55039648, gene.Exons[0].Stop)

	// Verify transcripts
	require.Len(t, gene.Transcripts, 1)
	assert.Equal(t, "ENST00000302118", gene.Transcripts[0].TranscriptID)
	assert.Equal(t, "5", gene.Transcripts[0].TranscriptVersion)

	// Verify default cooccurrence counts
	assert.NotNil(t, gene.HeterozygousVariantCooccurrenceCounts)
	assert.NotNil(t, gene.HomozygousVariantCooccurrenceCounts)
	assert.Len(t, gene.HeterozygousVariantCooccurrenceCounts, 0)
	assert.Len(t, gene.HomozygousVariantCooccurrenceCounts, 0)
}

func TestConvertGeneWithConstraints(t *testing.T) {
	// Test gene document with constraint data
	doc := &GeneDocument{
		Value: GeneDocumentValue{
			GeneID: "ENSG00000169174",
			Symbol: "PCSK9",
			Chrom:  "1",
			Start:  55039548,
			Stop:   55064853,
			Strand: "+",
			GnomadConstraint: &GnomadConstraintDoc{
				ExpMis: 50.5,
				ObsMis: intPtr(30),
				OeMis:  0.594,
				MisZ:   2.5,
				SynZ:   0.1,
				Pli:    float64Ptr(0.95),
			},
			ExacConstraint: &ExacConstraintDoc{
				SynZ: 0.5,
				MisZ: 1.5,
				Pli:  float64Ptr(0.85),
			},
		},
	}

	gene := convertGeneDocumentToGraphQL(doc, "GRCh38")

	// Verify gnomAD constraint
	require.NotNil(t, gene.GnomadConstraint)
	assert.Equal(t, 50.5, gene.GnomadConstraint.ExpMis)
	assert.Equal(t, 30, *gene.GnomadConstraint.ObsMis)
	assert.Equal(t, 0.594, gene.GnomadConstraint.OeMis)
	assert.Equal(t, 2.5, gene.GnomadConstraint.MisZ)
	assert.Equal(t, 0.1, gene.GnomadConstraint.SynZ)
	assert.Equal(t, 0.95, *gene.GnomadConstraint.Pli)
	assert.Equal(t, 0.95, *gene.GnomadConstraint.PLi) // Deprecated field

	// Verify ExAC constraint
	require.NotNil(t, gene.ExacConstraint)
	assert.Equal(t, 0.5, gene.ExacConstraint.SynZ)
	assert.Equal(t, 1.5, gene.ExacConstraint.MisZ)
	assert.Equal(t, 0.85, *gene.ExacConstraint.Pli)
	assert.Equal(t, 0.85, gene.ExacConstraint.PLi) // Deprecated field
}

func TestConvertGeneWithPext(t *testing.T) {
	// Test gene document with pext data
	doc := &GeneDocument{
		Value: GeneDocumentValue{
			GeneID: "ENSG00000169174",
			Symbol: "PCSK9",
			Chrom:  "1",
			Start:  55039548,
			Stop:   55064853,
			Strand: "+",
			Pext: &PextDocument{
				Regions: []PextRegionDocument{
					{
						Start: 55039548,
						Stop:  55039648,
						Mean:  0.85,
						Tissues: []PextRegionTissueDocument{
							{
								Tissue: stringPtr("brain"),
								Value:  float64Ptr(0.9),
							},
							{
								Tissue: stringPtr("heart"),
								Value:  float64Ptr(0.8),
							},
						},
					},
				},
				Flags: []string{"low_max_pext"},
			},
		},
	}

	gene := convertGeneDocumentToGraphQL(doc, "GRCh38")

	// Verify Pext data
	require.NotNil(t, gene.Pext)
	require.Len(t, gene.Pext.Regions, 1)
	assert.Equal(t, 55039548, gene.Pext.Regions[0].Start)
	assert.Equal(t, 55039648, gene.Pext.Regions[0].Stop)
	assert.Equal(t, 0.85, gene.Pext.Regions[0].Mean)

	// Verify tissues
	require.Len(t, gene.Pext.Regions[0].Tissues, 2)
	assert.Equal(t, "brain", *gene.Pext.Regions[0].Tissues[0].Tissue)
	assert.Equal(t, 0.9, *gene.Pext.Regions[0].Tissues[0].Value)
	assert.Equal(t, "heart", *gene.Pext.Regions[0].Tissues[1].Tissue)
	assert.Equal(t, 0.8, *gene.Pext.Regions[0].Tissues[1].Value)

	// Verify flags
	require.Len(t, gene.Pext.Flags, 1)
	assert.Equal(t, "low_max_pext", gene.Pext.Flags[0])
}

// Helper functions for tests
func intPtr(i int) *int {
	return &i
}

func float64Ptr(f float64) *float64 {
	return &f
}

func stringPtr(s string) *string {
	return &s
}

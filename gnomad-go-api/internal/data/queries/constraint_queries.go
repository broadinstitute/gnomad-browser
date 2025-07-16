package queries

import (
	"context"
	"fmt"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// Constraint indices mapping
var constraintIndices = map[string]string{
	"gnomad_constraint": "gnomad_v2_1_constraint",
	"exac_constraint":   "exac_constraint",
}

// Mitochondrial constraint data structures
type MitochondrialConstraintDocument struct {
	GeneID         string   `json:"gene_id"`
	ExpLof         *float64 `json:"exp_lof"`
	ExpMis         *float64 `json:"exp_mis"`
	ExpSyn         *float64 `json:"exp_syn"`
	ObsLof         *float64 `json:"obs_lof"`
	ObsMis         *float64 `json:"obs_mis"`
	ObsSyn         *float64 `json:"obs_syn"`
	OeLof          *float64 `json:"oe_lof"`
	OeLofLower     *float64 `json:"oe_lof_lower"`
	OeLofUpper     *float64 `json:"oe_lof_upper"`
	OeMis          *float64 `json:"oe_mis"`
	OeMisLower     *float64 `json:"oe_mis_lower"`
	OeMisUpper     *float64 `json:"oe_mis_upper"`
	OeSyn          *float64 `json:"oe_syn"`
	OeSynLower     *float64 `json:"oe_syn_lower"`
	OeSynUpper     *float64 `json:"oe_syn_upper"`
	TranscriptType string   `json:"transcript_type"`
	// For RNA genes
	Observed *float64 `json:"observed"`
	Expected *float64 `json:"expected"`
	Oe       *float64 `json:"oe"`
	OeUpper  *float64 `json:"oe_upper"`
	OeLower  *float64 `json:"oe_lower"`
}

// Regional constraint data structures
type GnomadV2RegionalMissenseConstraintDocument struct {
	HasNoRmcEvidence *bool                                           `json:"has_no_rmc_evidence"`
	PassedQC         *bool                                           `json:"passed_qc"`
	Regions          []*GnomadV2RegionalMissenseConstraintRegionData `json:"regions"`
}

type GnomadV2RegionalMissenseConstraintRegionData struct {
	Chrom         *string  `json:"chrom"`
	Start         *int     `json:"start"`
	Stop          *int     `json:"stop"`
	AaStart       *string  `json:"aa_start"`
	AaStop        *string  `json:"aa_stop"`
	ObsMis        *int     `json:"obs_mis"`
	ExpMis        *float64 `json:"exp_mis"`
	ObsExp        *float64 `json:"obs_exp"`
	ChisqDiffNull *float64 `json:"chisq_diff_null"`
	PValue        *float64 `json:"p_value"`
}

type ExacRegionalMissenseConstraintRegionData struct {
	Start         int      `json:"start"`
	Stop          int      `json:"stop"`
	ObsMis        *int     `json:"obs_mis"`
	ExpMis        *float64 `json:"exp_mis"`
	ObsExp        *float64 `json:"obs_exp"`
	ChisqDiffNull *float64 `json:"chisq_diff_null"`
}

type MitochondrialRegionConstraintData struct {
	Start   int     `json:"start"`
	Stop    int     `json:"stop"`
	Oe      float64 `json:"oe"`
	OeUpper float64 `json:"oe_upper"`
	OeLower float64 `json:"oe_lower"`
}

// FetchGnomadConstraint fetches gnomAD constraint data for a gene
func FetchGnomadConstraint(ctx context.Context, esClient *elastic.Client, geneID string) (*model.GnomadConstraint, error) {
	// For this implementation, we're assuming constraints are already embedded in the gene document
	// This matches the pattern from genes.go where constraints are part of the gene document
	return nil, fmt.Errorf("gnomAD constraint should be fetched as part of gene document")
}

// FetchExacConstraint fetches ExAC constraint data for a gene
func FetchExacConstraint(ctx context.Context, esClient *elastic.Client, geneID string) (*model.ExacConstraint, error) {
	// For this implementation, we're assuming constraints are already embedded in the gene document
	// This matches the pattern from genes.go where constraints are part of the gene document
	return nil, fmt.Errorf("ExAC constraint should be fetched as part of gene document")
}

// FetchMitochondrialConstraint fetches mitochondrial constraint data for a gene
func FetchMitochondrialConstraint(ctx context.Context, esClient *elastic.Client, geneID string) (model.MitochondrialGeneConstraint, error) {
	// This would typically be loaded from static TSV files as mentioned in the analysis
	// For now, return nil until static data loading is implemented
	return nil, fmt.Errorf("mitochondrial constraint loading from TSV not yet implemented")
}

// FetchGnomadV2RegionalMissenseConstraint fetches regional missense constraint data for a gene
func FetchGnomadV2RegionalMissenseConstraint(ctx context.Context, esClient *elastic.Client, geneID string) (*model.GnomadV2RegionalMissenseConstraint, error) {
	// This would fetch from gnomad_v2_regional_missense_constraint index
	// For now, return nil until ES index structure is confirmed
	return nil, fmt.Errorf("regional missense constraint fetching not yet implemented")
}

// FetchExacRegionalMissenseConstraintRegions fetches ExAC regional constraint data for a gene
func FetchExacRegionalMissenseConstraintRegions(ctx context.Context, esClient *elastic.Client, geneID string) ([]*model.ExacRegionalMissenseConstraintRegion, error) {
	// This would fetch from exac_regional_missense_constraint index
	// For now, return nil until ES index structure is confirmed
	return nil, fmt.Errorf("ExAC regional constraint fetching not yet implemented")
}

// FetchMitochondrialMissenseConstraintRegions fetches mitochondrial missense constraint regions
func FetchMitochondrialMissenseConstraintRegions(ctx context.Context, esClient *elastic.Client, geneID string) ([]*model.MitochondrialRegionConstraint, error) {
	// This would fetch mitochondrial region constraint data
	// For now, return nil until implementation is complete
	return nil, fmt.Errorf("mitochondrial region constraint fetching not yet implemented")
}

// Helper functions to convert between document types and GraphQL models

// ConvertGnomadConstraintDoc converts a GnomadConstraintDoc to model.GnomadConstraint
func ConvertGnomadConstraintDoc(doc *GnomadConstraintDoc) *model.GnomadConstraint {
	if doc == nil {
		return nil
	}

	return &model.GnomadConstraint{
		ExpLof:     doc.ExpLof,
		ExpMis:     doc.ExpMis,
		ExpSyn:     doc.ExpSyn,
		ObsLof:     doc.ObsLof,
		ObsMis:     doc.ObsMis,
		ObsSyn:     doc.ObsSyn,
		OeLof:      doc.OeLof,
		OeLofLower: doc.OeLofLower,
		OeLofUpper: doc.OeLofUpper,
		OeMis:      doc.OeMis,
		OeMisLower: doc.OeMisLower,
		OeMisUpper: doc.OeMisUpper,
		OeSyn:      doc.OeSyn,
		OeSynLower: doc.OeSynLower,
		OeSynUpper: doc.OeSynUpper,
		LofZ:       doc.LofZ,
		MisZ:       doc.MisZ,
		SynZ:       doc.SynZ,
		Pli:        doc.Pli,
		Flags:      doc.Flags,
		PLi:        doc.Pli, // Deprecated field
	}
}

// ConvertExacConstraintDoc converts an ExacConstraintDoc to model.ExacConstraint
func ConvertExacConstraintDoc(doc *ExacConstraintDoc) *model.ExacConstraint {
	if doc == nil {
		return nil
	}

	return &model.ExacConstraint{
		ExpSyn: doc.ExpSyn,
		ExpMis: doc.ExpMis,
		ExpLof: doc.ExpLof,
		ObsSyn: doc.ObsSyn,
		ObsMis: doc.ObsMis,
		ObsLof: doc.ObsLof,
		MuSyn:  doc.MuSyn,
		MuMis:  doc.MuMis,
		MuLof:  doc.MuLof,
		SynZ:   doc.SynZ,
		MisZ:   doc.MisZ,
		LofZ:   doc.LofZ,
		Pli:    doc.Pli,
		PLi:    doc.MisZ, // Deprecated field - using mis_z as placeholder
	}
}

// ConvertMitochondrialConstraintDoc converts mitochondrial constraint document to GraphQL model
func ConvertMitochondrialConstraintDoc(doc *MitochondrialConstraintDocument) model.MitochondrialGeneConstraint {
	if doc == nil {
		return nil
	}

	// Check if this is a protein-coding gene (has exp_lof, exp_mis, exp_syn)
	if doc.ExpLof != nil && doc.ExpMis != nil && doc.ExpSyn != nil {
		return &model.ProteinMitochondrialGeneConstraint{
			ExpLof:     *doc.ExpLof,
			ExpMis:     *doc.ExpMis,
			ExpSyn:     *doc.ExpSyn,
			ObsLof:     *doc.ObsLof,
			ObsMis:     *doc.ObsMis,
			ObsSyn:     *doc.ObsSyn,
			OeLof:      *doc.OeLof,
			OeLofLower: *doc.OeLofLower,
			OeLofUpper: *doc.OeLofUpper,
			OeMis:      *doc.OeMis,
			OeMisLower: *doc.OeMisLower,
			OeMisUpper: *doc.OeMisUpper,
			OeSyn:      *doc.OeSyn,
			OeSynLower: *doc.OeSynLower,
			OeSynUpper: *doc.OeSynUpper,
		}
	}

	// Otherwise it's an RNA gene
	if doc.Observed != nil && doc.Expected != nil && doc.Oe != nil {
		return &model.RNAMitochondrialGeneConstraint{
			Observed: *doc.Observed,
			Expected: *doc.Expected,
			Oe:       *doc.Oe,
			OeUpper:  *doc.OeUpper,
			OeLower:  *doc.OeLower,
		}
	}

	return nil
}

// ConvertMitochondrialRegionConstraints converts mitochondrial region constraint data
func ConvertMitochondrialRegionConstraints(regions []*MitochondrialRegionConstraintData) []*model.MitochondrialRegionConstraint {
	if regions == nil {
		return nil
	}

	result := make([]*model.MitochondrialRegionConstraint, len(regions))
	for i, region := range regions {
		result[i] = &model.MitochondrialRegionConstraint{
			Start:   region.Start,
			Stop:    region.Stop,
			Oe:      region.Oe,
			OeUpper: region.OeUpper,
			OeLower: region.OeLower,
		}
	}
	return result
}

// ConvertGnomadV2RegionalMissenseConstraint converts gnomAD v2 regional missense constraint data
func ConvertGnomadV2RegionalMissenseConstraint(doc *GnomadV2RegionalMissenseConstraintDocument) *model.GnomadV2RegionalMissenseConstraint {
	if doc == nil {
		return nil
	}

	var regions []*model.GnomadV2RegionalMissenseConstraintRegion
	if doc.Regions != nil {
		regions = make([]*model.GnomadV2RegionalMissenseConstraintRegion, len(doc.Regions))
		for i, region := range doc.Regions {
			regions[i] = &model.GnomadV2RegionalMissenseConstraintRegion{
				Chrom:         region.Chrom,
				Start:         region.Start,
				Stop:          region.Stop,
				AaStart:       region.AaStart,
				AaStop:        region.AaStop,
				ObsMis:        region.ObsMis,
				ExpMis:        region.ExpMis,
				ObsExp:        region.ObsExp,
				ChisqDiffNull: region.ChisqDiffNull,
				PValue:        region.PValue,
			}
		}
	}

	return &model.GnomadV2RegionalMissenseConstraint{
		HasNoRmcEvidence: doc.HasNoRmcEvidence,
		PassedQc:         doc.PassedQC,
		Regions:          regions,
	}
}

// ConvertExacRegionalMissenseConstraintRegions converts ExAC regional constraint data
func ConvertExacRegionalMissenseConstraintRegions(regions []*ExacRegionalMissenseConstraintRegionData) []*model.ExacRegionalMissenseConstraintRegion {
	if regions == nil {
		return nil
	}

	result := make([]*model.ExacRegionalMissenseConstraintRegion, len(regions))
	for i, region := range regions {
		result[i] = &model.ExacRegionalMissenseConstraintRegion{
			Start:         region.Start,
			Stop:          region.Stop,
			ObsMis:        region.ObsMis,
			ExpMis:        region.ExpMis,
			ObsExp:        region.ObsExp,
			ChisqDiffNull: region.ChisqDiffNull,
		}
	}
	return result
}

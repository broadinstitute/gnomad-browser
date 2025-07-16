// Package model contains the GraphQL model types for the gnomAD API.
package model

// DatasetID represents the available gnomAD dataset identifiers.
type DatasetID string

const (
	DatasetIDExac                       DatasetID = "exac"
	DatasetIDGnomadR21                  DatasetID = "gnomad_r2_1"
	DatasetIDGnomadR21Controls          DatasetID = "gnomad_r2_1_controls"
	DatasetIDGnomadR21NonCancer         DatasetID = "gnomad_r2_1_non_cancer"
	DatasetIDGnomadR21NonNeuro          DatasetID = "gnomad_r2_1_non_neuro"
	DatasetIDGnomadR21NonTopmed         DatasetID = "gnomad_r2_1_non_topmed"
	DatasetIDGnomadR3                   DatasetID = "gnomad_r3"
	DatasetIDGnomadR3ControlsAndBiobanks DatasetID = "gnomad_r3_controls_and_biobanks"
	DatasetIDGnomadR3NonCancer          DatasetID = "gnomad_r3_non_cancer"
	DatasetIDGnomadR3NonNeuro           DatasetID = "gnomad_r3_non_neuro"
	DatasetIDGnomadR3NonTopmed          DatasetID = "gnomad_r3_non_topmed"
	DatasetIDGnomadR3NonV2              DatasetID = "gnomad_r3_non_v2"
	DatasetIDGnomadR3Genomes            DatasetID = "gnomad_r3_genomes"
	DatasetIDGnomadR4                   DatasetID = "gnomad_r4"
	DatasetIDGnomadR4NonUkb             DatasetID = "gnomad_r4_non_ukb"
)

// ReferenceGenomeID represents the available reference genome identifiers.
type ReferenceGenomeID string

const (
	ReferenceGenomeIDGRCh37 ReferenceGenomeID = "GRCh37"
	ReferenceGenomeIDGRCh38 ReferenceGenomeID = "GRCh38"
)

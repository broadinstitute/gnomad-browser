// Package model contains the GraphQL model types for the gnomAD API.
package model

// DatasetID represents the available gnomAD dataset identifiers.
type DatasetID string

const (
	DatasetIDGnomadR4       DatasetID = "gnomad_r4"
	DatasetIDGnomadR4NonUkb DatasetID = "gnomad_r4_non_ukb"
	DatasetIDGnomadR21      DatasetID = "gnomad_r2_1"
)

// ReferenceGenomeID represents the available reference genome identifiers.
type ReferenceGenomeID string

const (
	ReferenceGenomeIDGRCh37 ReferenceGenomeID = "GRCh37"
	ReferenceGenomeIDGRCh38 ReferenceGenomeID = "GRCh38"
)

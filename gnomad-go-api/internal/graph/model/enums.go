package model

type DatasetId string

const (
	DatasetIdGnomadR4       DatasetId = "gnomad_r4"
	DatasetIdGnomadR4NonUkb DatasetId = "gnomad_r4_non_ukb"
	DatasetIdGnomadR21      DatasetId = "gnomad_r2_1"
)

type ReferenceGenomeId string

const (
	ReferenceGenomeIdGRCh37 ReferenceGenomeId = "GRCh37"
	ReferenceGenomeIdGRCh38 ReferenceGenomeId = "GRCh38"
)

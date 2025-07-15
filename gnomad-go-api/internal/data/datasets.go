package data

type DatasetConfig struct {
	ID              string
	ReferenceGenome string
	HasExome        bool
	HasGenome       bool
	HasJoint        bool
}

var Datasets = map[string]DatasetConfig{
	"gnomad_r4": {
		ID:              "gnomad_r4",
		ReferenceGenome: "GRCh38",
		HasExome:        true,
		HasGenome:       true,
		HasJoint:        true,
	},
	"gnomad_r4_non_ukb": {
		ID:              "gnomad_r4_non_ukb",
		ReferenceGenome: "GRCh38",
		HasExome:        true,
		HasGenome:       true,
		HasJoint:        true,
	},
	"gnomad_r3": {
		ID:              "gnomad_r3",
		ReferenceGenome: "GRCh38",
		HasExome:        false,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r3_controls_and_biobanks": {
		ID:              "gnomad_r3_controls_and_biobanks",
		ReferenceGenome: "GRCh38",
		HasExome:        false,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r3_non_cancer": {
		ID:              "gnomad_r3_non_cancer",
		ReferenceGenome: "GRCh38",
		HasExome:        false,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r3_non_neuro": {
		ID:              "gnomad_r3_non_neuro",
		ReferenceGenome: "GRCh38",
		HasExome:        false,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r3_non_topmed": {
		ID:              "gnomad_r3_non_topmed",
		ReferenceGenome: "GRCh38",
		HasExome:        false,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r3_non_v2": {
		ID:              "gnomad_r3_non_v2",
		ReferenceGenome: "GRCh38",
		HasExome:        false,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r2_1": {
		ID:              "gnomad_r2_1",
		ReferenceGenome: "GRCh37",
		HasExome:        true,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r2_1_controls": {
		ID:              "gnomad_r2_1_controls",
		ReferenceGenome: "GRCh37",
		HasExome:        true,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r2_1_non_cancer": {
		ID:              "gnomad_r2_1_non_cancer",
		ReferenceGenome: "GRCh37",
		HasExome:        true,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r2_1_non_neuro": {
		ID:              "gnomad_r2_1_non_neuro",
		ReferenceGenome: "GRCh37",
		HasExome:        true,
		HasGenome:       true,
		HasJoint:        false,
	},
	"gnomad_r2_1_non_topmed": {
		ID:              "gnomad_r2_1_non_topmed",
		ReferenceGenome: "GRCh37",
		HasExome:        true,
		HasGenome:       true,
		HasJoint:        false,
	},
	"exac": {
		ID:              "exac",
		ReferenceGenome: "GRCh37",
		HasExome:        true,
		HasGenome:       false,
		HasJoint:        false,
	},
	"gnomad_sv_r2_1": {
		ID:              "gnomad_sv_r2_1",
		ReferenceGenome: "GRCh37",
		HasExome:        false,
		HasGenome:       false,
		HasJoint:        false,
	},
	"gnomad_sv_r2_1_controls": {
		ID:              "gnomad_sv_r2_1_controls",
		ReferenceGenome: "GRCh37",
		HasExome:        false,
		HasGenome:       false,
		HasJoint:        false,
	},
	"gnomad_sv_r2_1_non_neuro": {
		ID:              "gnomad_sv_r2_1_non_neuro",
		ReferenceGenome: "GRCh37",
		HasExome:        false,
		HasGenome:       false,
		HasJoint:        false,
	},
	"gnomad_sv_r4": {
		ID:              "gnomad_sv_r4",
		ReferenceGenome: "GRCh38",
		HasExome:        false,
		HasGenome:       false,
		HasJoint:        false,
	},
	"gnomad_cnv_r4": {
		ID:              "gnomad_cnv_r4",
		ReferenceGenome: "GRCh38",
		HasExome:        false,
		HasGenome:       false,
		HasJoint:        false,
	},
}

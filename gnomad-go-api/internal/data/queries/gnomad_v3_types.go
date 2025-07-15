package queries

// GnomadV3VariantDocument represents the ES document structure for gnomAD v3 variants
type GnomadV3VariantDocument struct {
	VariantID       string   `json:"variant_id"`
	ReferenceGenome string   `json:"reference_genome"`
	Chrom           string   `json:"chrom"`
	Pos             int      `json:"pos"`
	Ref             string   `json:"ref"`
	Alt             string   `json:"alt"`
	CAID            string   `json:"caid"`
	RSIDs           []string `json:"rsids"`

	// Position info
	Locus struct {
		Contig   string `json:"contig"` // chr-prefixed
		Position int    `json:"position"`
	} `json:"locus"`

	// Alleles array (ref is first, alts follow)
	Alleles []string `json:"alleles"`

	// Frequency data (v3 only has genome data)
	Genome *GnomadV3GenomeData `json:"genome"`

	// Annotations
	TranscriptConsequences []map[string]interface{}   `json:"transcript_consequences"`
	InSilicoPredictors     GnomadV3InSilicoPredictors `json:"in_silico_predictors"`
	ColocatedVariants      map[string][]string        `json:"colocated_variants"` // subset-specific arrays
	Flags                  []string                   `json:"flags"`
}

// GnomadV3GenomeData represents genome frequency data for gnomAD v3
type GnomadV3GenomeData struct {
	// Subset-specific frequency data
	Freq map[string]*GnomadV3FrequencyData `json:"freq"` // keyed by subset: "all", "non_v2", "non_cancer", "non_neuro", "non_topmed", "controls_and_biobanks"

	// Quality metrics
	QualityMetrics struct {
		AlleleBalance struct {
			AltAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_adj"`
		} `json:"allele_balance"`
		GenotypeDepth struct {
			AllAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"all_adj"`
			AltAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_adj"`
		} `json:"genotype_depth"`
		GenotypeQuality struct {
			AllAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"all_adj"`
			AltAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_adj"`
		} `json:"genotype_quality"`
		SiteQualityMetrics []struct {
			Metric string  `json:"metric"`
			Value  float64 `json:"value"`
		} `json:"site_quality_metrics"`
	} `json:"quality_metrics"`

	// Filters applied at genome level
	Filters []string `json:"filters"`
	Flags   []string `json:"flags"`
}

// GnomadV3FrequencyData represents frequency data for a specific subset
type GnomadV3FrequencyData struct {
	AC              int      `json:"ac"`
	AN              int      `json:"an"`
	ACRaw           int      `json:"ac_raw"`
	ANRaw           int      `json:"an_raw"`
	HomozygoteCount int      `json:"homozygote_count"`
	HemizygoteCount int      `json:"hemizygote_count"`
	Filters         []string `json:"filters"`

	// Population data
	Populations []GnomadV3PopulationData `json:"populations"`

	// Special population subsets
	HGDP *struct {
		AC          int                      `json:"ac"`
		AN          int                      `json:"an"`
		ACRaw       int                      `json:"ac_raw"`
		ANRaw       int                      `json:"an_raw"`
		Populations []GnomadV3PopulationData `json:"populations"`
	} `json:"hgdp,omitempty"`

	TGP *struct {
		AC          int                      `json:"ac"`
		AN          int                      `json:"an"`
		ACRaw       int                      `json:"ac_raw"`
		ANRaw       int                      `json:"an_raw"`
		Populations []GnomadV3PopulationData `json:"populations"`
	} `json:"tgp,omitempty"`
}

// GnomadV3PopulationData represents population-specific frequency data
type GnomadV3PopulationData struct {
	ID              string `json:"id"`
	AC              int    `json:"ac"`
	AN              int    `json:"an"`
	HomozygoteCount int    `json:"homozygote_count"`
	HemizygoteCount int    `json:"hemizygote_count"`
}

// GnomadV3InSilicoPredictors represents in-silico predictor data for gnomAD v3
type GnomadV3InSilicoPredictors struct {
	CADD *struct {
		Phred        *float64 `json:"phred"`
		HasDuplicate bool     `json:"has_duplicate"`
	} `json:"cadd"`

	REVEL *struct {
		REVELScore   *float64 `json:"revel_score"`
		HasDuplicate bool     `json:"has_duplicate"`
	} `json:"revel"`

	SpliceAI *struct {
		SpliceAIScore     *float64 `json:"splice_ai_score"`
		SpliceConsequence string   `json:"splice_consequence"`
		HasDuplicate      bool     `json:"has_duplicate"`
	} `json:"splice_ai"`

	PrimateAI *struct {
		PrimateAIScore *float64 `json:"primate_ai_score"`
		HasDuplicate   bool     `json:"has_duplicate"`
	} `json:"primate_ai"`
}

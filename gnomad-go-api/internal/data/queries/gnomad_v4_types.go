package queries

// GnomadV4VariantDocument represents the ES document structure for gnomAD v4 variants
type GnomadV4VariantDocument struct {
	VariantID       string                 `json:"variant_id"`
	ReferenceGenome string                 `json:"reference_genome"`
	Chrom           string                 `json:"chrom"`
	Pos             int                    `json:"pos"`
	Ref             string                 `json:"ref"`
	Alt             string                 `json:"alt"`
	AlleleID        string                 `json:"allele_id"` // VRS ID (ga4gh: prefixed)
	CAID            string                 `json:"caid"`      // CAID (Canonical Allele ID)
	RSIDs           []string               `json:"rsids"`
	VRS             map[string]interface{} `json:"vrs"`

	// Position info
	Locus struct {
		Contig   string `json:"contig"` // chr-prefixed
		Position int    `json:"position"`
	} `json:"locus"`

	// Alleles array (ref is first, alts follow)
	Alleles []string `json:"alleles"`

	// Frequency data
	Exome  *GnomadV4SequencingData `json:"exome"`
	Genome *GnomadV4SequencingData `json:"genome"`
	Joint  *GnomadV4JointData      `json:"joint"`

	// Annotations
	TranscriptConsequences  []map[string]interface{} `json:"transcript_consequences"`
	InSilicoPredictors      map[string]interface{}   `json:"in_silico_predictors"`
	ColocatedVariants       map[string][]string      `json:"colocated_variants"` // subset-specific arrays
	MultiNucleotideVariants []map[string]interface{} `json:"multi_nucleotide_variants"`
	Flags                   []string                 `json:"flags"`
	LofCuration             map[string]interface{}   `json:"lof_curation"`
}

// GnomadV4SequencingData represents exome/genome frequency data
type GnomadV4SequencingData struct {
	// Top-level frequency data
	Freq map[string]*GnomadV4FrequencyData `json:"freq"` // keyed by subset: "all", "non_ukb"

	// Quality metrics
	QualityMetrics struct {
		AlleleBalance struct {
			AltAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NLarger  int       `json:"n_larger"`
				NSmaller int       `json:"n_smaller"`
			} `json:"alt_adj"`
		} `json:"allele_balance"`
		GenotypeDepth struct {
			AllAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NLarger  int       `json:"n_larger"`
				NSmaller int       `json:"n_smaller"`
			} `json:"all_adj"`
			AltAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NLarger  int       `json:"n_larger"`
				NSmaller int       `json:"n_smaller"`
			} `json:"alt_adj"`
		} `json:"genotype_depth"`
		GenotypeQuality struct {
			AllAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NLarger  int       `json:"n_larger"`
				NSmaller int       `json:"n_smaller"`
			} `json:"all_adj"`
			AltAdj struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NLarger  int       `json:"n_larger"`
				NSmaller int       `json:"n_smaller"`
			} `json:"alt_adj"`
		} `json:"genotype_quality"`
		SiteQualityMetrics []struct {
			Metric string  `json:"metric"`
			Value  float64 `json:"value"`
		} `json:"site_quality_metrics"`
	} `json:"quality_metrics"`

	// Age distribution
	AgeDistribution *struct {
		Het struct {
			BinEdges []float64 `json:"bin_edges"`
			BinFreq  []float64 `json:"bin_freq"`
			NLarger  int       `json:"n_larger"`
			NSmaller int       `json:"n_smaller"`
		} `json:"het"`
		Hom struct {
			BinEdges []float64 `json:"bin_edges"`
			BinFreq  []float64 `json:"bin_freq"`
			NLarger  int       `json:"n_larger"`
			NSmaller int       `json:"n_smaller"`
		} `json:"hom"`
	} `json:"age_distribution"`

	// FAF data (grpmax format)
	FAF95 *GnomadV4FAFData `json:"faf95"`
	FAF99 *GnomadV4FAFData `json:"faf99"`
}

// GnomadV4FrequencyData represents frequency data for a specific subset
type GnomadV4FrequencyData struct {
	AC              int      `json:"ac"`
	AN              int      `json:"an"`
	ACRaw           int      `json:"ac_raw"`
	ANRaw           int      `json:"an_raw"`
	HomozygoteCount int      `json:"homozygote_count"`
	HemizygoteCount int      `json:"hemizygote_count"`
	Filters         []string `json:"filters"`

	// Standard ancestry groups
	AncestryGroups []GnomadV4PopulationData `json:"ancestry_groups"`

	// Special population subsets for genome data
	HGDP *struct {
		AC             int                      `json:"ac"`
		AN             int                      `json:"an"`
		ACRaw          int                      `json:"ac_raw"`
		ANRaw          int                      `json:"an_raw"`
		AncestryGroups []GnomadV4PopulationData `json:"ancestry_groups"`
	} `json:"hgdp,omitempty"`

	TGP *struct {
		AC             int                      `json:"ac"`
		AN             int                      `json:"an"`
		ACRaw          int                      `json:"ac_raw"`
		ANRaw          int                      `json:"an_raw"`
		AncestryGroups []GnomadV4PopulationData `json:"ancestry_groups"`
	} `json:"tgp,omitempty"`
}

// GnomadV4JointFrequencyData represents joint frequency data for a specific subset
type GnomadV4JointFrequencyData struct {
	AC              int                      `json:"ac"`
	AN              int                      `json:"an"`
	HomozygoteCount int                      `json:"homozygote_count"`
	HemizygoteCount int                      `json:"hemizygote_count"`
	Filters         []string                 `json:"filters"`
	AncestryGroups  []GnomadV4PopulationData `json:"ancestry_groups"`
}

// GnomadV4JointData represents joint (exome+genome) frequency data
type GnomadV4JointData struct {
	Freq               map[string]*GnomadV4JointFrequencyData `json:"freq"` // keyed by subset: "all", "non_ukb"
	Fafmax             *GnomadV4JointFAFData                   `json:"fafmax"`
	Flags              []string                                `json:"flags"`
	FreqComparisonStats map[string]interface{}                 `json:"freq_comparison_stats"`
}

// GnomadV4JointFAFData represents joint FAF data
type GnomadV4JointFAFData struct {
	Faf95Max       float64 `json:"faf95_max"`
	Faf95MaxGenAnc string  `json:"faf95_max_gen_anc"`
	Faf99Max       float64 `json:"faf99_max"`
	Faf99MaxGenAnc string  `json:"faf99_max_gen_anc"`
}

// GnomadV4PopulationData represents population-specific frequency data
type GnomadV4PopulationData struct {
	ID              string `json:"id"`
	AC              int    `json:"ac"`
	AN              int    `json:"an"`
	HomozygoteCount int    `json:"homozygote_count"`
	HemizygoteCount int    `json:"hemizygote_count"`
}

// GnomadV4FAFData represents filtering allele frequency data (grpmax format)
type GnomadV4FAFData struct {
	Grpmax       float64 `json:"grpmax"`
	GrpmaxGenAnc string  `json:"grpmax_gen_anc"`
}

// LocalAncestryData represents local ancestry population data (fetched separately)
type LocalAncestryData struct {
	ID string `json:"id"`
	AC int    `json:"ac"`
	AN int    `json:"an"`
}

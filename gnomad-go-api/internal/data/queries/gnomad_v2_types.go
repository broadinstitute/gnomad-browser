package queries

// GnomadV2VariantDocument represents the ES document structure for gnomAD v2 variants
type GnomadV2VariantDocument struct {
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
		Contig   string `json:"contig"`   // chr-prefixed
		Position int    `json:"position"`
	} `json:"locus"`
	
	// Alleles array (ref is first, alts follow)
	Alleles []string `json:"alleles"`
	
	// Frequency data (v2 has both exome and genome data)
	Exome  *GnomadV2ExomeData  `json:"exome"`
	Genome *GnomadV2GenomeData `json:"genome"`
	
	// Annotations
	TranscriptConsequences []map[string]interface{} `json:"transcript_consequences"`
	ColocatedVariants      map[string][]string      `json:"colocated_variants"` // subset-specific arrays
	Flags                  []string                 `json:"flags"`
}

// GnomadV2ExomeData represents exome frequency data for gnomAD v2
type GnomadV2ExomeData struct {
	// Subset-specific frequency data (main subsets: gnomad, non_neuro, non_cancer, controls_only)
	Freq map[string]*GnomadV2FrequencyData `json:"freq"`
	
	// Quality metrics - v2 has only raw histograms
	QualityMetrics struct {
		AlleleBalance struct {
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_raw"`
		} `json:"allele_balance"`
		GenotypeDepth struct {
			AllRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"all_raw"`
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_raw"`
		} `json:"genotype_depth"`
		GenotypeQuality struct {
			AllRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"all_raw"`
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_raw"`
		} `json:"genotype_quality"`
		SiteQualityMetrics []struct {
			Metric string  `json:"metric"`
			Value  float64 `json:"value"`
		} `json:"site_quality_metrics"`
	} `json:"quality_metrics"`
	
	// Age distribution by subset
	AgeDistribution map[string]*GnomadV2AgeDistribution `json:"age_distribution"`
	
	// Filters applied at exome level
	Filters []string `json:"filters"`
	Flags   []string `json:"flags"`
}

// GnomadV2GenomeData represents genome frequency data for gnomAD v2
type GnomadV2GenomeData struct {
	// Subset-specific frequency data (gnomad subset converts to gnomad for non_cancer)
	Freq map[string]*GnomadV2FrequencyData `json:"freq"`
	
	// Quality metrics - v2 has only raw histograms
	QualityMetrics struct {
		AlleleBalance struct {
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_raw"`
		} `json:"allele_balance"`
		GenotypeDepth struct {
			AllRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"all_raw"`
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_raw"`
		} `json:"genotype_depth"`
		GenotypeQuality struct {
			AllRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"all_raw"`
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
			} `json:"alt_raw"`
		} `json:"genotype_quality"`
		SiteQualityMetrics []struct {
			Metric string  `json:"metric"`
			Value  float64 `json:"value"`
		} `json:"site_quality_metrics"`
	} `json:"quality_metrics"`
	
	// Age distribution by subset
	AgeDistribution map[string]*GnomadV2AgeDistribution `json:"age_distribution"`
	
	// Filters applied at genome level
	Filters []string `json:"filters"`
	Flags   []string `json:"flags"`
}

// GnomadV2FrequencyData represents frequency data for a specific subset
type GnomadV2FrequencyData struct {
	AC              int      `json:"ac"`
	AN              int      `json:"an"`
	ACRaw           int      `json:"ac_raw"`
	ANRaw           int      `json:"an_raw"`
	HomozygoteCount int      `json:"homozygote_count"`
	HemizygoteCount int      `json:"hemizygote_count"`
	Filters         []string `json:"filters"`
	
	// Population data
	Populations []GnomadV2PopulationData `json:"populations"`
}

// GnomadV2PopulationData represents population frequency data
type GnomadV2PopulationData struct {
	ID              string `json:"id"`
	AC              int    `json:"ac"`
	AN              int    `json:"an"`
	HomozygoteCount int    `json:"homozygote_count"`
	HemizygoteCount int    `json:"hemizygote_count"`
}

// GnomadV2AgeDistribution represents age distribution data
type GnomadV2AgeDistribution struct {
	Het struct {
		BinEdges []float64 `json:"bin_edges"`
		BinFreq  []int     `json:"bin_freq"`
		NSmaller int       `json:"n_smaller"`
		NLarger  int       `json:"n_larger"`
	} `json:"het"`
	Hom struct {
		BinEdges []float64 `json:"bin_edges"`
		BinFreq  []int     `json:"bin_freq"`
		NSmaller int       `json:"n_smaller"`
		NLarger  int       `json:"n_larger"`
	} `json:"hom"`
}
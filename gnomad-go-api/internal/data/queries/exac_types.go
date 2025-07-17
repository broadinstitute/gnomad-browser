package queries

// ExacVariantDocument represents the ES document structure for ExAC variants
type ExacVariantDocument struct {
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

	// ExAC only has exome data
	Exome *ExacExomeData `json:"exome"`

	// Annotations
	TranscriptConsequences []map[string]interface{} `json:"transcript_consequences"`
	Flags                  []string                 `json:"flags"`
}

// ExacExomeData represents exome frequency data for ExAC
type ExacExomeData struct {
	// Basic frequency data
	AC              int `json:"ac"`
	AN              int `json:"an"`
	HomozygoteCount int `json:"homozygote_count"`
	HemizygoteCount int `json:"hemizygote_count"`

	// Quality metrics - ExAC has only raw histograms
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
			Metric string   `json:"metric"`
			Value  *float64 `json:"value"`
		} `json:"site_quality_metrics"`
	} `json:"quality_metrics"`

	// Population data
	Populations []ExacPopulationData `json:"populations"`

	// Filters and flags
	Filters []string `json:"filters"`
	Flags   []string `json:"flags"`
}

// ExacPopulationData represents population frequency data
type ExacPopulationData struct {
	ID              string `json:"id"`
	AC              int    `json:"ac"`
	AN              int    `json:"an"`
	HomozygoteCount int    `json:"homozygote_count"`
	HemizygoteCount int    `json:"hemizygote_count"`
}

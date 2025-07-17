package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

const GnomadV2Index = "gnomad_v2_variants"

// GnomadV2VariantFetcher implements variant fetching for gnomAD v2.
type GnomadV2VariantFetcher struct {
	BaseVariantFetcher
	Subset string // "gnomad", "non_neuro", "non_cancer", "controls_only"
}

func (f *GnomadV2VariantFetcher) FetchVariantByID(ctx context.Context, client *elastic.Client, variantID string) (*model.VariantDetails, error) {
	// Build query
	query := f.buildVariantQuery("variant_id", variantID)

	// Execute search
	hit, err := f.executeSearch(ctx, client, query)
	if err != nil {
		return nil, err
	}

	if hit == nil {
		return nil, &VariantNotFoundError{ID: variantID, Dataset: f.DatasetID}
	}

	// Parse and shape data
	return f.shapeVariantData(ctx, client, hit)
}

func (f *GnomadV2VariantFetcher) FetchVariantByRSID(ctx context.Context, client *elastic.Client, rsid string) (*model.VariantDetails, error) {
	query := f.buildVariantQuery("rsids", rsid)

	hit, err := f.executeSearch(ctx, client, query)
	if err != nil {
		return nil, err
	}

	if hit == nil {
		return nil, &VariantNotFoundError{ID: rsid, Dataset: f.DatasetID}
	}

	return f.shapeVariantData(ctx, client, hit)
}

func (f *GnomadV2VariantFetcher) FetchVariantByVRSID(ctx context.Context, client *elastic.Client, vrsID string) (*model.VariantDetails, error) {
	// V2 uses CAID for VRS-like identifiers
	query := f.buildVariantQuery("caid", vrsID)

	hit, err := f.executeSearch(ctx, client, query)
	if err != nil {
		return nil, err
	}

	if hit == nil {
		return nil, &VariantNotFoundError{ID: vrsID, Dataset: f.DatasetID}
	}

	return f.shapeVariantData(ctx, client, hit)
}

func (f *GnomadV2VariantFetcher) buildVariantQuery(field, value string) map[string]any {
	return map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": map[string]any{
					"term": map[string]any{
						field: value,
					},
				},
			},
		},
		"_source": map[string]any{
			"includes": []string{"value"},
		},
		"size": 1,
	}
}

func (f *GnomadV2VariantFetcher) executeSearch(ctx context.Context, client *elastic.Client, query map[string]any) (*elastic.Hit, error) {
	response, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	if len(response.Hits.Hits) == 0 {
		return nil, nil
	}

	// For rsIDs, check if we have multiple results
	if len(response.Hits.Hits) > 1 {
		return nil, fmt.Errorf("multiple variants found, query using variant ID to select one")
	}

	return &response.Hits.Hits[0], nil
}

func (f *GnomadV2VariantFetcher) shapeVariantData(ctx context.Context, client *elastic.Client, hit *elastic.Hit) (*model.VariantDetails, error) {
	// Extract the 'value' field from _source
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid document structure")
	}

	// Parse into struct
	var variant GnomadV2VariantDocument
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(jsonBytes, &variant); err != nil {
		return nil, err
	}

	// Get subset-specific keys
	exomeSubset := f.Subset
	genomeSubset := f.Subset
	if f.Subset == "non_cancer" {
		genomeSubset = "gnomad" // Special mapping for v2
	}

	// Check if variant exists in subset
	var hasExomeData, hasGenomeData bool
	if variant.Exome != nil && variant.Exome.Freq[exomeSubset] != nil {
		hasExomeData = variant.Exome.Freq[exomeSubset].ACRaw > 0
	}
	if variant.Genome != nil && variant.Genome.Freq[genomeSubset] != nil {
		hasGenomeData = variant.Genome.Freq[genomeSubset].ACRaw > 0
	}

	if !hasExomeData && !hasGenomeData {
		return nil, &VariantNotFoundError{ID: variant.VariantID, Dataset: f.DatasetID}
	}

	// Build result
	result := &model.VariantDetails{
		VariantID:         variant.VariantID,
		ReferenceGenome:   model.ReferenceGenomeIDGRCh37,
		Chrom:             variant.Chrom,
		Pos:               variant.Pos,
		Ref:               variant.Ref,
		Alt:               variant.Alt,
		Caid:              toStringPtr(variant.CAID),
		Rsids:             nullIfEmpty(variant.RSIDs),
		ColocatedVariants: f.getColocatedVariants(variant.ColocatedVariants),
		Flags:             nullIfEmpty(variant.Flags),
	}

	// Add exome data if present
	if hasExomeData {
		result.Exome = f.buildExomeData(variant.Exome.Freq[exomeSubset], variant.Exome, exomeSubset)
	}

	// Add genome data if present
	if hasGenomeData {
		result.Genome = f.buildGenomeData(variant.Genome.Freq[genomeSubset], variant.Genome, genomeSubset)
	}

	// Add transcript consequences using the shared helper
	result.TranscriptConsequences = ShapeTranscriptConsequences(
		variant.TranscriptConsequences,
		TranscriptConsequenceOptions{IncludeENSEMBLOnly: false}, // ExAC/v2 includes RefSeq
	)

	// Fetch LoF curation results
	lofCurations, err := fetchLofCurationResultsByVariant(ctx, client, variant.VariantID)
	if err != nil {
		// Log the error but don't fail the request
		fmt.Printf("could not fetch lof curation results for %s: %v\n", variant.VariantID, err)
		result.LofCurations = []*model.VariantLofCuration{}
	} else {
		result.LofCurations = lofCurations
	}

	// Coverage - fetch actual coverage data
	// Use the original contig with chr prefix for coverage queries
	coverage, err := FetchVariantCoverageForDataset(ctx, client, variant.Locus.Contig, variant.Pos, "gnomad_r2_1")
	if err != nil {
		// Log error but don't fail - return empty coverage instead
		coverage = &model.VariantCoverageDetails{
			Exome:  &model.VariantCoverage{},
			Genome: &model.VariantCoverage{},
		}
	}
	result.Coverage = coverage

	return result, nil
}

func (f *GnomadV2VariantFetcher) getColocatedVariants(colocated map[string][]string) []string {
	if colocated == nil {
		return nil
	}
	if variants, ok := colocated[f.Subset]; ok {
		return nullIfEmpty(variants)
	}
	return nil
}

func (f *GnomadV2VariantFetcher) buildExomeData(freqData *GnomadV2FrequencyData, exomeData *GnomadV2ExomeData, subset string) *model.VariantDetailsExomeData {
	if freqData == nil {
		return nil
	}

	// Build filters (add AC0 if needed)
	filters := make([]string, 0)

	// Add original filters from the exome data
	if exomeData.Filters != nil {
		filters = append(filters, exomeData.Filters...)
	}

	// Add frequency-specific filters
	if freqData.Filters != nil {
		filters = append(filters, freqData.Filters...)
	}

	// Add AC0 filter if AC is 0 and not already present
	if freqData.AC == 0 && !contains(filters, "AC0") {
		filters = append(filters, "AC0")
	}

	// Build populations
	populations := f.buildPopulations(freqData.Populations)

	// Calculate allele frequency
	var af *float64
	if freqData.AN > 0 {
		afValue := float64(freqData.AC) / float64(freqData.AN)
		af = &afValue
	}

	// Build quality metrics
	var qualityMetrics *model.VariantQualityMetrics
	if exomeData != nil {
		qualityMetrics = f.buildQualityMetrics(&exomeData.QualityMetrics)
	}

	// Build age distribution
	var ageDistribution *model.AgeDistribution
	if exomeData != nil && exomeData.AgeDistribution[subset] != nil {
		ageDistribution = f.buildAgeDistribution(exomeData.AgeDistribution[subset])
	}

	// Build FAF95 data
	var faf95 *model.VariantFilteringAlleleFrequency
	if exomeData != nil && exomeData.Faf95 != nil {
		faf95 = f.buildFAF95Data(exomeData.Faf95)
	}

	return &model.VariantDetailsExomeData{
		Ac:              freqData.AC,
		An:              freqData.AN,
		AcHemi:          freqData.HemizygoteCount,
		AcHom:           freqData.HomozygoteCount,
		HemizygoteCount: toIntPtr(freqData.HemizygoteCount),
		HomozygoteCount: toIntPtr(freqData.HomozygoteCount),
		Af:              af,
		Populations:     populations,
		QualityMetrics:  qualityMetrics,
		AgeDistribution: ageDistribution,
		Faf95:           faf95,
		Filters:         uniqueStrings(filters),
	}
}

func (f *GnomadV2VariantFetcher) buildGenomeData(freqData *GnomadV2FrequencyData, genomeData *GnomadV2GenomeData, subset string) *model.VariantDetailsGenomeData {
	if freqData == nil {
		return nil
	}

	// Build filters (add AC0 if needed)
	filters := make([]string, 0)

	// Add original filters from the genome data
	if genomeData.Filters != nil {
		filters = append(filters, genomeData.Filters...)
	}

	// Add frequency-specific filters
	if freqData.Filters != nil {
		filters = append(filters, freqData.Filters...)
	}

	// Add AC0 filter if AC is 0 and not already present
	if freqData.AC == 0 && !contains(filters, "AC0") {
		filters = append(filters, "AC0")
	}

	// Build populations
	populations := f.buildPopulations(freqData.Populations)

	// Calculate allele frequency
	var af *float64
	if freqData.AN > 0 {
		afValue := float64(freqData.AC) / float64(freqData.AN)
		af = &afValue
	}

	// Build quality metrics
	var qualityMetrics *model.VariantQualityMetrics
	if genomeData != nil {
		qualityMetrics = f.buildQualityMetrics(&genomeData.QualityMetrics)
	}

	// Build age distribution
	var ageDistribution *model.AgeDistribution
	if genomeData != nil && genomeData.AgeDistribution[subset] != nil {
		ageDistribution = f.buildAgeDistribution(genomeData.AgeDistribution[subset])
	}

	// Build FAF95 data
	var faf95 *model.VariantFilteringAlleleFrequency
	if genomeData != nil && genomeData.Faf95 != nil {
		faf95 = f.buildFAF95Data(genomeData.Faf95)
	}

	return &model.VariantDetailsGenomeData{
		Ac:              freqData.AC,
		An:              freqData.AN,
		AcHemi:          freqData.HemizygoteCount,
		AcHom:           freqData.HomozygoteCount,
		HemizygoteCount: toIntPtr(freqData.HemizygoteCount),
		HomozygoteCount: toIntPtr(freqData.HomozygoteCount),
		Af:              af,
		Populations:     populations,
		QualityMetrics:  qualityMetrics,
		AgeDistribution: ageDistribution,
		Faf95:           faf95,
		Filters:         uniqueStrings(filters),
	}
}

func (f *GnomadV2VariantFetcher) buildFAF95Data(fafData *GnomadV2FAFData) *model.VariantFilteringAlleleFrequency {
	if fafData == nil {
		return nil
	}
	
	var popmax *float64
	if fafData.Popmax > 0 {
		popmax = &fafData.Popmax
	}
	
	var popmaxPopulation *string
	if fafData.PopMaxPopulation != "" {
		popmaxPopulation = &fafData.PopMaxPopulation
	}
	
	return &model.VariantFilteringAlleleFrequency{
		Popmax:           popmax,
		PopmaxPopulation: popmaxPopulation,
	}
}

func (f *GnomadV2VariantFetcher) buildPopulations(pops []GnomadV2PopulationData) []*model.PopulationAlleleFrequencies {
	return f.buildPopulationsWithFiltering(pops, false)
}

func (f *GnomadV2VariantFetcher) buildPopulationsWithFiltering(pops []GnomadV2PopulationData, applyFilter bool) []*model.PopulationAlleleFrequencies {
	populations := make([]*model.PopulationAlleleFrequencies, 0, len(pops))
	for _, pop := range pops {
		// Filter out sex and subpopulation data only for variant summaries, not for variant details
		if applyFilter && (strings.Contains(pop.ID, "_") || pop.ID == "XX" || pop.ID == "XY") {
			continue
		}

		populations = append(populations, &model.PopulationAlleleFrequencies{
			ID:              pop.ID,
			Ac:              pop.AC,
			An:              pop.AN,
			AcHemi:          toIntPtrAlways(pop.HemizygoteCount),  // Always return pointer, even for 0
			AcHom:           pop.HomozygoteCount,
			HomozygoteCount: pop.HomozygoteCount,
			HemizygoteCount: toIntPtr(pop.HemizygoteCount),
		})
	}

	// Sort populations for consistent output
	sortPopulations(populations)
	return populations
}

func (f *GnomadV2VariantFetcher) buildExomeDataForSummary(freqData *GnomadV2FrequencyData, exomeData *GnomadV2ExomeData, subset string) *model.VariantDetailsExomeData {
	if freqData == nil {
		return nil
	}

	// Build filters (add AC0 if needed)
	filters := make([]string, 0)

	// Add original filters from the exome data
	if exomeData.Filters != nil {
		filters = append(filters, exomeData.Filters...)
	}

	// Add frequency-specific filters
	if freqData.Filters != nil {
		filters = append(filters, freqData.Filters...)
	}

	// Add AC0 filter if AC is 0 and not already present
	if freqData.AC == 0 && !contains(filters, "AC0") {
		filters = append(filters, "AC0")
	}

	// Build populations with filtering for variant summaries
	populations := f.buildPopulationsWithFiltering(freqData.Populations, true)

	// Calculate allele frequency
	var af *float64
	if freqData.AN > 0 {
		afValue := float64(freqData.AC) / float64(freqData.AN)
		af = &afValue
	}

	// Build quality metrics
	var qualityMetrics *model.VariantQualityMetrics
	if exomeData != nil {
		qualityMetrics = f.buildQualityMetrics(&exomeData.QualityMetrics)
	}

	// Build age distribution
	var ageDistribution *model.AgeDistribution
	if exomeData != nil && exomeData.AgeDistribution[subset] != nil {
		ageDistribution = f.buildAgeDistribution(exomeData.AgeDistribution[subset])
	}

	// Build FAF95 data
	var faf95 *model.VariantFilteringAlleleFrequency
	if exomeData != nil && exomeData.Faf95 != nil {
		faf95 = f.buildFAF95Data(exomeData.Faf95)
	}

	return &model.VariantDetailsExomeData{
		Ac:              freqData.AC,
		An:              freqData.AN,
		AcHemi:          freqData.HemizygoteCount,
		AcHom:           freqData.HomozygoteCount,
		HemizygoteCount: toIntPtr(freqData.HemizygoteCount),
		HomozygoteCount: toIntPtr(freqData.HomozygoteCount),
		Af:              af,
		Populations:     populations,
		QualityMetrics:  qualityMetrics,
		AgeDistribution: ageDistribution,
		Faf95:           faf95,
		Filters:         uniqueStrings(filters),
	}
}

func (f *GnomadV2VariantFetcher) buildGenomeDataForSummary(freqData *GnomadV2FrequencyData, genomeData *GnomadV2GenomeData, subset string) *model.VariantDetailsGenomeData {
	if freqData == nil {
		return nil
	}

	// Build filters (add AC0 if needed)
	filters := make([]string, 0)

	// Add original filters from the genome data
	if genomeData.Filters != nil {
		filters = append(filters, genomeData.Filters...)
	}

	// Add frequency-specific filters
	if freqData.Filters != nil {
		filters = append(filters, freqData.Filters...)
	}

	// Add AC0 filter if AC is 0 and not already present
	if freqData.AC == 0 && !contains(filters, "AC0") {
		filters = append(filters, "AC0")
	}

	// Build populations with filtering for variant summaries
	populations := f.buildPopulationsWithFiltering(freqData.Populations, true)

	// Calculate allele frequency
	var af *float64
	if freqData.AN > 0 {
		afValue := float64(freqData.AC) / float64(freqData.AN)
		af = &afValue
	}

	// Build quality metrics
	var qualityMetrics *model.VariantQualityMetrics
	if genomeData != nil {
		qualityMetrics = f.buildQualityMetrics(&genomeData.QualityMetrics)
	}

	// Build age distribution
	var ageDistribution *model.AgeDistribution
	if genomeData != nil && genomeData.AgeDistribution[subset] != nil {
		ageDistribution = f.buildAgeDistribution(genomeData.AgeDistribution[subset])
	}

	// Build FAF95 data
	var faf95 *model.VariantFilteringAlleleFrequency
	if genomeData != nil && genomeData.Faf95 != nil {
		faf95 = f.buildFAF95Data(genomeData.Faf95)
	}

	return &model.VariantDetailsGenomeData{
		Ac:              freqData.AC,
		An:              freqData.AN,
		AcHemi:          freqData.HemizygoteCount,
		AcHom:           freqData.HomozygoteCount,
		HemizygoteCount: toIntPtr(freqData.HemizygoteCount),
		HomozygoteCount: toIntPtr(freqData.HomozygoteCount),
		Af:              af,
		Populations:     populations,
		QualityMetrics:  qualityMetrics,
		AgeDistribution: ageDistribution,
		Faf95:           faf95,
		Filters:         uniqueStrings(filters),
	}
}

func (f *GnomadV2VariantFetcher) buildQualityMetrics(qm interface{}) *model.VariantQualityMetrics {
	// Cast to the proper type
	var (
		ab   *model.AlleleBalanceHistogram
		gd   *model.GenotypeDepthHistogram
		gq   *model.GenotypeQualityHistogram
		site []*model.VariantSiteQualityMetric
	)

	switch q := qm.(type) {
	case *struct {
		AlleleBalance struct {
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NSmaller int       `json:"n_smaller"`
				NLarger  int       `json:"n_larger"`
			} `json:"alt_raw"`
		} `json:"allele_balance"`
		GenotypeDepth struct {
			AllRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NSmaller int       `json:"n_smaller"`
				NLarger  int       `json:"n_larger"`
			} `json:"all_raw"`
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NSmaller int       `json:"n_smaller"`
				NLarger  int       `json:"n_larger"`
			} `json:"alt_raw"`
		} `json:"genotype_depth"`
		GenotypeQuality struct {
			AllRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NSmaller int       `json:"n_smaller"`
				NLarger  int       `json:"n_larger"`
			} `json:"all_raw"`
			AltRaw struct {
				BinEdges []float64 `json:"bin_edges"`
				BinFreq  []float64 `json:"bin_freq"`
				NSmaller int       `json:"n_smaller"`
				NLarger  int       `json:"n_larger"`
			} `json:"alt_raw"`
		} `json:"genotype_quality"`
		SiteQualityMetrics []struct {
			Metric string   `json:"metric"`
			Value  *float64 `json:"value"`
		} `json:"site_quality_metrics"`
	}:
		// Allele balance (alt only for v2)
		if len(q.AlleleBalance.AltRaw.BinEdges) > 0 {
			ab = &model.AlleleBalanceHistogram{
				Alt: ShapeHistogramWithCounts(
					q.AlleleBalance.AltRaw.BinEdges,
					q.AlleleBalance.AltRaw.BinFreq,
					q.AlleleBalance.AltRaw.NSmaller,
					q.AlleleBalance.AltRaw.NLarger,
				),
			}
		}

		// Genotype depth
		if len(q.GenotypeDepth.AllRaw.BinEdges) > 0 || len(q.GenotypeDepth.AltRaw.BinEdges) > 0 {
			gd = &model.GenotypeDepthHistogram{}
			if len(q.GenotypeDepth.AllRaw.BinEdges) > 0 {
				gd.All = ShapeHistogramWithCounts(
					q.GenotypeDepth.AllRaw.BinEdges,
					q.GenotypeDepth.AllRaw.BinFreq,
					q.GenotypeDepth.AllRaw.NSmaller,
					q.GenotypeDepth.AllRaw.NLarger,
				)
			}
			if len(q.GenotypeDepth.AltRaw.BinEdges) > 0 {
				gd.Alt = ShapeHistogramWithCounts(
					q.GenotypeDepth.AltRaw.BinEdges,
					q.GenotypeDepth.AltRaw.BinFreq,
					q.GenotypeDepth.AltRaw.NSmaller,
					q.GenotypeDepth.AltRaw.NLarger,
				)
			}
		}

		// Genotype quality
		if len(q.GenotypeQuality.AllRaw.BinEdges) > 0 || len(q.GenotypeQuality.AltRaw.BinEdges) > 0 {
			gq = &model.GenotypeQualityHistogram{}
			if len(q.GenotypeQuality.AllRaw.BinEdges) > 0 {
				gq.All = ShapeHistogramWithCounts(
					q.GenotypeQuality.AllRaw.BinEdges,
					q.GenotypeQuality.AllRaw.BinFreq,
					q.GenotypeQuality.AllRaw.NSmaller,
					q.GenotypeQuality.AllRaw.NLarger,
				)
			}
			if len(q.GenotypeQuality.AltRaw.BinEdges) > 0 {
				gq.Alt = ShapeHistogramWithCounts(
					q.GenotypeQuality.AltRaw.BinEdges,
					q.GenotypeQuality.AltRaw.BinFreq,
					q.GenotypeQuality.AltRaw.NSmaller,
					q.GenotypeQuality.AltRaw.NLarger,
				)
			}
		}

		// Site quality metrics
		for _, sqm := range q.SiteQualityMetrics {
			if sqm.Value != nil {
				site = append(site, &model.VariantSiteQualityMetric{
					Metric: sqm.Metric,
					Value:  sqm.Value,
				})
			}
		}
	}

	return &model.VariantQualityMetrics{
		AlleleBalance:      ab,
		GenotypeDepth:      gd,
		GenotypeQuality:    gq,
		SiteQualityMetrics: site,
	}
}

func (f *GnomadV2VariantFetcher) buildAgeDistribution(ad *GnomadV2AgeDistribution) *model.AgeDistribution {
	if ad == nil {
		return nil
	}

	var het, hom *model.Histogram

	if len(ad.Het.BinEdges) > 0 {
		het = &model.Histogram{
			BinEdges: ad.Het.BinEdges,
			BinFreq:  intSliceToFloat64(ad.Het.BinFreq),
			NSmaller: toIntPtrAlways(ad.Het.NSmaller),
			NLarger:  toIntPtrAlways(ad.Het.NLarger),
		}
	}

	if len(ad.Hom.BinEdges) > 0 {
		hom = &model.Histogram{
			BinEdges: ad.Hom.BinEdges,
			BinFreq:  intSliceToFloat64(ad.Hom.BinFreq),
			NSmaller: toIntPtrAlways(ad.Hom.NSmaller),
			NLarger:  toIntPtrAlways(ad.Hom.NLarger),
		}
	}

	return &model.AgeDistribution{
		Het: het,
		Hom: hom,
	}
}


// Batch fetching methods.
func (f *GnomadV2VariantFetcher) FetchVariantsByGene(ctx context.Context, client *elastic.Client, gene *model.Gene) ([]*model.Variant, error) {
	if gene == nil {
		return nil, fmt.Errorf("gene object is required")
	}

	// Filter exons to CDS regions (or all if no CDS)
	filteredRegions := gene.Exons
	cdsExons := make([]*model.Exon, 0)
	for _, exon := range gene.Exons {
		if exon.FeatureType == "CDS" {
			cdsExons = append(cdsExons, exon)
		}
	}
	if len(cdsExons) > 0 {
		filteredRegions = cdsExons
	}

	// Add padding to regions
	const padding = 75
	rangeQueries := make([]map[string]interface{}, 0)
	for _, region := range filteredRegions {
		rangeQueries = append(rangeQueries, map[string]interface{}{
			"range": map[string]interface{}{
				"locus.position": map[string]interface{}{
					"gte": region.Start - padding,
					"lte": region.Stop + padding,
				},
			},
		})
	}

	// Build query
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{"term": map[string]interface{}{"gene_id": gene.GeneID}},
					{"bool": map[string]interface{}{"should": rangeQueries}},
				},
			},
		},
		"_source": []string{"value"},
		"sort":    []map[string]interface{}{{"locus.position": map[string]string{"order": "asc"}}},
		"size":    10000,
	}

	// Execute search
	resp, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gnomAD v2 variants by gene: %w", err)
	}

	// Convert to variant models
	variants := make([]*model.Variant, 0)
	for _, hit := range resp.Hits.Hits {
		value, ok := hit.Source["value"].(map[string]interface{})
		if !ok {
			continue
		}

		// Parse document
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			continue
		}
		var doc GnomadV2VariantDocument
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue
		}

		// Check if variant has data in subset
		exomeSubset := f.Subset
		genomeSubset := f.Subset
		if f.Subset == "non_cancer" {
			genomeSubset = "gnomad"
		}

		hasExomeData := doc.Exome != nil && doc.Exome.Freq[exomeSubset] != nil && doc.Exome.Freq[exomeSubset].ACRaw > 0
		hasGenomeData := doc.Genome != nil && doc.Genome.Freq[genomeSubset] != nil && doc.Genome.Freq[genomeSubset].ACRaw > 0

		if !hasExomeData && !hasGenomeData {
			continue
		}

		// Shape variant summary
		variant := f.shapeVariantSummary(&doc, gene.GeneID)
		if variant != nil {
			variants = append(variants, variant)
		}
	}

	return variants, nil
}

// shapeVariantSummary converts a gnomAD v2 document to a summary Variant model for lists
func (f *GnomadV2VariantFetcher) shapeVariantSummary(doc *GnomadV2VariantDocument, geneID string) *model.Variant {
	if doc == nil {
		return nil
	}

	// Get subset-specific keys
	exomeSubset := f.Subset
	genomeSubset := f.Subset
	if f.Subset == "non_cancer" {
		genomeSubset = "gnomad"
	}

	// Build exome data if present
	var exomeData *model.VariantDetailsExomeData
	if doc.Exome != nil && doc.Exome.Freq[exomeSubset] != nil && doc.Exome.Freq[exomeSubset].ACRaw > 0 {
		exomeData = f.buildExomeDataForSummary(doc.Exome.Freq[exomeSubset], doc.Exome, exomeSubset)
	}

	// Build genome data if present
	var genomeData *model.VariantDetailsGenomeData
	if doc.Genome != nil && doc.Genome.Freq[genomeSubset] != nil && doc.Genome.Freq[genomeSubset].ACRaw > 0 {
		genomeData = f.buildGenomeDataForSummary(doc.Genome.Freq[genomeSubset], doc.Genome, genomeSubset)
	}

	// Create the variant
	variant := &model.Variant{
		VariantID:       doc.VariantID,
		ReferenceGenome: model.ReferenceGenomeIDGRCh37,
		Chrom:           doc.Chrom,
		Pos:             doc.Pos,
		Ref:             doc.Ref,
		Alt:             doc.Alt,
		Exome:           exomeData,
		Genome:          genomeData,
		Flags:           ensureEmptyArray(doc.Flags),
		Rsids:           ensureEmptyArray(doc.RSIDs),
		Rsid:            getFirstRsid(doc.RSIDs),
		Caid:            toStringPtr(doc.CAID),
		Coverage: &model.VariantCoverageDetails{
			Exome:  &model.VariantCoverage{},
			Genome: &model.VariantCoverage{},
		},
	}

	// Add flattened transcript consequence fields from the first relevant consequence
	if len(doc.TranscriptConsequences) > 0 {
		// Find the first consequence for this gene
		var relevantConsequence map[string]interface{}
		for _, csq := range doc.TranscriptConsequences {
			if csqGeneID, ok := csq["gene_id"].(string); ok && csqGeneID == geneID {
				relevantConsequence = csq
				break
			}
		}
		
		// If no gene-specific consequence found, use the first one
		if relevantConsequence == nil && len(doc.TranscriptConsequences) > 0 {
			relevantConsequence = doc.TranscriptConsequences[0]
		}

		if relevantConsequence != nil {
			if consequence, ok := relevantConsequence["major_consequence"].(string); ok {
				variant.Consequence = &consequence
			}
			if geneSymbol, ok := relevantConsequence["gene_symbol"].(string); ok {
				variant.GeneSymbol = &geneSymbol
			}
			if hgvsc, ok := relevantConsequence["hgvsc"].(string); ok {
				variant.Hgvsc = &hgvsc
			}
			if hgvsp, ok := relevantConsequence["hgvsp"].(string); ok {
				variant.Hgvsp = &hgvsp
			}
			// Set hgvs to hgvsp if available, otherwise hgvsc
			if hgvsp, ok := relevantConsequence["hgvsp"].(string); ok && hgvsp != "" {
				variant.Hgvs = &hgvsp
			} else if hgvsc, ok := relevantConsequence["hgvsc"].(string); ok {
				variant.Hgvs = &hgvsc
			}
			if lof, ok := relevantConsequence["lof"].(string); ok {
				variant.Lof = &lof
			}
			if lofFilter, ok := relevantConsequence["lof_filter"].(string); ok {
				variant.LofFilter = &lofFilter
			}
			if lofFlags, ok := relevantConsequence["lof_flags"].(string); ok {
				variant.LofFlags = &lofFlags
			}
			if transcriptID, ok := relevantConsequence["transcript_id"].(string); ok {
				variant.TranscriptID = &transcriptID
			}
			if transcriptVersion, ok := relevantConsequence["transcript_version"].(string); ok {
				variant.TranscriptVersion = &transcriptVersion
			}
			// Set the gene ID
			variant.GeneID = &geneID
		}
	}

	// Add full transcript consequences using the shared helper
	variant.TranscriptConsequences = ShapeTranscriptConsequences(
		doc.TranscriptConsequences,
		TranscriptConsequenceOptions{IncludeENSEMBLOnly: false}, // ExAC/v2 includes RefSeq
	)

	return variant
}

func (f *GnomadV2VariantFetcher) FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.Variant, error) {
	// Build the query to find variants in the region
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{
						"term": map[string]interface{}{
							// v2 uses chromosome without "chr" prefix
							"locus.contig": chrom,
						},
					},
					{
						"range": map[string]interface{}{
							"locus.position": map[string]interface{}{
								"gte": start,
								"lte": stop,
							},
						},
					},
				},
			},
		},
		"_source": []string{"value"},
		"size":    10000, // Limit results
		"sort": []interface{}{
			map[string]interface{}{
				"locus.position": map[string]interface{}{
					"order": "asc",
				},
			},
		},
	}

	// Execute search
	resp, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gnomAD v2 variants by region: %w", err)
	}

	// Convert to variant models
	variants := make([]*model.Variant, 0)
	for _, hit := range resp.Hits.Hits {
		value, ok := hit.Source["value"].(map[string]interface{})
		if !ok {
			continue
		}

		// Parse document
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			continue
		}
		var doc GnomadV2VariantDocument
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue
		}

		// Check if variant has data in the appropriate subset
		exomeSubset := f.Subset
		genomeSubset := f.Subset
		if f.Subset == "non_cancer" {
			genomeSubset = "gnomad"
		}

		hasExomeData := doc.Exome != nil && doc.Exome.Freq[exomeSubset] != nil && doc.Exome.Freq[exomeSubset].ACRaw > 0
		hasGenomeData := doc.Genome != nil && doc.Genome.Freq[genomeSubset] != nil && doc.Genome.Freq[genomeSubset].ACRaw > 0

		if !hasExomeData && !hasGenomeData {
			continue
		}

		// Shape variant summary
		variant := f.shapeVariantSummary(&doc, "")
		if variant != nil {
			variants = append(variants, variant)
		}
	}

	return variants, nil
}

func (f *GnomadV2VariantFetcher) FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.Variant, error) {
	// Build the query to find variants for this transcript
	// Use simple term query for transcript_id field (as in original TypeScript)
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{
						"term": map[string]interface{}{
							"transcript_id": transcriptID,
						},
					},
				},
			},
		},
		"_source": []string{"value"},
		"size":    10000, // Limit results
		"sort": []interface{}{
			map[string]interface{}{
				"locus.position": map[string]interface{}{
					"order": "asc",
				},
			},
		},
	}

	// Execute search
	resp, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gnomAD v2 variants by transcript: %w", err)
	}

	// Convert to variant models
	variants := make([]*model.Variant, 0)
	for _, hit := range resp.Hits.Hits {
		value, ok := hit.Source["value"].(map[string]interface{})
		if !ok {
			continue
		}

		// Parse document
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			continue
		}

		var doc GnomadV2VariantDocument
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue
		}

		// Re-extract variant locus info in case it's not present at the top-level
		if doc.Chrom == "" && doc.Locus.Contig != "" {
			// Convert []string to []interface{} for ExtractVariantInfo
			alleles := make([]interface{}, len(doc.Alleles))
			for i, allele := range doc.Alleles {
				alleles[i] = allele
			}
			doc.Chrom, doc.Pos, doc.Ref, doc.Alt = ExtractVariantInfo(map[string]interface{}{
				"contig":   doc.Locus.Contig,
				"position": float64(doc.Locus.Position),
			}, alleles)
		}

		// Check if variant has data in the appropriate subset
		exomeSubset := f.Subset
		genomeSubset := f.Subset
		if f.Subset == "non_cancer" {
			genomeSubset = "gnomad"
		}

		hasExomeData := doc.Exome != nil &&
			doc.Exome.Freq[exomeSubset] != nil &&
			doc.Exome.Freq[exomeSubset].ACRaw > 0

		hasGenomeData := doc.Genome != nil &&
			doc.Genome.Freq[genomeSubset] != nil &&
			doc.Genome.Freq[genomeSubset].ACRaw > 0

		if !hasExomeData && !hasGenomeData {
			continue
		}

		// For transcript variants, we need to find the specific transcript consequence
		// and use that gene_id for context
		var geneID string
		if doc.TranscriptConsequences != nil {
			for _, tc := range doc.TranscriptConsequences {
				if tid, ok := tc["transcript_id"].(string); ok && tid == transcriptID {
					if gid, ok := tc["gene_id"].(string); ok {
						geneID = gid
						break
					}
				}
			}
		}

		// Shape variant summary
		variant := f.shapeVariantSummary(&doc, geneID)
		if variant != nil {
			variants = append(variants, variant)
		}
	}

	return variants, nil
}

// Helper functions

func intSliceToFloat64(ints []int) []float64 {
	result := make([]float64, len(ints))
	for i, v := range ints {
		result[i] = float64(v)
	}
	return result
}

func toIntPtr(v int) *int {
	if v == 0 {
		return nil
	}
	return &v
}

func ensureEmptyArray(arr []string) []string {
	if arr == nil {
		return []string{}
	}
	return arr
}

func getFirstRsid(rsids []string) *string {
	if len(rsids) == 0 {
		return nil
	}
	return &rsids[0]
}

func toIntPtrAlways(v int) *int {
	return &v
}

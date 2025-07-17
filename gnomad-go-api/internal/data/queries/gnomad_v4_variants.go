package queries

import (
	"context"
	"encoding/json"
	"fmt"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// GnomadV4VariantFetcher implements variant fetching for gnomAD v4.
type GnomadV4VariantFetcher struct {
	BaseVariantFetcher
	Subset string // "all" or "non_ukb"
}

func (f *GnomadV4VariantFetcher) FetchVariantByID(ctx context.Context, client *elastic.Client, variantID string) (*model.VariantDetails, error) {
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

func (f *GnomadV4VariantFetcher) FetchVariantByRSID(ctx context.Context, client *elastic.Client, rsid string) (*model.VariantDetails, error) {
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

func (f *GnomadV4VariantFetcher) FetchVariantByVRSID(ctx context.Context, client *elastic.Client, vrsID string) (*model.VariantDetails, error) {
	query := f.buildVariantQuery("allele_id", vrsID)

	hit, err := f.executeSearch(ctx, client, query)
	if err != nil {
		return nil, err
	}

	if hit == nil {
		return nil, &VariantNotFoundError{ID: vrsID, Dataset: f.DatasetID}
	}

	return f.shapeVariantData(ctx, client, hit)
}

func (f *GnomadV4VariantFetcher) buildVariantQuery(field, value string) map[string]any {
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

func (f *GnomadV4VariantFetcher) executeSearch(ctx context.Context, client *elastic.Client, query map[string]any) (*elastic.Hit, error) {
	response, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	if len(response.Hits.Hits) == 0 {
		return nil, nil
	}

	return &response.Hits.Hits[0], nil
}

func (f *GnomadV4VariantFetcher) shapeVariantData(ctx context.Context, client *elastic.Client, hit *elastic.Hit) (*model.VariantDetails, error) {
	// Extract the 'value' field from _source
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid document structure")
	}

	// Parse into struct
	var doc GnomadV4VariantDocument
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(jsonBytes, &doc); err != nil {
		return nil, err
	}

	// Check if variant exists in subset
	if !f.variantExistsInSubset(&doc) {
		return nil, &VariantNotFoundError{ID: doc.VariantID, Dataset: f.DatasetID}
	}

	// Extract variant info from locus and alleles
	locus := map[string]interface{}{
		"contig":   doc.Locus.Contig,
		"position": float64(doc.Locus.Position),
	}
	alleles := make([]interface{}, len(doc.Alleles))
	for i, a := range doc.Alleles {
		alleles[i] = a
	}
	doc.Chrom, doc.Pos, doc.Ref, doc.Alt = ExtractVariantInfo(locus, alleles)

	// Shape the data
	variant := &model.VariantDetails{
		VariantID:       doc.VariantID,
		ReferenceGenome: model.ReferenceGenomeIDGRCh38,
		Chrom:           doc.Chrom,
		Pos:             doc.Pos,
		Ref:             doc.Ref,
		Alt:             doc.Alt,
		Rsids:           nullIfEmpty(doc.RSIDs),
	}

	// Shape exome data
	if doc.Exome != nil && doc.Exome.Freq != nil && doc.Exome.Freq[f.Subset] != nil {
		variant.Exome = f.shapeExomeData(doc.Exome, f.Subset)
	}

	// Shape genome data (always uses "all" subset)
	if doc.Genome != nil && doc.Genome.Freq != nil && doc.Genome.Freq["all"] != nil {
		variant.Genome = f.shapeGenomeData(doc.Genome)
	}

	// Shape joint data - only for the full "all" subset, not for non_ukb subset
	if f.Subset == "all" && doc.Joint != nil && doc.Joint.Freq != nil && doc.Joint.Freq[f.Subset] != nil {
		variant.Joint = f.shapeJointData(doc.Joint, f.Subset)
	}

	// Convert document to map for flag processing
	docMap := f.convertDocumentToMap(&doc)

	// Add flags with proper context
	context := FlagContext{
		Type: "region", // Default to region context for single variant queries
	}
	variant.Flags = GetFlagsForContext(docMap, context, f.Subset)

	// Add other fields
	variant.ColocatedVariants = f.getColocatedVariants(doc.ColocatedVariants)
	variant.TranscriptConsequences = ShapeTranscriptConsequences(doc.TranscriptConsequences, TranscriptConsequenceOptions{
		IncludeENSEMBLOnly: true,
	})

	// Transform in_silico_predictors from map to list
	if doc.InSilicoPredictors != nil {
		variant.InSilicoPredictors = CreateInSilicoPredictorsList(doc.InSilicoPredictors)
	}

	// Add CAID (VRS allele ID)
	// The CAID is available directly in the document
	if doc.CAID != "" {
		variant.Caid = &doc.CAID
	} else if doc.VRS != nil {
		// Try to extract CAID from VRS data if direct field is empty
		if altData, ok := doc.VRS["alt"].(map[string]interface{}); ok {
			if alleleID, ok := altData["allele_id"].(string); ok && alleleID != "" {
				variant.Caid = &alleleID
			}
		}
	}

	// Multi-nucleotide variants
	variant.MultiNucleotideVariants = ShapeMultiNucleotideVariants(doc.MultiNucleotideVariants)

	// LOF curation
	if doc.LofCuration != nil {
		// TODO: Map LOF curation data when structure is determined
		variant.LofCurations = []*model.VariantLofCuration{}
	}

	// Coverage - fetch actual coverage data
	// Use the original contig with chr prefix for coverage query
	coverage, err := FetchVariantCoverage(ctx, client, doc.Locus.Contig, doc.Locus.Position)
	if err != nil {
		// Log error but don't fail - return empty coverage instead
		coverage = &model.VariantCoverageDetails{
			Exome:  &model.VariantCoverage{},
			Genome: &model.VariantCoverage{},
		}
	}
	variant.Coverage = coverage

	return variant, nil
}

func (f *GnomadV4VariantFetcher) variantExistsInSubset(doc *GnomadV4VariantDocument) bool {
	if f.Subset == "all" {
		return true
	}

	// Check if variant has data in the subset
	hasExome := doc.Exome != nil && doc.Exome.Freq != nil &&
		doc.Exome.Freq[f.Subset] != nil && doc.Exome.Freq[f.Subset].AC > 0
	hasGenome := doc.Genome != nil && doc.Genome.Freq != nil &&
		doc.Genome.Freq["all"] != nil && doc.Genome.Freq["all"].AC > 0
	hasJoint := doc.Joint != nil && doc.Joint.Freq != nil &&
		doc.Joint.Freq[f.Subset] != nil && doc.Joint.Freq[f.Subset].AC > 0

	return hasExome || hasGenome || hasJoint
}

func (f *GnomadV4VariantFetcher) shapeExomeData(data *GnomadV4SequencingData, subset string) *model.VariantDetailsExomeData {
	freqData := data.Freq[subset]
	if freqData == nil {
		return nil
	}

	shaped := &model.VariantDetailsExomeData{
		Ac:      freqData.AC,
		An:      freqData.AN,
		AcHemi:  freqData.HemizygoteCount,
		AcHom:   freqData.HomozygoteCount,
		Filters: freqData.Filters,
	}

	// Add AC=0 filter if needed
	shaped.Filters = AddAC0FilterIfNeeded(shaped.Filters, freqData.AC)

	// Convert ancestry groups to generic format
	basePopulations := f.convertAncestryGroupsToMaps(freqData.AncestryGroups)
	
	// DEBUG: Print raw ancestry groups data
	// fmt.Printf("DEBUG: Exome freqData.HomozygoteCount = %d\n", freqData.HomozygoteCount)
	// for _, ag := range freqData.AncestryGroups {
	//     if ag.HomozygoteCount > 0 {
	//         fmt.Printf("DEBUG: Ancestry group %s has homozygote_count = %d\n", ag.ID, ag.HomozygoteCount)
	//     }
	// }

	// Prepare additional population sources
	additionalSources := make(map[string]interface{})
	if data.Freq["all"] != nil {
		if data.Freq["all"].HGDP != nil {
			additionalSources["hgdp"] = f.convertSubPopulationToMap(data.Freq["all"].HGDP)
		}
		if data.Freq["all"].TGP != nil {
			additionalSources["tgp"] = f.convertSubPopulationToMap(data.Freq["all"].TGP)
		}
	}

	// Shape populations with prefix merging
	shaped.Populations = ShapeAndMergePopulations(basePopulations, additionalSources, "exome")

	// Shape FAF95/FAF99 - transform from grpmax to popmax format
	if data.FAF95 != nil {
		shaped.Faf95 = &model.VariantFilteringAlleleFrequency{
			Popmax:           &data.FAF95.Grpmax,
			PopmaxPopulation: &data.FAF95.GrpmaxGenAnc,
		}
	}
	if data.FAF99 != nil {
		shaped.Faf99 = &model.VariantFilteringAlleleFrequency{
			Popmax:           &data.FAF99.Grpmax,
			PopmaxPopulation: &data.FAF99.GrpmaxGenAnc,
		}
	}

	// Add quality metrics
	if len(data.QualityMetrics.AlleleBalance.AltAdj.BinEdges) > 0 {
		shaped.QualityMetrics = &model.VariantQualityMetrics{
			AlleleBalance: &model.AlleleBalanceHistogram{
				Alt: ShapeHistogramWithCounts(
					data.QualityMetrics.AlleleBalance.AltAdj.BinEdges,
					data.QualityMetrics.AlleleBalance.AltAdj.BinFreq,
					data.QualityMetrics.AlleleBalance.AltAdj.NSmaller,
					data.QualityMetrics.AlleleBalance.AltAdj.NLarger,
				),
			},
			GenotypeDepth: &model.GenotypeDepthHistogram{
				All: ShapeHistogramWithCounts(
					data.QualityMetrics.GenotypeDepth.AllAdj.BinEdges,
					data.QualityMetrics.GenotypeDepth.AllAdj.BinFreq,
					data.QualityMetrics.GenotypeDepth.AllAdj.NSmaller,
					data.QualityMetrics.GenotypeDepth.AllAdj.NLarger,
				),
				Alt: ShapeHistogramWithCounts(
					data.QualityMetrics.GenotypeDepth.AltAdj.BinEdges,
					data.QualityMetrics.GenotypeDepth.AltAdj.BinFreq,
					data.QualityMetrics.GenotypeDepth.AltAdj.NSmaller,
					data.QualityMetrics.GenotypeDepth.AltAdj.NLarger,
				),
			},
			GenotypeQuality: &model.GenotypeQualityHistogram{
				All: ShapeHistogramWithCounts(
					data.QualityMetrics.GenotypeQuality.AllAdj.BinEdges,
					data.QualityMetrics.GenotypeQuality.AllAdj.BinFreq,
					data.QualityMetrics.GenotypeQuality.AllAdj.NSmaller,
					data.QualityMetrics.GenotypeQuality.AllAdj.NLarger,
				),
				Alt: ShapeHistogramWithCounts(
					data.QualityMetrics.GenotypeQuality.AltAdj.BinEdges,
					data.QualityMetrics.GenotypeQuality.AltAdj.BinFreq,
					data.QualityMetrics.GenotypeQuality.AltAdj.NSmaller,
					data.QualityMetrics.GenotypeQuality.AltAdj.NLarger,
				),
			},
			SiteQualityMetrics: ShapeSiteQualityMetrics(f.convertSiteQualityMetricsToMaps(data.QualityMetrics.SiteQualityMetrics)),
		}
	}

	// Add age distribution
	if data.AgeDistribution != nil {
		shaped.AgeDistribution = ShapeAgeDistribution(
			data.AgeDistribution.Het.BinEdges, data.AgeDistribution.Het.BinFreq,
			data.AgeDistribution.Het.NSmaller, data.AgeDistribution.Het.NLarger,
			data.AgeDistribution.Hom.BinEdges, data.AgeDistribution.Hom.BinFreq,
			data.AgeDistribution.Hom.NSmaller, data.AgeDistribution.Hom.NLarger,
		)
	}

	return shaped
}

func (f *GnomadV4VariantFetcher) shapeGenomeData(data *GnomadV4SequencingData) *model.VariantDetailsGenomeData {
	freqData := data.Freq["all"]
	if freqData == nil {
		return nil
	}

	shaped := &model.VariantDetailsGenomeData{
		Ac:      freqData.AC,
		An:      freqData.AN,
		AcHemi:  freqData.HemizygoteCount,
		AcHom:   freqData.HomozygoteCount,
		Filters: freqData.Filters,
	}

	// Add AC=0 filter if needed
	shaped.Filters = AddAC0FilterIfNeeded(shaped.Filters, freqData.AC)

	// Convert ancestry groups to generic format
	basePopulations := f.convertAncestryGroupsToMaps(freqData.AncestryGroups)

	// Prepare additional population sources
	additionalSources := make(map[string]interface{})
	if data.Freq["all"] != nil {
		if data.Freq["all"].HGDP != nil {
			additionalSources["hgdp"] = f.convertSubPopulationToMap(data.Freq["all"].HGDP)
		}
		if data.Freq["all"].TGP != nil {
			additionalSources["tgp"] = f.convertSubPopulationToMap(data.Freq["all"].TGP)
		}
	}

	// Shape populations with prefix merging
	shaped.Populations = ShapeAndMergePopulations(basePopulations, additionalSources, "genome")

	// Shape FAF95/FAF99 - transform from grpmax to popmax format
	if data.FAF95 != nil {
		shaped.Faf95 = &model.VariantFilteringAlleleFrequency{
			Popmax:           &data.FAF95.Grpmax,
			PopmaxPopulation: &data.FAF95.GrpmaxGenAnc,
		}
	}
	if data.FAF99 != nil {
		shaped.Faf99 = &model.VariantFilteringAlleleFrequency{
			Popmax:           &data.FAF99.Grpmax,
			PopmaxPopulation: &data.FAF99.GrpmaxGenAnc,
		}
	}

	// Add quality metrics
	if len(data.QualityMetrics.AlleleBalance.AltAdj.BinEdges) > 0 {
		shaped.QualityMetrics = &model.VariantQualityMetrics{
			AlleleBalance: &model.AlleleBalanceHistogram{
				Alt: ShapeHistogramWithCounts(
					data.QualityMetrics.AlleleBalance.AltAdj.BinEdges,
					data.QualityMetrics.AlleleBalance.AltAdj.BinFreq,
					data.QualityMetrics.AlleleBalance.AltAdj.NSmaller,
					data.QualityMetrics.AlleleBalance.AltAdj.NLarger,
				),
			},
			GenotypeDepth: &model.GenotypeDepthHistogram{
				All: ShapeHistogramWithCounts(
					data.QualityMetrics.GenotypeDepth.AllAdj.BinEdges,
					data.QualityMetrics.GenotypeDepth.AllAdj.BinFreq,
					data.QualityMetrics.GenotypeDepth.AllAdj.NSmaller,
					data.QualityMetrics.GenotypeDepth.AllAdj.NLarger,
				),
				Alt: ShapeHistogramWithCounts(
					data.QualityMetrics.GenotypeDepth.AltAdj.BinEdges,
					data.QualityMetrics.GenotypeDepth.AltAdj.BinFreq,
					data.QualityMetrics.GenotypeDepth.AltAdj.NSmaller,
					data.QualityMetrics.GenotypeDepth.AltAdj.NLarger,
				),
			},
			GenotypeQuality: &model.GenotypeQualityHistogram{
				All: ShapeHistogramWithCounts(
					data.QualityMetrics.GenotypeQuality.AllAdj.BinEdges,
					data.QualityMetrics.GenotypeQuality.AllAdj.BinFreq,
					data.QualityMetrics.GenotypeQuality.AllAdj.NSmaller,
					data.QualityMetrics.GenotypeQuality.AllAdj.NLarger,
				),
				Alt: ShapeHistogramWithCounts(
					data.QualityMetrics.GenotypeQuality.AltAdj.BinEdges,
					data.QualityMetrics.GenotypeQuality.AltAdj.BinFreq,
					data.QualityMetrics.GenotypeQuality.AltAdj.NSmaller,
					data.QualityMetrics.GenotypeQuality.AltAdj.NLarger,
				),
			},
			SiteQualityMetrics: ShapeSiteQualityMetrics(f.convertSiteQualityMetricsToMaps(data.QualityMetrics.SiteQualityMetrics)),
		}
	}

	// Add age distribution
	if data.AgeDistribution != nil {
		shaped.AgeDistribution = ShapeAgeDistribution(
			data.AgeDistribution.Het.BinEdges, data.AgeDistribution.Het.BinFreq,
			data.AgeDistribution.Het.NSmaller, data.AgeDistribution.Het.NLarger,
			data.AgeDistribution.Hom.BinEdges, data.AgeDistribution.Hom.BinFreq,
			data.AgeDistribution.Hom.NSmaller, data.AgeDistribution.Hom.NLarger,
		)
	}

	return shaped
}

// convertDocumentToMap converts a GnomadV4VariantDocument to a generic map for flag processing
func (f *GnomadV4VariantFetcher) convertDocumentToMap(doc *GnomadV4VariantDocument) map[string]interface{} {
	result := make(map[string]interface{})

	// Add base flags
	result["flags"] = doc.Flags

	// Add transcript consequences
	if doc.TranscriptConsequences != nil {
		result["transcript_consequences"] = doc.TranscriptConsequences
	}

	// Add exome data
	if doc.Exome != nil {
		exomeMap := make(map[string]interface{})
		if doc.Exome.Freq != nil {
			freqMap := make(map[string]interface{})
			for subset, freq := range doc.Exome.Freq {
				if freq != nil {
					// Convert filters to interface slice
					filters := make([]interface{}, len(freq.Filters))
					for i, f := range freq.Filters {
						filters[i] = f
					}
					freqMap[subset] = map[string]interface{}{
						"ac":      float64(freq.AC),
						"filters": filters,
					}
				}
			}
			exomeMap["freq"] = freqMap
		}
		result["exome"] = exomeMap
	}

	// Add genome data
	if doc.Genome != nil {
		genomeMap := make(map[string]interface{})
		if doc.Genome.Freq != nil {
			freqMap := make(map[string]interface{})
			for subset, freq := range doc.Genome.Freq {
				if freq != nil {
					// Convert filters to interface slice
					filters := make([]interface{}, len(freq.Filters))
					for i, f := range freq.Filters {
						filters[i] = f
					}
					freqMap[subset] = map[string]interface{}{
						"ac":      float64(freq.AC),
						"filters": filters,
					}
				}
			}
			genomeMap["freq"] = freqMap
		}
		result["genome"] = genomeMap
	}

	// Add joint data
	if doc.Joint != nil {
		jointMap := make(map[string]interface{})
		if doc.Joint.Freq != nil {
			freqMap := make(map[string]interface{})
			for subset, freq := range doc.Joint.Freq {
				if freq != nil {
					freqMap[subset] = map[string]interface{}{
						"ac": float64(freq.AC),
					}
				}
			}
			jointMap["freq"] = freqMap
		}
		result["joint"] = jointMap
	}

	return result
}

// convertAncestryGroupsToMaps converts v4 ancestry groups to generic map format
func (f *GnomadV4VariantFetcher) convertAncestryGroupsToMaps(groups []GnomadV4PopulationData) []map[string]interface{} {
	result := make([]map[string]interface{}, len(groups))
	for i, group := range groups {
		result[i] = map[string]interface{}{
			"id":               group.ID,
			"ac":               float64(group.AC),
			"an":               float64(group.AN),
			"homozygote_count": float64(group.HomozygoteCount),
			"hemizygote_count": float64(group.HemizygoteCount),
		}
	}
	return result
}

// convertSubPopulationToMap converts HGDP/TGP sub-population data to generic map
func (f *GnomadV4VariantFetcher) convertSubPopulationToMap(subPop *struct {
	AC             int                      `json:"ac"`
	AN             int                      `json:"an"`
	ACRaw          int                      `json:"ac_raw"`
	ANRaw          int                      `json:"an_raw"`
	AncestryGroups []GnomadV4PopulationData `json:"ancestry_groups"`
}) map[string]interface{} {
	if subPop == nil {
		return nil
	}
	
	result := map[string]interface{}{
		"ac_raw": float64(subPop.ACRaw),
	}

	ancestryGroups := make([]interface{}, len(subPop.AncestryGroups))
	for i, group := range subPop.AncestryGroups {
		ancestryGroups[i] = map[string]interface{}{
			"id":               group.ID,
			"ac":               float64(group.AC),
			"an":               float64(group.AN),
			"homozygote_count": float64(group.HomozygoteCount),
			"hemizygote_count": float64(group.HemizygoteCount),
		}
	}
	result["ancestry_groups"] = ancestryGroups

	return result
}

// convertSiteQualityMetricsToMaps converts site quality metrics to generic map format
func (f *GnomadV4VariantFetcher) convertSiteQualityMetricsToMaps(metrics []struct {
	Metric string  `json:"metric"`
	Value  float64 `json:"value"`
}) []map[string]interface{} {
	result := make([]map[string]interface{}, len(metrics))
	for i, m := range metrics {
		result[i] = map[string]interface{}{
			"metric": m.Metric,
			"value":  m.Value,
		}
	}
	return result
}

func (f *GnomadV4VariantFetcher) shapeJointData(data *GnomadV4JointData, subset string) *model.VariantDetailsJointData {
	jointData := data.Freq[subset]
	if jointData == nil {
		return nil
	}

	shaped := &model.VariantDetailsJointData{
		Ac:              jointData.AC,
		An:              jointData.AN,
		HemizygoteCount: &jointData.HemizygoteCount,
		HomozygoteCount: &jointData.HomozygoteCount,
		Filters:         []string{}, // Initialize as empty array
	}

	// Combine filters from frequency data and joint-level flags
	if jointData.Filters != nil {
		shaped.Filters = append(shaped.Filters, jointData.Filters...)
	}
	if data.Flags != nil {
		shaped.Filters = append(shaped.Filters, data.Flags...)
	}
	
	// Add AC=0 filter if needed
	shaped.Filters = AddAC0FilterIfNeeded(shaped.Filters, jointData.AC)
	
	// Ensure filters is not nil
	if shaped.Filters == nil {
		shaped.Filters = []string{}
	}

	// Shape populations
	shaped.Populations = make([]*model.PopulationAlleleFrequencies, len(jointData.AncestryGroups))
	for i, pop := range jointData.AncestryGroups {
		shaped.Populations[i] = &model.PopulationAlleleFrequencies{
			ID:              pop.ID,
			Ac:              pop.AC,
			An:              pop.AN,
			HomozygoteCount: pop.HomozygoteCount,
			HemizygoteCount: &pop.HemizygoteCount,
			AcHemi:          &pop.HemizygoteCount, // Set AcHemi to ensure it's always non-nil
			AcHom:           pop.HomozygoteCount,   // Set AcHom to match HomozygoteCount
		}
	}

	// Add FAF95 data if available
	if data.Fafmax != nil {
		shaped.Faf95 = &model.VariantFilteringAlleleFrequency{
			Popmax:           &data.Fafmax.Faf95Max,
			PopmaxPopulation: &data.Fafmax.Faf95MaxGenAnc,
		}
		shaped.Faf99 = &model.VariantFilteringAlleleFrequency{
			Popmax:           &data.Fafmax.Faf99Max,
			PopmaxPopulation: &data.Fafmax.Faf99MaxGenAnc,
		}
	}

	// Add freq_comparison_stats if available
	if data.FreqComparisonStats != nil {
		shaped.FreqComparisonStats = shapeFreqComparisonStats(data.FreqComparisonStats)
	}

	return shaped
}

// shapeFreqComparisonStats converts raw freq comparison stats to GraphQL model
func shapeFreqComparisonStats(stats map[string]interface{}) *model.VariantJointFrequencyComparisonStats {
	shaped := &model.VariantJointFrequencyComparisonStats{}

	// Shape contingency table test
	if ctTest, ok := stats["contingency_table_test"].([]interface{}); ok {
		var contingencyTests []*model.ContingencyTableTest
		for _, test := range ctTest {
			if testMap, ok := test.(map[string]interface{}); ok {
				ct := &model.ContingencyTableTest{}
				if pValue, ok := testMap["p_value"].(float64); ok {
					ct.PValue = &pValue
				}
				if oddsRatio, ok := testMap["odds_ratio"].(float64); ok {
					oddsRatioStr := fmt.Sprintf("%f", oddsRatio)
					ct.OddsRatio = &oddsRatioStr
				}
				contingencyTests = append(contingencyTests, ct)
			}
		}
		shaped.ContingencyTableTest = contingencyTests
	} else if ctTest, ok := stats["contingency_table_test"].(map[string]interface{}); ok {
		// Handle single test case
		ct := &model.ContingencyTableTest{}
		if pValue, ok := ctTest["p_value"].(float64); ok {
			ct.PValue = &pValue
		}
		if oddsRatio, ok := ctTest["odds_ratio"].(float64); ok {
			oddsRatioStr := fmt.Sprintf("%f", oddsRatio)
			ct.OddsRatio = &oddsRatioStr
		}
		shaped.ContingencyTableTest = []*model.ContingencyTableTest{ct}
	}

	// Shape Cochran-Mantel-Haenszel test
	if cmhTest, ok := stats["cochran_mantel_haenszel_test"].(map[string]interface{}); ok {
		shaped.CochranMantelHaenszelTest = &model.CochranMantelHaenszelTest{}
		if pValue, ok := cmhTest["p_value"].(float64); ok {
			shaped.CochranMantelHaenszelTest.PValue = &pValue
		}
		if chisq, ok := cmhTest["chisq"].(float64); ok {
			shaped.CochranMantelHaenszelTest.Chisq = &chisq
		}
	}

	// Shape stat union
	if statUnion, ok := stats["stat_union"].(map[string]interface{}); ok {
		shaped.StatUnion = &model.StatUnion{}
		if pValue, ok := statUnion["p_value"].(float64); ok {
			shaped.StatUnion.PValue = &pValue
		}
		if genAncs, ok := statUnion["gen_ancs"].([]interface{}); ok {
			shaped.StatUnion.GenAncs = toStringSlice(genAncs)
		}
		if statTestName, ok := statUnion["stat_test_name"].(string); ok {
			shaped.StatUnion.StatTestName = &statTestName
		}
	}

	return shaped
}

func (f *GnomadV4VariantFetcher) getColocatedVariants(colocatedMap map[string][]string) []string {
	if f.Subset == "" || colocatedMap == nil {
		return nil
	}

	return colocatedMap[f.Subset]
}

// Batch fetching methods.
func (f *GnomadV4VariantFetcher) FetchVariantsByGene(ctx context.Context, client *elastic.Client, gene *model.Gene) ([]*model.Variant, error) {
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

	// Determine page size - use smaller size for large genes
	pageSize := 10000
	largeGenes := []string{
		"ENSG00000012048", // BRCA1
		"ENSG00000139618", // BRCA2
		"ENSG00000171862", // PTEN
		"ENSG00000141510", // TP53
		// Add more large genes as needed
	}
	for _, largeGene := range largeGenes {
		if gene.GeneID == largeGene {
			pageSize = 500
			break
		}
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
		"size":    pageSize,
	}

	// Execute search
	resp, err := client.Search(ctx, f.ESIndex, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gnomAD v4 variants by gene: %w", err)
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
		var doc GnomadV4VariantDocument
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue
		}

		// Check if variant has data in subset
		exomeSubset := f.Subset
		genomeSubset := "all"

		hasExomeData := doc.Exome != nil && 
			doc.Exome.Freq[exomeSubset] != nil && 
			doc.Exome.Freq[exomeSubset].ACRaw > 0

		hasGenomeData := doc.Genome != nil && 
			doc.Genome.Freq[genomeSubset] != nil && 
			doc.Genome.Freq[genomeSubset].ACRaw > 0

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

// shapeVariantSummary converts a gnomAD v4 document to a summary Variant model for lists
func (f *GnomadV4VariantFetcher) shapeVariantSummary(doc *GnomadV4VariantDocument, geneID string) *model.Variant {
	if doc == nil {
		return nil
	}

	// Get subset-specific keys
	exomeSubset := f.Subset
	genomeSubset := "all"
	jointSubset := "all"

	// Build exome data if present
	var exomeData *model.VariantDetailsExomeData
	if doc.Exome != nil && doc.Exome.Freq[exomeSubset] != nil && doc.Exome.Freq[exomeSubset].AC > 0 {
		exomeData = f.shapeExomeData(doc.Exome, exomeSubset)
	}

	// Build genome data if present
	var genomeData *model.VariantDetailsGenomeData
	if doc.Genome != nil && doc.Genome.Freq[genomeSubset] != nil && doc.Genome.Freq[genomeSubset].AC > 0 {
		genomeData = f.shapeGenomeData(doc.Genome)
	}

	// Build joint data if present
	var jointData *model.VariantDetailsJointData
	if doc.Joint != nil && doc.Joint.Freq[jointSubset] != nil && doc.Joint.Freq[jointSubset].AC > 0 {
		jointData = f.shapeJointData(doc.Joint, jointSubset)
	}

	// Create the variant
	variant := &model.Variant{
		VariantID:       doc.VariantID,
		ReferenceGenome: model.ReferenceGenomeIDGRCh38,
		Chrom:           doc.Chrom,
		Pos:             doc.Pos,
		Ref:             doc.Ref,
		Alt:             doc.Alt,
		Exome:           exomeData,
		Genome:          genomeData,
		Joint:           jointData,
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

	// Add full transcript consequences
	variant.TranscriptConsequences = ShapeTranscriptConsequences(doc.TranscriptConsequences, TranscriptConsequenceOptions{
		IncludeENSEMBLOnly: true,
	})

	return variant
}

func (f *GnomadV4VariantFetcher) FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.Variant, error) {
	// Build the query to find variants in the region
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{
						"term": map[string]interface{}{
							// v4 uses "chr" prefixed contigs
							"locus.contig": "chr" + chrom,
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
		return nil, fmt.Errorf("failed to fetch gnomAD v4 variants by region: %w", err)
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
		var doc GnomadV4VariantDocument
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
		genomeSubset := "all"

		hasExomeData := doc.Exome != nil &&
			doc.Exome.Freq[exomeSubset] != nil &&
			doc.Exome.Freq[exomeSubset].ACRaw > 0

		hasGenomeData := doc.Genome != nil &&
			doc.Genome.Freq[genomeSubset] != nil &&
			doc.Genome.Freq[genomeSubset].ACRaw > 0

		if !hasExomeData && !hasGenomeData {
			continue
		}

		// Shape variant summary
		// Note: The context here is "region". GeneID is not available.
		variant := f.shapeVariantSummary(&doc, "")
		if variant != nil {
			variants = append(variants, variant)
		}
	}

	return variants, nil
}

func (f *GnomadV4VariantFetcher) FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.Variant, error) {
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
		return nil, fmt.Errorf("failed to fetch gnomAD v4 variants by transcript: %w", err)
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
		var doc GnomadV4VariantDocument
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
		genomeSubset := "all"

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

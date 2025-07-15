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
	return f.shapeVariantData(hit)
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

	return f.shapeVariantData(hit)
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

	return f.shapeVariantData(hit)
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

func (f *GnomadV4VariantFetcher) shapeVariantData(hit *elastic.Hit) (*model.VariantDetails, error) {
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

	// Add VRS data
	if doc.VRS != nil {
		if vrs, ok := doc.VRS["GA4GH:VA.Bfr3v-E0eFbBx_5NrpJlh6PmloPr6x7E"]; ok {
			if vrsMap, ok := vrs.(map[string]any); ok {
				caid := toString(vrsMap["id"])
				variant.Caid = &caid
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
				Alt: &model.Histogram{
					BinEdges: data.QualityMetrics.AlleleBalance.AltAdj.BinEdges,
					BinFreq:  data.QualityMetrics.AlleleBalance.AltAdj.BinFreq,
				},
			},
			GenotypeDepth: &model.GenotypeDepthHistogram{
				All: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeDepth.AllAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeDepth.AllAdj.BinFreq,
				},
				Alt: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeDepth.AltAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeDepth.AltAdj.BinFreq,
				},
			},
			GenotypeQuality: &model.GenotypeQualityHistogram{
				All: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeQuality.AllAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeQuality.AllAdj.BinFreq,
				},
				Alt: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeQuality.AltAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeQuality.AltAdj.BinFreq,
				},
			},
			SiteQualityMetrics: ShapeSiteQualityMetrics(f.convertSiteQualityMetricsToMaps(data.QualityMetrics.SiteQualityMetrics)),
		}
	}

	// Add age distribution
	if data.AgeDistribution != nil {
		shaped.AgeDistribution = ShapeAgeDistribution(
			data.AgeDistribution.Het.BinEdges, data.AgeDistribution.Het.BinFreq,
			data.AgeDistribution.Hom.BinEdges, data.AgeDistribution.Hom.BinFreq,
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
				Alt: &model.Histogram{
					BinEdges: data.QualityMetrics.AlleleBalance.AltAdj.BinEdges,
					BinFreq:  data.QualityMetrics.AlleleBalance.AltAdj.BinFreq,
				},
			},
			GenotypeDepth: &model.GenotypeDepthHistogram{
				All: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeDepth.AllAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeDepth.AllAdj.BinFreq,
				},
				Alt: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeDepth.AltAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeDepth.AltAdj.BinFreq,
				},
			},
			GenotypeQuality: &model.GenotypeQualityHistogram{
				All: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeQuality.AllAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeQuality.AllAdj.BinFreq,
				},
				Alt: &model.Histogram{
					BinEdges: data.QualityMetrics.GenotypeQuality.AltAdj.BinEdges,
					BinFreq:  data.QualityMetrics.GenotypeQuality.AltAdj.BinFreq,
				},
			},
			SiteQualityMetrics: ShapeSiteQualityMetrics(f.convertSiteQualityMetricsToMaps(data.QualityMetrics.SiteQualityMetrics)),
		}
	}

	// Add age distribution
	if data.AgeDistribution != nil {
		shaped.AgeDistribution = ShapeAgeDistribution(
			data.AgeDistribution.Het.BinEdges, data.AgeDistribution.Het.BinFreq,
			data.AgeDistribution.Hom.BinEdges, data.AgeDistribution.Hom.BinFreq,
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
		Filters:         jointData.Filters,
	}

	// Add AC=0 filter if needed
	shaped.Filters = AddAC0FilterIfNeeded(shaped.Filters, jointData.AC)

	// Shape populations
	shaped.Populations = make([]*model.PopulationAlleleFrequencies, len(jointData.AncestryGroups))
	for i, pop := range jointData.AncestryGroups {
		shaped.Populations[i] = &model.PopulationAlleleFrequencies{
			ID:              pop.ID,
			Ac:              pop.AC,
			An:              pop.AN,
			HomozygoteCount: pop.HomozygoteCount,
			HemizygoteCount: &pop.HemizygoteCount,
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
func (f *GnomadV4VariantFetcher) FetchVariantsByGene(ctx context.Context, client *elastic.Client, geneID string, transcriptID *string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v4 gene variant fetching not yet implemented")
}

func (f *GnomadV4VariantFetcher) FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v4 region variant fetching not yet implemented")
}

func (f *GnomadV4VariantFetcher) FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v4 transcript variant fetching not yet implemented")
}

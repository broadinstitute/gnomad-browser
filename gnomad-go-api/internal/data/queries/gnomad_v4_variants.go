package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

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
	if doc.Locus.Contig != "" && len(doc.Alleles) >= 2 {
		doc.Chrom = strings.TrimPrefix(doc.Locus.Contig, "chr")
		doc.Pos = doc.Locus.Position
		doc.Ref = doc.Alleles[0]
		doc.Alt = doc.Alleles[1]
	}

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

	// Add flags with proper context
	context := FlagContext{
		IsGene:       false, // Will be set based on query context
		IsRegion:     false,
		IsTranscript: false,
	}
	variant.Flags = f.getFlagsForContext(&doc, context)

	// Add other fields
	variant.ColocatedVariants = f.getColocatedVariants(doc.ColocatedVariants)
	variant.TranscriptConsequences = f.shapeTranscriptConsequences(doc.TranscriptConsequences)

	// Transform in_silico_predictors from map to list
	if doc.InSilicoPredictors != nil {
		variant.InSilicoPredictors = f.createInSilicoPredictorsList(doc.InSilicoPredictors)
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
	variant.MultiNucleotideVariants = f.shapeMultiNucleotideVariants(doc.MultiNucleotideVariants)

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
	if freqData.AC == 0 && !contains(shaped.Filters, "AC0") {
		shaped.Filters = append(shaped.Filters, "AC0")
	}

	// Shape populations with prefix merging (hgdp: and 1kg: prefixes)
	shaped.Populations = f.shapeAndMergePopulations(freqData.AncestryGroups, data.Freq, "exome")

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
			SiteQualityMetrics: f.shapeSiteQualityMetrics(data.QualityMetrics.SiteQualityMetrics),
		}
	}

	// Add age distribution
	if data.AgeDistribution != nil {
		shaped.AgeDistribution = &model.AgeDistribution{
			Het: f.shapeAgeHistogramFromBins(data.AgeDistribution.Het.BinEdges, data.AgeDistribution.Het.BinFreq),
			Hom: f.shapeAgeHistogramFromBins(data.AgeDistribution.Hom.BinEdges, data.AgeDistribution.Hom.BinFreq),
		}
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
	if freqData.AC == 0 && !contains(shaped.Filters, "AC0") {
		shaped.Filters = append(shaped.Filters, "AC0")
	}

	// Shape populations with prefix merging (hgdp: and 1kg: prefixes)
	shaped.Populations = f.shapeAndMergePopulations(freqData.AncestryGroups, data.Freq, "genome")

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
			SiteQualityMetrics: f.shapeSiteQualityMetrics(data.QualityMetrics.SiteQualityMetrics),
		}
	}

	// Add age distribution
	if data.AgeDistribution != nil {
		shaped.AgeDistribution = &model.AgeDistribution{
			Het: f.shapeAgeHistogramFromBins(data.AgeDistribution.Het.BinEdges, data.AgeDistribution.Het.BinFreq),
			Hom: f.shapeAgeHistogramFromBins(data.AgeDistribution.Hom.BinEdges, data.AgeDistribution.Hom.BinFreq),
		}
	}

	return shaped
}

func (f *GnomadV4VariantFetcher) shapeAndMergePopulations(basePopulations []GnomadV4PopulationData, freqMap map[string]*GnomadV4FrequencyData, sequenceType string) []*model.PopulationAlleleFrequencies {
	// Create map to track populations
	popMap := make(map[string]*model.PopulationAlleleFrequencies)

	// Add base populations
	for _, pop := range basePopulations {
		popMap[pop.ID] = &model.PopulationAlleleFrequencies{
			ID:              pop.ID,
			Ac:              pop.AC,
			An:              pop.AN,
			HomozygoteCount: pop.HomozygoteCount,
			HemizygoteCount: &pop.HemizygoteCount,
		}
	}

	// For genome data, merge HGDP and 1KG populations with prefixes
	if sequenceType == "genome" && freqMap["all"] != nil {
		// Add HGDP populations with "hgdp:" prefix
		if freqMap["all"].HGDP != nil && freqMap["all"].HGDP.ACRaw > 0 {
			for _, pop := range freqMap["all"].HGDP.AncestryGroups {
				prefixedID := "hgdp:" + pop.ID
				popMap[prefixedID] = &model.PopulationAlleleFrequencies{
					ID:              prefixedID,
					Ac:              pop.AC,
					An:              pop.AN,
					HomozygoteCount: pop.HomozygoteCount,
					HemizygoteCount: &pop.HemizygoteCount,
				}
			}
		}

		// Add 1KG populations with "1kg:" prefix
		if freqMap["all"].TGP != nil && freqMap["all"].TGP.ACRaw > 0 {
			for _, pop := range freqMap["all"].TGP.AncestryGroups {
				prefixedID := "1kg:" + pop.ID
				popMap[prefixedID] = &model.PopulationAlleleFrequencies{
					ID:              prefixedID,
					Ac:              pop.AC,
					An:              pop.AN,
					HomozygoteCount: pop.HomozygoteCount,
					HemizygoteCount: &pop.HemizygoteCount,
				}
			}
		}
	}

	// Convert to sorted slice
	result := make([]*model.PopulationAlleleFrequencies, 0, len(popMap))
	for _, pop := range popMap {
		result = append(result, pop)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].ID < result[j].ID
	})

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
	if jointData.AC == 0 && !contains(shaped.Filters, "AC0") {
		shaped.Filters = append(shaped.Filters, "AC0")
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
		}
	}

	return shaped
}

func (f *GnomadV4VariantFetcher) shapeAgeHistogramFromBins(binEdges, binFreq []float64) *model.Histogram {
	if len(binEdges) == 0 || len(binFreq) == 0 {
		return nil
	}

	return &model.Histogram{
		BinEdges: binEdges,
		BinFreq:  binFreq,
	}
}

func (f *GnomadV4VariantFetcher) shapeSiteQualityMetrics(metrics []struct {
	Metric string  `json:"metric"`
	Value  float64 `json:"value"`
}) []*model.VariantSiteQualityMetric {
	// Map from ES metric names to expected GraphQL metric names
	metricMapping := map[string]string{
		"AS_VarDP":           "DP",
		"AS_FS":              "FS",
		"inbreeding_coeff":   "InbreedingCoeff",
		"AS_MQ":              "MQ",
		"AS_MQRankSum":       "MQRankSum",
		"AS_QD":              "QD",
		"AS_ReadPosRankSum":  "ReadPosRankSum",
		"AS_SOR":             "SOR",
		"AS_VQSLOD":          "VQSLOD",
	}

	var result []*model.VariantSiteQualityMetric
	for _, m := range metrics {
		if mappedName, ok := metricMapping[m.Metric]; ok {
			result = append(result, &model.VariantSiteQualityMetric{
				Metric: mappedName,
				Value:  &m.Value,
			})
		}
	}

	return result
}


func (f *GnomadV4VariantFetcher) getFlagsForContext(doc *GnomadV4VariantDocument, context FlagContext) []string {
	var flags []string

	// Base flags from document
	flags = append(flags, doc.Flags...)

	// Add regional flags hoisted from exome/genome
	regionalFlags := []string{"par", "segdup", "lcr"}
	for _, flag := range regionalFlags {
		// Check exome flags
		if doc.Exome != nil && doc.Exome.Freq != nil && doc.Exome.Freq[f.Subset] != nil {
			if contains(doc.Exome.Freq[f.Subset].Filters, flag) && !contains(flags, flag) {
				flags = append(flags, flag)
			}
		}
		// Check genome flags
		if doc.Genome != nil && doc.Genome.Freq != nil && doc.Genome.Freq["all"] != nil {
			if contains(doc.Genome.Freq["all"].Filters, flag) && !contains(flags, flag) {
				flags = append(flags, flag)
			}
		}
	}

	// Add subset-specific flags
	if f.Subset != "all" {
		// Check for AC discrepancies
		if doc.Joint != nil && doc.Joint.Freq != nil && doc.Joint.Freq[f.Subset] != nil &&
			doc.Exome != nil && doc.Exome.Freq != nil && doc.Exome.Freq[f.Subset] != nil &&
			doc.Genome != nil && doc.Genome.Freq != nil && doc.Genome.Freq["all"] != nil {

			jointAC := doc.Joint.Freq[f.Subset].AC
			exomeGenomeAC := doc.Exome.Freq[f.Subset].AC + doc.Genome.Freq["all"].AC

			if jointAC != exomeGenomeAC {
				flags = append(flags, "discrepant_ac")
			}
		}
	}

	// Context-dependent flags (gene vs region vs transcript)
	if context.IsGene && context.GeneID != "" {
		// Add gene-specific flags - only check consequences for the specific gene
		for _, tc := range doc.TranscriptConsequences {
			// Filter by gene ID
			if geneID, ok := tc["gene_id"].(string); !ok || geneID != context.GeneID {
				continue
			}
			
			// Check for lc_lof flag
			if lof, ok := tc["lof"].(string); ok && lof == "LC" {
				flags = append(flags, "lc_lof")
			}

			// Check for lof_flag
			if lofFlags, ok := tc["lof_flags"].(string); ok && lofFlags != "" {
				flags = append(flags, "lof_flag")
			}

			// Check for nc_transcript
			if biotype, ok := tc["biotype"].(string); ok && biotype != "protein_coding" {
				flags = append(flags, "nc_transcript")
			}
		}
	}
	
	if context.IsTranscript && context.TranscriptID != "" {
		// Add transcript-specific flags - only check consequences for the specific transcript
		for _, tc := range doc.TranscriptConsequences {
			// Filter by transcript ID
			if transcriptID, ok := tc["transcript_id"].(string); !ok || transcriptID != context.TranscriptID {
				continue
			}
			
			// Check for lc_lof flag
			if lof, ok := tc["lof"].(string); ok && lof == "LC" {
				flags = append(flags, "lc_lof")
			}

			// Check for lof_flag
			if lofFlags, ok := tc["lof_flags"].(string); ok && lofFlags != "" {
				flags = append(flags, "lof_flag")
			}

			// Check for nc_transcript
			if biotype, ok := tc["biotype"].(string); ok && biotype != "protein_coding" {
				flags = append(flags, "nc_transcript")
			}
		}
	}

	return uniqueStrings(flags)
}

func (f *GnomadV4VariantFetcher) getColocatedVariants(colocatedMap map[string][]string) []string {
	if f.Subset == "" || colocatedMap == nil {
		return nil
	}

	return colocatedMap[f.Subset]
}

func (f *GnomadV4VariantFetcher) shapeTranscriptConsequences(consequences []map[string]any) []*model.TranscriptConsequence {
	if len(consequences) == 0 {
		return nil
	}

	var result []*model.TranscriptConsequence
	for _, csq := range consequences {
		// Only include ENSEMBL transcripts (filter out RefSeq)
		geneID, _ := csq["gene_id"].(string)
		if !strings.HasPrefix(geneID, "ENSG") {
			continue
		}

		tc := &model.TranscriptConsequence{
			MajorConsequence:    toStringPtr(csq["major_consequence"]),
			ConsequenceTerms:    toStringSlice(csq["consequence_terms"]),
			GeneID:              geneID,
			GeneSymbol:          toStringPtr(csq["gene_symbol"]),
			TranscriptID:        toString(csq["transcript_id"]),
			TranscriptVersion:   toStringPtr(csq["transcript_version"]),
			Hgvsc:               toStringPtr(csq["hgvsc"]),
			Hgvsp:               toStringPtr(csq["hgvsp"]),
			IsCanonical:         toBoolPtr(csq["canonical"]),
			IsManeSelect:        toBoolPtr(csq["mane_select"]),
			IsManeSelectVersion: toBoolPtr(csq["mane_select_version"]),
			RefseqID:            toStringPtr(csq["refseq_id"]),
			RefseqVersion:       toStringPtr(csq["refseq_version"]),
			Lof:                 toStringPtr(csq["lof"]),
			LofFilter:           toStringPtr(csq["lof_filter"]),
			LofFlags:            toStringPtr(csq["lof_flags"]),
		}

		result = append(result, tc)
	}

	return result
}

func (f *GnomadV4VariantFetcher) createInSilicoPredictorsList(predictorsMap map[string]any) []*model.VariantInSilicoPredictor {
	// Define the predictor IDs and their display names
	predictorInfo := []struct {
		id   string
		name string
	}{
		{"cadd", "CADD"},
		{"revel_max", "REVEL"},
		{"spliceai_ds_max", "SpliceAI"},
		{"pangolin_largest_ds", "Pangolin"},
		{"phylop", "phyloP"},
		{"sift_max", "SIFT"},
		{"polyphen_max", "PolyPhen"},
		{"primate_ai", "PrimateAI"},
	}

	var predictors []*model.VariantInSilicoPredictor

	for _, info := range predictorInfo {
		predData, exists := predictorsMap[info.id]
		if !exists {
			continue
		}

		predictor := &model.VariantInSilicoPredictor{
			ID:    info.name,
			Flags: []string{},
		}

		// Special handling for CADD (uses nested phred value)
		if info.id == "cadd" {
			if caddMap, ok := predData.(map[string]any); ok {
				if phred, ok := caddMap["phred"].(float64); ok {
					predictor.Value = fmt.Sprintf("%.3g", phred)
				}
			}
		} else {
			// Standard predictors
			if predMap, ok := predData.(map[string]any); ok {
				if prediction, ok := predMap["prediction"]; ok {
					predictor.Value = toString(prediction)
				}

				// Add flags if present
				if flags, ok := predMap["flags"].([]any); ok {
					for _, flag := range flags {
						predictor.Flags = append(predictor.Flags, toString(flag))
					}
				}
			} else {
				// Simple value
				predictor.Value = toString(predData)
			}
		}

		if predictor.Value != "" {
			predictors = append(predictors, predictor)
		}
	}

	return predictors
}

func (f *GnomadV4VariantFetcher) shapeMultiNucleotideVariants(mnvs []map[string]any) []*model.MultiNucleotideVariant {
	if len(mnvs) == 0 {
		return nil
	}

	var result []*model.MultiNucleotideVariant
	for _, mnv := range mnvs {
		shaped := &model.MultiNucleotideVariant{
			CombinedVariantID:    toString(mnv["combined_variant_id"]),
			OtherConstituentSnvs: toStringSlice(mnv["constituent_snvs"]),
			ChangesAminoAcids:    toBool(mnv["changes_amino_acids"]),
			NIndividuals:         toInt(mnv["n_individuals"]),
		}
		result = append(result, shaped)
	}

	return result
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


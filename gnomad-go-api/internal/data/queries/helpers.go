package queries

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// Population merging and shaping helpers

// ShapeAndMergePopulations shapes population data with optional prefix merging (for HGDP and 1KG)
func ShapeAndMergePopulations(basePopulations []map[string]interface{}, additionalPopulationSources map[string]interface{}, sequenceType string) []*model.PopulationAlleleFrequencies {
	// Create map to track populations
	popMap := make(map[string]*model.PopulationAlleleFrequencies)

	// Add base populations
	for _, pop := range basePopulations {
		popID := toString(pop["id"])
		if popID == "" {
			continue
		}

		ac := toInt(pop["ac"])
		an := toInt(pop["an"])
		homCount := toInt(pop["homozygote_count"])
		hemiCount := toInt(pop["hemizygote_count"])

		popMap[popID] = &model.PopulationAlleleFrequencies{
			ID:              popID,
			Ac:              ac,
			An:              an,
			HomozygoteCount: homCount,
			HemizygoteCount: &hemiCount,
			AcHemi:          &hemiCount, // Set AcHemi to ensure it's always non-nil
			AcHom:           homCount,   // Set AcHom to match HomozygoteCount
		}
	}

	// For genome data, merge HGDP and 1KG populations with prefixes
	if sequenceType == "genome" && additionalPopulationSources != nil {
		// Add HGDP populations with "hgdp:" prefix
		if hgdp, ok := additionalPopulationSources["hgdp"].(map[string]interface{}); ok {
			addPrefixedPopulations(hgdp, "hgdp:", popMap)
		}

		// Add 1KG populations with "1kg:" prefix
		if tgp, ok := additionalPopulationSources["tgp"].(map[string]interface{}); ok {
			addPrefixedPopulations(tgp, "1kg:", popMap)
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

// addPrefixedPopulations adds populations with a prefix to the population map
func addPrefixedPopulations(source map[string]interface{}, prefix string, popMap map[string]*model.PopulationAlleleFrequencies) {
	// Check if this source exists
	if source == nil {
		return
	}

	// Get ancestry groups
	ancestryGroups, ok := source["ancestry_groups"].([]interface{})
	if !ok {
		return
	}

	for _, ag := range ancestryGroups {
		pop, ok := ag.(map[string]interface{})
		if !ok {
			continue
		}

		popID := toString(pop["id"])
		if popID == "" {
			continue
		}

		prefixedID := prefix + popID
		ac := toInt(pop["ac"])
		an := toInt(pop["an"])
		homCount := toInt(pop["homozygote_count"])
		hemiCount := toInt(pop["hemizygote_count"])

		popMap[prefixedID] = &model.PopulationAlleleFrequencies{
			ID:              prefixedID,
			Ac:              ac,
			An:              an,
			HomozygoteCount: homCount,
			HemizygoteCount: &hemiCount,
			AcHemi:          &hemiCount, // Set AcHemi to ensure it's always non-nil
			AcHom:           homCount,   // Set AcHom to match HomozygoteCount
		}
	}
}

// Quality metrics helpers

// ShapeSiteQualityMetrics converts raw site quality metrics to GraphQL model
func ShapeSiteQualityMetrics(metrics []map[string]interface{}) []*model.VariantSiteQualityMetric {
	// For v4, we want to preserve the raw ES metric names
	var result []*model.VariantSiteQualityMetric
	for _, m := range metrics {
		metricName := toString(m["metric"])
		value := toFloat64Ptr(m["value"])
		if value != nil {
			result = append(result, &model.VariantSiteQualityMetric{
				Metric: metricName, // Use raw ES metric name
				Value:  value,
			})
		}
	}

	return result
}

// ShapeHistogram creates a histogram from bin edges and frequencies
func ShapeHistogram(binEdges, binFreq []float64) *model.Histogram {
	if len(binEdges) == 0 || len(binFreq) == 0 {
		return nil
	}

	return &model.Histogram{
		BinEdges: binEdges,
		BinFreq:  binFreq,
	}
}

// ShapeHistogramWithCounts creates histogram with n_smaller and n_larger counts
func ShapeHistogramWithCounts(binEdges, binFreq []float64, nSmaller, nLarger int) *model.Histogram {
	if len(binEdges) == 0 || len(binFreq) == 0 {
		return nil
	}

	return &model.Histogram{
		BinEdges: binEdges,
		BinFreq:  binFreq,
		NSmaller: &nSmaller,
		NLarger:  &nLarger,
	}
}

// ShapeAgeDistribution creates age distribution from het/hom data
func ShapeAgeDistribution(hetBinEdges, hetBinFreq []float64, hetNSmaller, hetNLarger int,
	homBinEdges, homBinFreq []float64, homNSmaller, homNLarger int) *model.AgeDistribution {
	het := ShapeHistogramWithCounts(hetBinEdges, hetBinFreq, hetNSmaller, hetNLarger)
	hom := ShapeHistogramWithCounts(homBinEdges, homBinFreq, homNSmaller, homNLarger)

	if het == nil && hom == nil {
		return nil
	}

	return &model.AgeDistribution{
		Het: het,
		Hom: hom,
	}
}

// Filter helpers

// AddAC0FilterIfNeeded adds AC0 filter to filters list if AC is 0
func AddAC0FilterIfNeeded(filters []string, ac int) []string {
	if ac == 0 && !contains(filters, "AC0") {
		return append(filters, "AC0")
	}
	return filters
}

// Variant info helpers

// ExtractVariantInfo extracts basic variant information from locus and alleles
func ExtractVariantInfo(locus map[string]interface{}, alleles []interface{}) (chrom string, pos int, ref string, alt string) {
	if locus != nil {
		if contig, ok := locus["contig"].(string); ok {
			chrom = strings.TrimPrefix(contig, "chr")
		}
		if position, ok := locus["position"].(float64); ok {
			pos = int(position)
		}
	}

	if len(alleles) >= 2 {
		ref = toString(alleles[0])
		alt = toString(alleles[1])
	}

	return
}

// In silico predictor helpers

// formatPredictorValue formats a predictor value with appropriate precision
func formatPredictorValue(predictorID string, value float64) string {
	// Use 4 decimal places for these specific predictors to preserve trailing zeros
	if predictorID == "pangolin_largest_ds" || predictorID == "spliceai_ds_max" {
		return fmt.Sprintf("%.4f", value)
	}
	// For other predictors, use %.3g to remove trailing zeros
	return fmt.Sprintf("%.3g", value)
}

// CreateInSilicoPredictorsList creates a list of in silico predictors from a map
func CreateInSilicoPredictorsList(predictorsMap map[string]interface{}) []*model.VariantInSilicoPredictor {
	// Define the predictor IDs and their display names
	predictorInfo := []struct {
		id          string
		name        string
		isCADD      bool
		useRawValue bool
	}{
		{"cadd", "CADD", true, false},
		{"spliceai_ds_max", "SpliceAI", false, false},
		{"pangolin_largest_ds", "Pangolin", false, false},
		{"phylop", "phyloP", false, false},
		{"revel_max", "REVEL", false, false},
		{"sift_max", "SIFT", false, false},
		{"polyphen_max", "PolyPhen", false, false},
		{"primate_ai", "PrimateAI", false, false},
		// V2/V3 specific predictors
		{"revel", "REVEL", false, true},
		{"spliceai", "SpliceAI", false, true},
		{"sift", "SIFT", false, false},
		{"polyphen", "PolyPhen", false, false},
	}

	var predictors []*model.VariantInSilicoPredictor

	for _, info := range predictorInfo {
		predData, exists := predictorsMap[info.id]
		if !exists {
			continue
		}

		predictor := &model.VariantInSilicoPredictor{
			ID:    info.id,  // Use lowercase ID instead of display name
			Flags: []string{},
		}

		// Special handling for CADD (uses nested phred value)
		if info.isCADD {
			if caddMap, ok := predData.(map[string]interface{}); ok {
				if phred, ok := caddMap["phred"].(float64); ok {
					predictor.Value = formatPredictorValue(info.id, phred)
				}
			}
		} else if info.useRawValue {
			// For predictors that store raw float values
			if val, ok := predData.(float64); ok {
				predictor.Value = formatPredictorValue(info.id, val)
			}
		} else {
			// Standard predictors with prediction field
			if predMap, ok := predData.(map[string]interface{}); ok {
				if prediction, ok := predMap["prediction"]; ok {
					// For numeric predictions, format with appropriate precision
					if val, ok := prediction.(float64); ok {
						predictor.Value = formatPredictorValue(info.id, val)
					} else if val, ok := prediction.(string); ok {
						// Try to parse string as float for formatting
						if floatVal, err := strconv.ParseFloat(val, 64); err == nil {
							predictor.Value = formatPredictorValue(info.id, floatVal)
						} else {
							predictor.Value = val
						}
					} else {
						predictor.Value = toString(prediction)
					}
				}

				// Add flags if present
				if flags, ok := predMap["flags"].([]interface{}); ok {
					for _, flag := range flags {
						predictor.Flags = append(predictor.Flags, toString(flag))
					}
				}
			} else {
				// Simple value - try to format as float if possible
				if val, ok := predData.(float64); ok {
					predictor.Value = formatPredictorValue(info.id, val)
				} else {
					predictor.Value = toString(predData)
				}
			}
		}

		if predictor.Value != "" {
			predictors = append(predictors, predictor)
		}
	}

	return predictors
}

// Multi-nucleotide variant helpers

// ShapeMultiNucleotideVariants converts raw MNV data to GraphQL model
func ShapeMultiNucleotideVariants(mnvs []map[string]interface{}) []*model.MultiNucleotideVariant {
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

// Type conversion helpers

func toString(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

func toStringPtr(v interface{}) *string {
	if v == nil {
		return nil
	}
	s := toString(v)
	if s == "" {
		return nil
	}
	return &s
}

func toStringSlice(v interface{}) []string {
	if v == nil {
		return nil
	}

	if slice, ok := v.([]string); ok {
		return slice
	}

	if slice, ok := v.([]interface{}); ok {
		result := make([]string, 0, len(slice))
		for _, item := range slice {
			if s := toString(item); s != "" {
				result = append(result, s)
			}
		}
		return result
	}

	return nil
}

func toInt(v interface{}) int {
	if v == nil {
		return 0
	}
	if f, ok := v.(float64); ok {
		return int(f)
	}
	if i, ok := v.(int); ok {
		return i
	}
	return 0
}

func toFloat64Ptr(v interface{}) *float64 {
	if v == nil {
		return nil
	}
	if f, ok := v.(float64); ok {
		return &f
	}
	return nil
}

func toBool(v interface{}) bool {
	if v == nil {
		return false
	}
	if b, ok := v.(bool); ok {
		return b
	}
	return false
}

func toBoolPtr(v interface{}) *bool {
	if v == nil {
		return nil
	}
	b := toBool(v)
	return &b
}

// nullIfEmpty returns nil if the slice is empty, otherwise returns the slice
func nullIfEmpty(s []string) []string {
	if len(s) == 0 {
		return nil
	}
	return s
}

// ExtractHits extracts hits from Elasticsearch search response
func ExtractHits(response map[string]interface{}) ([]map[string]interface{}, error) {
	hitsObj, ok := response["hits"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected response structure: missing hits")
	}

	hitsArray, ok := hitsObj["hits"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected response structure: hits is not an array")
	}

	result := make([]map[string]interface{}, 0, len(hitsArray))
	for _, hit := range hitsArray {
		hitMap, ok := hit.(map[string]interface{})
		if !ok {
			continue
		}
		result = append(result, hitMap)
	}

	return result, nil
}

// sortPopulations sorts populations by ID
func sortPopulations(populations []*model.PopulationAlleleFrequencies) {
	sort.Slice(populations, func(i, j int) bool {
		return populations[i].ID < populations[j].ID
	})
}

// mergeStringSlices merges multiple string slices, removing duplicates
func mergeStringSlices(slices ...[]string) []string {
	seen := make(map[string]bool)
	var result []string

	for _, slice := range slices {
		for _, s := range slice {
			if !seen[s] {
				seen[s] = true
				result = append(result, s)
			}
		}
	}

	return result
}

package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// Structural variant Elasticsearch indices
const (
	gnomadStructuralVariantsV2Index = "gnomad_structural_variants_v2"
	gnomadStructuralVariantsV3Index = "gnomad_structural_variants_v3"
)

// StructuralVariantDatasetParams holds dataset-specific configuration for SV queries
type StructuralVariantDatasetParams struct {
	Index            string
	Subset           string
	VariantIDParams  func(variantID string) map[string]any
	ReferenceGenome  model.ReferenceGenomeID
}

var structuralVariantDatasetParams = map[model.StructuralVariantDatasetID]StructuralVariantDatasetParams{
	model.StructuralVariantDatasetIDGnomadSvR2_1: {
		Index:           gnomadStructuralVariantsV2Index,
		Subset:          "all",
		VariantIDParams: v2VariantIDParams,
		ReferenceGenome: model.ReferenceGenomeIDGRCh37,
	},
	model.StructuralVariantDatasetIDGnomadSvR2_1Controls: {
		Index:           gnomadStructuralVariantsV2Index,
		Subset:          "controls",
		VariantIDParams: v2VariantIDParams,
		ReferenceGenome: model.ReferenceGenomeIDGRCh37,
	},
	model.StructuralVariantDatasetIDGnomadSvR2_1NonNeuro: {
		Index:           gnomadStructuralVariantsV2Index,
		Subset:          "non_neuro",
		VariantIDParams: v2VariantIDParams,
		ReferenceGenome: model.ReferenceGenomeIDGRCh37,
	},
	model.StructuralVariantDatasetIDGnomadSvR4: {
		Index:           gnomadStructuralVariantsV3Index,
		Subset:          "all",
		VariantIDParams: v3VariantIDParams,
		ReferenceGenome: model.ReferenceGenomeIDGRCh38,
	},
}

// Helper functions for variant ID parameters
func v2VariantIDParams(variantID string) map[string]any {
	return map[string]any{"variant_id": variantID}
}

func v3VariantIDParams(variantID string) map[string]any {
	return map[string]any{"variant_id_upper_case": strings.ToUpper(variantID)}
}

// FetchStructuralVariant fetches a single structural variant by ID and dataset
func FetchStructuralVariant(ctx context.Context, client *elastic.Client, variantID string, datasetID model.StructuralVariantDatasetID) (*model.StructuralVariantDetails, error) {
	params, exists := structuralVariantDatasetParams[datasetID]
	if !exists {
		return nil, fmt.Errorf("unsupported structural variant dataset: %s", datasetID)
	}

	// Build the query
	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": map[string]any{
					"term": params.VariantIDParams(variantID),
				},
			},
		},
		"size": 1,
	}

	// Execute search
	response, err := client.Search(ctx, params.Index, query)
	if err != nil {
		return nil, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	if len(response.Hits.Hits) == 0 {
		return nil, nil // Variant not found
	}

	hit := response.Hits.Hits[0]

	// Extract the 'value' field from _source
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid document structure: missing 'value' field")
	}

	// If the variant is not in the subset, then variant.freq[subset] will be an empty object
	freq, ok := value["freq"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid document structure: missing 'freq' field")
	}

	subsetData, ok := freq[params.Subset].(map[string]any)
	if !ok || subsetData["ac"] == nil {
		return nil, nil // Variant not in subset
	}

	// Shape the data into our GraphQL model
	return shapeStructuralVariantDetails(value, subsetData, params.ReferenceGenome)
}

// FetchStructuralVariantsByGene fetches structural variants overlapping a gene
func FetchStructuralVariantsByGene(ctx context.Context, client *elastic.Client, geneSymbol string, datasetID model.StructuralVariantDatasetID) ([]*model.StructuralVariant, error) {
	params, exists := structuralVariantDatasetParams[datasetID]
	if !exists {
		return []*model.StructuralVariant{}, fmt.Errorf("unsupported structural variant dataset: %s", datasetID)
	}

	esFields := getESFieldsToFetch(params.Subset)

	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": map[string]any{
					"term": map[string]any{
						"genes": geneSymbol,
					},
				},
			},
		},
		"sort": []map[string]any{
			{"xpos": map[string]any{"order": "asc"}},
		},
		"_source": esFields,
		"size":    10000,
	}

	// Fetch all results
	hits, err := fetchAllStructuralVariantSearchResults(ctx, client, params.Index, query)
	if err != nil {
		return []*model.StructuralVariant{}, fmt.Errorf("failed to fetch structural variants by gene: %w", err)
	}

	results := []*model.StructuralVariant{}

	for _, hit := range hits {
		value, ok := hit.Source["value"].(map[string]any)
		if !ok {
			continue
		}

		freq, ok := value["freq"].(map[string]any)
		if !ok {
			continue
		}

		subsetData, ok := freq[params.Subset].(map[string]any)
		if !ok || getIntFromInterface(subsetData["ac"]) <= 0 {
			continue
		}

		// Find major consequence for this gene
		majorConsequence := findMajorConsequenceForGene(value, geneSymbol)

		variant, err := shapeStructuralVariant(value, subsetData, params.ReferenceGenome, majorConsequence)
		if err != nil {
			continue // Skip malformed variants
		}

		results = append(results, variant)
	}

	return results, nil
}

// FetchStructuralVariantsByRegion fetches structural variants in a genomic region
func FetchStructuralVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int, datasetID model.StructuralVariantDatasetID) ([]*model.StructuralVariant, error) {
	params, exists := structuralVariantDatasetParams[datasetID]
	if !exists {
		return []*model.StructuralVariant{}, fmt.Errorf("unsupported structural variant dataset: %s", datasetID)
	}

	esFields := getESFieldsToFetch(params.Subset)

	// Calculate extended coordinates for region queries
	xstart := calculateExtendedCoordinate(chrom, start)
	xstop := calculateExtendedCoordinate(chrom, stop)

	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"should": []map[string]any{
					{
						"bool": map[string]any{
							"must": []map[string]any{
								{"range": map[string]any{"xpos": map[string]any{"lte": xstop}}},
								{"range": map[string]any{"xend": map[string]any{"gte": xstart}}},
							},
						},
					},
					{
						"bool": map[string]any{
							"must": []map[string]any{
								{"range": map[string]any{"xpos2": map[string]any{"lte": xstop}}},
								{"range": map[string]any{"xend2": map[string]any{"gte": xstart}}},
							},
						},
					},
				},
			},
		},
		"sort": []map[string]any{
			{"xpos": map[string]any{"order": "asc"}},
		},
		"_source": esFields,
		"size":    10000,
	}

	// Fetch all results
	hits, err := fetchAllStructuralVariantSearchResults(ctx, client, params.Index, query)
	if err != nil {
		return []*model.StructuralVariant{}, fmt.Errorf("failed to fetch structural variants by region: %w", err)
	}

	results := []*model.StructuralVariant{}

	for _, hit := range hits {
		value, ok := hit.Source["value"].(map[string]any)
		if !ok {
			continue
		}

		freq, ok := value["freq"].(map[string]any)
		if !ok {
			continue
		}

		subsetData, ok := freq[params.Subset].(map[string]any)
		if !ok || getIntFromInterface(subsetData["ac"]) <= 0 {
			continue
		}

		// Apply region-specific filtering
		if !shouldIncludeVariantInRegion(value, chrom, start, stop) {
			continue
		}

		// Find major consequence
		majorConsequence := findMajorConsequenceForRegion(value)

		variant, err := shapeStructuralVariant(value, subsetData, params.ReferenceGenome, majorConsequence)
		if err != nil {
			continue // Skip malformed variants
		}

		results = append(results, variant)
	}

	return results, nil
}

// Helper functions

func getESFieldsToFetch(subset string) []string {
	return []string{
		"value.chrom",
		"value.chrom2",
		"value.consequences",
		"value.end",
		"value.end2",
		"value.filters",
		fmt.Sprintf("value.freq.%s", subset),
		"value.intergenic",
		"value.length",
		"value.pos",
		"value.pos2",
		"value.reference_genome",
		"value.type",
		"value.variant_id",
	}
}

func fetchAllStructuralVariantSearchResults(ctx context.Context, client *elastic.Client, index string, query map[string]any) ([]elastic.Hit, error) {
	// For simplicity, we'll do a single search with a large size limit
	// In a production system, you might want to implement scrolling for very large result sets
	response, err := client.Search(ctx, index, query)
	if err != nil {
		return []elastic.Hit{}, err
	}

	if response.Hits.Hits == nil {
		return []elastic.Hit{}, nil
	}

	return response.Hits.Hits, nil
}

func findMajorConsequenceForGene(value map[string]any, geneSymbol string) *string {
	consequences, ok := value["consequences"].([]any)
	if !ok {
		return handleIntergenicConsequence(value)
	}

	for _, csqAny := range consequences {
		csq, ok := csqAny.(map[string]any)
		if !ok {
			continue
		}

		genes, ok := csq["genes"].([]any)
		if !ok {
			continue
		}

		for _, geneAny := range genes {
			if gene, ok := geneAny.(string); ok && gene == geneSymbol {
				if consequence, ok := csq["consequence"].(string); ok {
					return &consequence
				}
			}
		}
	}

	return handleIntergenicConsequence(value)
}

func findMajorConsequenceForRegion(value map[string]any) *string {
	consequences, ok := value["consequences"].([]any)
	if !ok || len(consequences) == 0 {
		return handleIntergenicConsequence(value)
	}

	// Take the first consequence
	if csq, ok := consequences[0].(map[string]any); ok {
		if consequence, ok := csq["consequence"].(string); ok {
			return &consequence
		}
	}

	return handleIntergenicConsequence(value)
}

func handleIntergenicConsequence(value map[string]any) *string {
	if intergenic, ok := value["intergenic"].(bool); ok && intergenic {
		consequence := "intergenic"
		return &consequence
	}
	return nil
}

func shouldIncludeVariantInRegion(value map[string]any, chrom string, start, stop int) bool {
	variantType, _ := value["type"].(string)
	variantChrom, _ := value["chrom"].(string)
	variantPos := getIntFromInterface(value["pos"])

	// Only include insertions if the start point falls within the requested region
	if variantType == "INS" {
		return variantChrom == chrom && variantPos >= start && variantPos <= stop
	}

	// Only include interchromosomal variants (CTX, BND) if one of the endpoints falls within the requested region
	if variantType == "BND" || variantType == "CTX" {
		// Check first position
		if variantChrom == chrom && variantPos >= start && variantPos <= stop {
			return true
		}

		// Check second position if it exists
		variantChrom2, _ := value["chrom2"].(string)
		variantPos2 := getIntFromInterface(value["pos2"])
		if variantChrom2 == chrom && variantPos2 >= start && variantPos2 <= stop {
			return true
		}

		return false
	}

	return true
}

func shapeStructuralVariantDetails(value, subsetData map[string]any, referenceGenome model.ReferenceGenomeID) (*model.StructuralVariantDetails, error) {
	// Extract basic fields
	variantID, _ := value["variant_id"].(string)
	chrom, _ := value["chrom"].(string)
	pos := getIntFromInterface(value["pos"])
	end := getIntFromInterface(value["end"])

	// Extract frequency data
	ac := getIntFromInterface(subsetData["ac"])
	an := getIntFromInterface(subsetData["an"])
	var af float64
	if an > 0 {
		af = float64(ac) / float64(an)
	}

	// Handle age distribution
	var ageDistribution *model.StructuralVariantAgeDistribution
	if ageDist, ok := value["age_distribution"].(map[string]any); ok {
		ageDistribution = shapeAgeDistribution(ageDist)
	}

	// Handle genotype quality
	var genotypeQuality *model.StructuralVariantGenotypeQuality
	if gtQual, ok := value["genotype_quality"].(map[string]any); ok {
		genotypeQuality = shapeGenotypeQuality(gtQual)
	}

	// Handle populations
	var populations []*model.StructuralVariantPopulation
	if pops, ok := subsetData["populations"].(map[string]any); ok {
		populations = shapePopulations(pops)
	}

	// Handle consequences
	var consequences []*model.StructuralVariantConsequence
	if csqs, ok := value["consequences"].([]any); ok {
		consequences = shapeConsequences(csqs)
	}

	// Handle copy numbers
	var copyNumbers []*model.StructuralVariantCopyNumber
	if cns, ok := subsetData["copy_numbers"].([]any); ok {
		copyNumbers = shapeCopyNumbers(cns)
	}

	// Extract other fields
	chrom2 := getStringPtr(value["chrom2"])
	end2 := getIntPtr(value["end2"])
	pos2 := getIntPtr(value["pos2"])
	length := getIntPtr(value["length"])
	variantType := getStringPtr(value["type"])
	qual := getFloatPtr(value["qual"])
	majorConsequence := getStringPtr(value["major_consequence"])

	// Extract string arrays
	algorithms := convertStringPtrArrayToStringArray(getStringArray(value["algorithms"]))
	alts := convertStringPtrArrayToStringArray(getStringArray(value["alts"]))
	evidence := convertStringPtrArrayToStringArray(getStringArray(value["evidence"]))
	filters := convertStringPtrArrayToStringArray(getStringArray(value["filters"]))
	genes := convertStringPtrArrayToStringArray(getStringArray(value["genes"]))
	cpxIntervals := convertStringPtrArrayToStringArray(getStringArray(value["cpx_intervals"]))

	// Extract optional string fields
	cpxType := getStringPtr(value["cpx_type"])

	// Handle deprecated fields
	homozygoteCount := getIntPtr(subsetData["homozygote_count"])
	hemizygoteCount := getIntPtr(subsetData["hemizygote_count"])
	acHom := getIntPtr(subsetData["ac_hom"])
	acHemi := getIntPtr(subsetData["ac_hemi"])

	return &model.StructuralVariantDetails{
		VariantID:         variantID,
		ReferenceGenome:   referenceGenome,
		Chrom:             chrom,
		Pos:               pos,
		End:               end,
		Chrom2:            chrom2,
		End2:              end2,
		Pos2:              pos2,
		Length:            length,
		Type:              variantType,
		Ac:                ac,
		An:                an,
		Af:                af,
		HomozygoteCount:   homozygoteCount,
		HemizygoteCount:   hemizygoteCount,
		Qual:              qual,
		MajorConsequence:  majorConsequence,
		AgeDistribution:   ageDistribution,
		GenotypeQuality:   genotypeQuality,
		Populations:       populations,
		Consequences:      consequences,
		CopyNumbers:       copyNumbers,
		Algorithms:        algorithms,
		Alts:              alts,
		Evidence:          evidence,
		Filters:           filters,
		Genes:             genes,
		CpxIntervals:      cpxIntervals,
		CpxType:           cpxType,
		// Deprecated fields
		AcHom:  acHom,
		AcHemi: acHemi,
	}, nil
}

func shapeStructuralVariant(value, subsetData map[string]any, referenceGenome model.ReferenceGenomeID, majorConsequence *string) (*model.StructuralVariant, error) {
	// Extract basic fields
	variantID, _ := value["variant_id"].(string)
	chrom, _ := value["chrom"].(string)
	pos := getIntFromInterface(value["pos"])
	end := getIntFromInterface(value["end"])

	// Extract frequency data
	ac := getIntFromInterface(subsetData["ac"])
	an := getIntFromInterface(subsetData["an"])
	var af float64
	if an > 0 {
		af = float64(ac) / float64(an)
	}

	// Extract other fields
	chrom2 := getStringPtr(value["chrom2"])
	end2 := getIntPtr(value["end2"])
	pos2 := getIntPtr(value["pos2"])
	length := getIntPtr(value["length"])
	variantType := getStringPtr(value["type"])
	filters := convertStringPtrArrayToStringArray(getStringArray(value["filters"]))

	// Handle deprecated fields
	homozygoteCount := getIntPtr(subsetData["homozygote_count"])
	hemizygoteCount := getIntPtr(subsetData["hemizygote_count"])
	acHom := getIntPtr(subsetData["ac_hom"])
	acHemi := getIntPtr(subsetData["ac_hemi"])

	return &model.StructuralVariant{
		VariantID:         variantID,
		ReferenceGenome:   referenceGenome,
		Chrom:             chrom,
		Pos:               pos,
		End:               end,
		Chrom2:            chrom2,
		End2:              end2,
		Pos2:              pos2,
		Length:            length,
		Type:              variantType,
		Ac:                ac,
		An:                an,
		Af:                af,
		HomozygoteCount:   homozygoteCount,
		HemizygoteCount:   hemizygoteCount,
		MajorConsequence:  majorConsequence,
		Filters:           filters,
		// Deprecated fields
		Consequence: majorConsequence, // For backward compatibility
		AcHom:       acHom,
		AcHemi:      acHemi,
	}, nil
}

// Helper functions for data shaping

func shapeAgeDistribution(ageDist map[string]any) *model.StructuralVariantAgeDistribution {
	var result model.StructuralVariantAgeDistribution

	if het, ok := ageDist["het"].(map[string]any); ok && len(het) > 0 {
		result.Het = shapeHistogram(het)
	}

	if hom, ok := ageDist["hom"].(map[string]any); ok && len(hom) > 0 {
		result.Hom = shapeHistogram(hom)
	}

	// Only return if we have at least one histogram
	if result.Het != nil || result.Hom != nil {
		return &result
	}

	return nil
}

func shapeGenotypeQuality(gtQual map[string]any) *model.StructuralVariantGenotypeQuality {
	var result model.StructuralVariantGenotypeQuality

	if all, ok := gtQual["all"].(map[string]any); ok && len(all) > 0 {
		result.All = shapeHistogram(all)
	}

	if alt, ok := gtQual["alt"].(map[string]any); ok && len(alt) > 0 {
		result.Alt = shapeHistogram(alt)
	}

	// Only return if we have at least one histogram
	if result.All != nil || result.Alt != nil {
		return &result
	}

	return nil
}

func shapeHistogram(hist map[string]any) *model.Histogram {
	binEdges := convertFloat64PtrArrayToFloat64Array(getFloatArray(hist["bin_edges"]))
	binFreq := convertFloat64PtrArrayToFloat64Array(getFloatArray(hist["bin_freq"]))

	if len(binEdges) == 0 || len(binFreq) == 0 {
		return nil
	}

	return &model.Histogram{
		BinEdges:  binEdges,
		BinFreq:   binFreq,
		NSmaller:  getIntPtr(hist["n_smaller"]),
		NLarger:   getIntPtr(hist["n_larger"]),
	}
}

func shapePopulations(pops map[string]any) []*model.StructuralVariantPopulation {
	var result []*model.StructuralVariantPopulation

	for popID, popDataAny := range pops {
		if popData, ok := popDataAny.(map[string]any); ok {
			ac := getIntFromInterface(popData["ac"])
			an := getIntFromInterface(popData["an"])

			population := &model.StructuralVariantPopulation{
				ID:              popID,
				Ac:              ac,
				An:              an,
				HomozygoteCount: getIntPtr(popData["homozygote_count"]),
				HemizygoteCount: getIntPtr(popData["hemizygote_count"]),
				// Deprecated fields
				AcHom:  getIntPtr(popData["ac_hom"]),
				AcHemi: getIntPtr(popData["ac_hemi"]),
			}

			result = append(result, population)
		}
	}

	return result
}

func shapeConsequences(csqs []any) []*model.StructuralVariantConsequence {
	var result []*model.StructuralVariantConsequence

	for _, csqAny := range csqs {
		if csq, ok := csqAny.(map[string]any); ok {
			consequence, _ := csq["consequence"].(string)
			genes := convertStringPtrArrayToStringArray(getStringArray(csq["genes"]))

			result = append(result, &model.StructuralVariantConsequence{
				Consequence: consequence,
				Genes:       genes,
			})
		}
	}

	return result
}

func shapeCopyNumbers(cns []any) []*model.StructuralVariantCopyNumber {
	var result []*model.StructuralVariantCopyNumber

	for _, cnAny := range cns {
		if cn, ok := cnAny.(map[string]any); ok {
			copyNumber := getIntFromInterface(cn["copy_number"])
			ac := getIntFromInterface(cn["ac"])

			result = append(result, &model.StructuralVariantCopyNumber{
				CopyNumber: copyNumber,
				Ac:         ac,
			})
		}
	}

	return result
}

// Utility functions for type conversion

func getIntFromInterface(val any) int {
	switch v := val.(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	case json.Number:
		if i, err := v.Int64(); err == nil {
			return int(i)
		}
	}
	return 0
}

func getIntPtr(val any) *int {
	if val == nil {
		return nil
	}
	result := getIntFromInterface(val)
	return &result
}

func getFloatPtr(val any) *float64 {
	if val == nil {
		return nil
	}
	switch v := val.(type) {
	case float64:
		return &v
	case int:
		result := float64(v)
		return &result
	case json.Number:
		if f, err := v.Float64(); err == nil {
			return &f
		}
	}
	return nil
}

func getStringPtr(val any) *string {
	if val == nil {
		return nil
	}
	if str, ok := val.(string); ok {
		return &str
	}
	return nil
}

func getStringArray(val any) []*string {
	if val == nil {
		return nil
	}
	arr, ok := val.([]any)
	if !ok {
		return nil
	}

	var result []*string
	for _, item := range arr {
		if str, ok := item.(string); ok {
			result = append(result, &str)
		}
	}
	return result
}

func getFloatArray(val any) []*float64 {
	if val == nil {
		return nil
	}
	arr, ok := val.([]any)
	if !ok {
		return nil
	}

	var result []*float64
	for _, item := range arr {
		switch v := item.(type) {
		case float64:
			result = append(result, &v)
		case int:
			f := float64(v)
			result = append(result, &f)
		case json.Number:
			if f, err := v.Float64(); err == nil {
				result = append(result, &f)
			}
		}
	}
	return result
}

// Helper function to convert []*string to []string
func convertStringPtrArrayToStringArray(input []*string) []string {
	if input == nil {
		return nil
	}
	result := make([]string, len(input))
	for i, ptr := range input {
		if ptr != nil {
			result[i] = *ptr
		}
	}
	return result
}

// Helper function to convert []*float64 to []float64
func convertFloat64PtrArrayToFloat64Array(input []*float64) []float64 {
	if input == nil {
		return nil
	}
	result := make([]float64, len(input))
	for i, ptr := range input {
		if ptr != nil {
			result[i] = *ptr
		}
	}
	return result
}

// calculateExtendedCoordinate calculates extended coordinates for genomic regions
func calculateExtendedCoordinate(chrom string, pos int) int64 {
	// This is a simplified version - you may need to adjust based on your specific coordinate system
	// Typically this involves chromosome offsets for creating a linear coordinate system
	chromNum := getChromosomeNumber(chrom)
	return int64(chromNum)*1000000000 + int64(pos)
}

func getChromosomeNumber(chrom string) int {
	switch chrom {
	case "X":
		return 23
	case "Y":
		return 24
	case "MT", "M":
		return 25
	default:
		// Try to parse as integer
		if num := getIntFromInterface(chrom); num > 0 && num <= 22 {
			return num
		}
		return 0
	}
}
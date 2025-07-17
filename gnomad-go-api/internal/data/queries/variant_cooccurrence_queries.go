package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

const VariantCooccurrenceIndex = "gnomad_v2_variant_cooccurrence"

// VEP consequences considered coding and UTR variants
var codingAndUTRVepConsequences = map[string]bool{
	"transcript_ablation":               true,
	"splice_acceptor_variant":           true,
	"splice_donor_variant":              true,
	"stop_gained":                       true,
	"frameshift_variant":                true,
	"stop_lost":                         true,
	"start_lost":                        true,
	"initiator_codon_variant":           true,
	"transcript_amplification":          true,
	"inframe_insertion":                 true,
	"inframe_deletion":                  true,
	"missense_variant":                  true,
	"protein_altering_variant":          true,
	"splice_region_variant":             true,
	"incomplete_terminal_codon_variant": true,
	"start_retained_variant":            true,
	"stop_retained_variant":             true,
	"synonymous_variant":                true,
	"coding_sequence_variant":           true,
	"mature_miRNA_variant":              true,
	"five_prime_UTR_variant":            true,
	"three_prime_UTR_variant":           true,
}

// VariantCooccurrenceDocument represents the Elasticsearch document structure
type VariantCooccurrenceDocument struct {
	VariantIDs            []string                      `json:"variant_ids"`
	GenotypeCounts        []int                         `json:"genotype_counts"`
	HaplotypeCounts       []float64                     `json:"haplotype_counts"`
	PCompoundHeterozygous *float64                      `json:"p_compound_heterozygous"`
	Populations           []VariantCooccurrenceInPopDoc `json:"populations"`
}

type VariantCooccurrenceInPopDoc struct {
	ID                    string    `json:"id"`
	GenotypeCounts        []int     `json:"genotype_counts"`
	HaplotypeCounts       []float64 `json:"haplotype_counts"`
	PCompoundHeterozygous *float64  `json:"p_compound_heterozygous"`
}

// VariantCategoryCounts represents genotype categories for a variant
type VariantCategoryCounts struct {
	NHomAlt     int
	NHet        int
	NHomRef     int
	Populations []PopulationCategoryCounts
}

type PopulationCategoryCounts struct {
	ID      string
	NHomAlt int
	NHet    int
	NHomRef int
}

// FetchVariantCooccurrence fetches variant co-occurrence data for a pair of variants
func FetchVariantCooccurrence(ctx context.Context, client *elastic.Client, variantIDs []string, datasetID string) (*model.VariantCooccurrence, error) {
	if len(variantIDs) != 2 {
		return nil, fmt.Errorf("a pair of variants is required")
	}

	if variantIDs[0] == variantIDs[1] {
		return nil, fmt.Errorf("variants must be different")
	}

	if datasetID != "gnomad_r2_1" {
		return nil, fmt.Errorf("variant cooccurrence is not available for dataset %s", datasetID)
	}

	// First, fetch the individual variants to validate they exist and meet requirements
	variants := make([]*model.VariantDetails, 0, 2)
	for _, variantID := range variantIDs {
		variant, err := fetchVariantForCooccurrence(ctx, client, variantID, datasetID)
		if err != nil {
			return nil, err
		}
		variants = append(variants, variant)
	}

	// Validate that co-occurrence should be available
	if err := validateCooccurrenceAvailability(variants); err != nil {
		return nil, err
	}

	// Try to fetch pre-computed co-occurrence data
	result, err := fetchPrecomputedCooccurrence(ctx, client, variantIDs)
	if err != nil {
		return nil, err
	}

	if result != nil {
		return result, nil
	}

	// If no pre-computed data, compute from raw variant data using new approach
	return computeCooccurrenceFromRawVariants(ctx, client, variantIDs, datasetID)
}

// fetchVariantForCooccurrence fetches a variant for co-occurrence analysis
func fetchVariantForCooccurrence(ctx context.Context, client *elastic.Client, variantID string, datasetID string) (*model.VariantDetails, error) {
	// Normalize the variant ID like the main resolver does
	normalizedID := NormalizeVariantID(variantID)

	// Use the variant dispatcher to fetch the variant
	variant, err := FetchVariantByID(ctx, client, datasetID, normalizedID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "Variant not found") {
			return nil, fmt.Errorf("variant co-occurrence is only available for variants found in gnomAD")
		}
		return nil, err
	}

	if variant == nil {
		return nil, fmt.Errorf("variant co-occurrence is only available for variants found in gnomAD")
	}

	return variant, nil
}

// fetchRawVariantForCooccurrence fetches raw variant data for cooccurrence analysis
// This matches the TypeScript approach of accessing exomeFreq = variant.exome.freq.gnomad
func fetchRawVariantForCooccurrence(ctx context.Context, client *elastic.Client, variantID string, datasetID string) (*GnomadV2VariantDocument, error) {
	if datasetID != "gnomad_r2_1" {
		return nil, fmt.Errorf("cooccurrence analysis only supports gnomad_r2_1")
	}

	normalizedID := NormalizeVariantID(variantID)
	
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": map[string]interface{}{
					"term": map[string]interface{}{
						"variant_id": normalizedID,
					},
				},
			},
		},
		"_source": map[string]interface{}{
			"includes": []string{"value"},
		},
		"size": 1,
	}

	response, err := client.Search(ctx, GnomadV2Index, query)
	if err != nil {
		return nil, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	if len(response.Hits.Hits) == 0 {
		return nil, fmt.Errorf("variant co-occurrence is only available for variants found in gnomAD")
	}

	hit := response.Hits.Hits[0]
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid document structure")
	}

	var variant GnomadV2VariantDocument
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(jsonBytes, &variant); err != nil {
		return nil, err
	}

	return &variant, nil
}

// validateCooccurrenceAvailability validates that co-occurrence analysis should be available
func validateCooccurrenceAvailability(variants []*model.VariantDetails) error {
	// Ensure we have valid variants
	for i, variant := range variants {
		if variant == nil {
			return fmt.Errorf("variant %d is nil", i)
		}
	}

	// Check that variants are in the same gene
	variantGenes := make([]map[string]bool, len(variants))
	for i, variant := range variants {
		genes := make(map[string]bool)
		if variant.TranscriptConsequences != nil {
			for _, csq := range variant.TranscriptConsequences {
				if csq != nil && csq.GeneID != "" {
					genes[csq.GeneID] = true
				}
			}
		}
		variantGenes[i] = genes
	}

	// Find genes in common
	var genesInCommon map[string]bool
	if len(variantGenes) > 0 {
		genesInCommon = make(map[string]bool)
		for gene := range variantGenes[0] {
			genesInCommon[gene] = true
		}
		for i := 1; i < len(variantGenes); i++ {
			newCommon := make(map[string]bool)
			for gene := range genesInCommon {
				if variantGenes[i][gene] {
					newCommon[gene] = true
				}
			}
			genesInCommon = newCommon
		}
	}

	if len(genesInCommon) == 0 {
		return fmt.Errorf("variant co-occurrence is only available for variants that occur in the same gene")
	}

	// Check that at least one common gene has coding/UTR consequences for all variants
	hasValidConsequence := false
	for gene := range genesInCommon {
		allHaveValidConsequence := true
		for _, variant := range variants {
			hasValidConsequenceInGene := false
			if variant != nil && variant.TranscriptConsequences != nil {
				for _, csq := range variant.TranscriptConsequences {
					if csq != nil && csq.GeneID == gene && csq.MajorConsequence != nil {
						if codingAndUTRVepConsequences[string(*csq.MajorConsequence)] {
							hasValidConsequenceInGene = true
							break
						}
					}
				}
			}
			if !hasValidConsequenceInGene {
				allHaveValidConsequence = false
				break
			}
		}
		if allHaveValidConsequence {
			hasValidConsequence = true
			break
		}
	}

	if !hasValidConsequence {
		return fmt.Errorf("variant co-occurrence is only available for coding or UTR variants that occur in the same gene")
	}

	// Check that all variants appear in exome data
	for _, variant := range variants {
		if variant.Exome == nil {
			return fmt.Errorf("variant co-occurrence is only available for variants that appear in gnomAD exome samples")
		}
	}

	// Check allele frequency threshold (≤ 5%)
	for _, variant := range variants {
		if variant.Exome != nil && variant.Exome.An > 0 {
			af := float64(variant.Exome.Ac) / float64(variant.Exome.An)
			if af > 0.05 {
				return fmt.Errorf("variant co-occurrence is only available for variants with a global allele frequency ≤ 5%%")
			}
		}
	}

	return nil
}

// fetchPrecomputedCooccurrence fetches pre-computed co-occurrence data from Elasticsearch
func fetchPrecomputedCooccurrence(ctx context.Context, client *elastic.Client, variantIDs []string) (*model.VariantCooccurrence, error) {
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{"term": map[string]interface{}{"variant_ids": variantIDs[0]}},
					{"term": map[string]interface{}{"variant_ids": variantIDs[1]}},
				},
			},
		},
		"size": 1,
	}

	resp, err := client.Search(ctx, VariantCooccurrenceIndex, query)
	if err != nil {
		// If the index doesn't exist or there's an error, we'll compute from scratch
		return nil, nil
	}

	if resp.Hits.Total.Value == 0 {
		return nil, nil // No pre-computed data found
	}

	hit := resp.Hits.Hits[0]
	var doc VariantCooccurrenceDocument
	sourceBytes, err := json.Marshal(hit.Source)
	if err != nil {
		return nil, fmt.Errorf("error marshaling source: %w", err)
	}
	if err := json.Unmarshal(sourceBytes, &doc); err != nil {
		return nil, fmt.Errorf("error parsing variant co-occurrence document: %w", err)
	}

	result := convertToModelVariantCooccurrence(&doc)

	// Check if the result has valid data
	if len(result.GenotypeCounts) == 0 || len(result.HaplotypeCounts) == 0 {
		// Pre-computed data is empty, return nil to force computation
		return nil, nil
	}

	return result, nil
}

// computeCooccurrenceFromRawVariants computes co-occurrence from raw variant data
// This matches the TypeScript implementation exactly
func computeCooccurrenceFromRawVariants(ctx context.Context, client *elastic.Client, variantIDs []string, datasetID string) (*model.VariantCooccurrence, error) {
	// Fetch raw variants matching TypeScript approach
	rawVariants := make([]*GnomadV2VariantDocument, 2)
	for i, variantID := range variantIDs {
		variant, err := fetchRawVariantForCooccurrence(ctx, client, variantID, datasetID)
		if err != nil {
			return nil, err
		}
		rawVariants[i] = variant
	}

	// Get category counts for both variants using the new raw approach
	variantCounts := make([]VariantCategoryCounts, 2)
	for i, variant := range rawVariants {
		counts, err := getRawCategoryCounts(variant)
		if err != nil {
			return nil, err
		}
		variantCounts[i] = *counts
	}

	// Compute genotype counts following TypeScript logic exactly
	// genotype_counts are [AABB, AABb, AAbb, AaBB, AaBb, Aabb, aaBB, aaBb, aabb],
	// where A/B are reference alleles and a/b are alternate alleles of variants.
	genotypeCounts := []int{
		min(variantCounts[0].NHomRef, variantCounts[1].NHomRef), // AABB
		variantCounts[1].NHet,    // AABb
		variantCounts[1].NHomAlt, // AAbb
		variantCounts[0].NHet,    // AaBB
		0,                        // AaBb
		0,                        // Aabb
		variantCounts[0].NHomAlt, // aaBB
		0,                        // aaBb
		0,                        // aabb
	}

	haplotypeCounts := estimateHaplotypeCounts(genotypeCounts)
	pCompoundHet := getProbabilityCompoundHeterozygous(haplotypeCounts)

	// Compute population-specific data following TypeScript zip logic
	populations := make([]*model.VariantCooccurrenceInPopulation, 0)

	// Ensure both variants have the same populations in the same order
	if len(variantCounts[0].Populations) == len(variantCounts[1].Populations) {
		for i := 0; i < len(variantCounts[0].Populations); i++ {
			pop0 := variantCounts[0].Populations[i]
			pop1 := variantCounts[1].Populations[i]

			if pop0.ID == pop1.ID {
				popGenotypeCounts := []int{
					min(pop0.NHomRef, pop1.NHomRef), // AABB
					pop1.NHet,                       // AABb
					pop1.NHomAlt,                    // AAbb
					pop0.NHet,                       // AaBB
					0,                               // AaBb
					0,                               // Aabb
					pop0.NHomAlt,                    // aaBB
					0,                               // aaBb
					0,                               // aabb
				}

				popHaplotypeCounts := estimateHaplotypeCounts(popGenotypeCounts)
				popPCompoundHet := getProbabilityCompoundHeterozygous(popHaplotypeCounts)

				populations = append(populations, &model.VariantCooccurrenceInPopulation{
					ID:                    pop0.ID,
					GenotypeCounts:        popGenotypeCounts,
					HaplotypeCounts:       popHaplotypeCounts,
					PCompoundHeterozygous: popPCompoundHet,
				})
			}
		}
	}

	return &model.VariantCooccurrence{
		VariantIds:            variantIDs,
		GenotypeCounts:        genotypeCounts,
		HaplotypeCounts:       haplotypeCounts,
		PCompoundHeterozygous: pCompoundHet,
		Populations:           populations,
	}, nil
}

// computeCooccurrenceFromVariants computes co-occurrence from individual variant data (legacy function)
func computeCooccurrenceFromVariants(variants []*model.VariantDetails, variantIDs []string) (*model.VariantCooccurrence, error) {
	// Get category counts for both variants
	variantCounts := make([]VariantCategoryCounts, 2)
	for i, variant := range variants {
		counts, err := getCategoryCounts(variant)
		if err != nil {
			return nil, err
		}
		variantCounts[i] = *counts
	}

	// Compute genotype counts
	// genotype_counts are [AABB, AABb, AAbb, AaBB, AaBb, Aabb, aaBB, aaBb, aabb],
	// where A/B are reference alleles and a/b are alternate alleles of variants.
	genotypeCounts := []int{
		min(variantCounts[0].NHomRef, variantCounts[1].NHomRef), // AABB
		variantCounts[1].NHet,    // AABb
		variantCounts[1].NHomAlt, // AAbb
		variantCounts[0].NHet,    // AaBB
		0,                        // AaBb
		0,                        // Aabb
		variantCounts[0].NHomAlt, // aaBB
		0,                        // aaBb
		0,                        // aabb
	}

	haplotypeCounts := estimateHaplotypeCounts(genotypeCounts)
	pCompoundHet := getProbabilityCompoundHeterozygous(haplotypeCounts)

	// Compute population-specific data
	populations := make([]*model.VariantCooccurrenceInPopulation, 0)

	// Ensure both variants have the same populations in the same order
	if len(variantCounts[0].Populations) == len(variantCounts[1].Populations) {
		for i := 0; i < len(variantCounts[0].Populations); i++ {
			pop0 := variantCounts[0].Populations[i]
			pop1 := variantCounts[1].Populations[i]

			if pop0.ID == pop1.ID {
				popGenotypeCounts := []int{
					min(pop0.NHomRef, pop1.NHomRef), // AABB
					pop1.NHet,                       // AABb
					pop1.NHomAlt,                    // AAbb
					pop0.NHet,                       // AaBB
					0,                               // AaBb
					0,                               // Aabb
					pop0.NHomAlt,                    // aaBB
					0,                               // aaBb
					0,                               // aabb
				}

				popHaplotypeCounts := estimateHaplotypeCounts(popGenotypeCounts)
				popPCompoundHet := getProbabilityCompoundHeterozygous(popHaplotypeCounts)

				populations = append(populations, &model.VariantCooccurrenceInPopulation{
					ID:                    pop0.ID,
					GenotypeCounts:        popGenotypeCounts,
					HaplotypeCounts:       popHaplotypeCounts,
					PCompoundHeterozygous: popPCompoundHet,
				})
			}
		}
	}

	return &model.VariantCooccurrence{
		VariantIds:            variantIDs,
		GenotypeCounts:        genotypeCounts,
		HaplotypeCounts:       haplotypeCounts,
		PCompoundHeterozygous: pCompoundHet,
		Populations:           populations,
	}, nil
}

// getRawCategoryCounts extracts genotype category counts from raw variant document
// This matches the TypeScript getCategoryCounts function exactly
func getRawCategoryCounts(variant *GnomadV2VariantDocument) (*VariantCategoryCounts, error) {
	if variant.Exome == nil {
		return nil, fmt.Errorf("variant %s lacks exome data", variant.VariantID)
	}

	// TypeScript: const exomeFreq = variant.exome.freq.gnomad
	exomeFreq := variant.Exome.Freq["gnomad"]
	if exomeFreq == nil {
		return nil, fmt.Errorf("variant %s lacks gnomad subset exome data", variant.VariantID)
	}

	// TypeScript: const populationFrequencies = exomeFreq.populations.reduce(...)
	populationFrequencies := make(map[string]interface{})
	for _, pop := range exomeFreq.Populations {
		if strings.Contains(pop.ID, "_") {
			// Handle populations with suffix like "nfe_XX", "nfe_XY"
			parts := strings.Split(pop.ID, "_")
			if len(parts) == 2 {
				popID := parts[0]
				subPopID := parts[1]
				
				if populationFrequencies[popID] == nil {
					populationFrequencies[popID] = make(map[string]GnomadV2PopulationData)
				}
				// Safely cast to map, handling potential type conflicts
				if popMap, ok := populationFrequencies[popID].(map[string]GnomadV2PopulationData); ok {
					popMap[subPopID] = pop
				} else {
					// If there's a conflict, create a new map and migrate existing data
					newMap := make(map[string]GnomadV2PopulationData)
					if existingPop, ok := populationFrequencies[popID].(GnomadV2PopulationData); ok {
						// This case shouldn't normally happen, but handle it gracefully
						newMap["main"] = existingPop
					}
					newMap[subPopID] = pop
					populationFrequencies[popID] = newMap
				}
			}
		} else {
			populationFrequencies[pop.ID] = pop
		}
	}

	// Calculate total individuals following TypeScript logic exactly
	var nIndividuals int
	if variant.Chrom == "X" {
		// TypeScript: nIndividuals = populationFrequencies.XX.an / 2 + populationFrequencies.XY.an
		if xxPop, ok := populationFrequencies["XX"].(GnomadV2PopulationData); ok {
			nIndividuals += xxPop.AN / 2
		}
		if xyPop, ok := populationFrequencies["XY"].(GnomadV2PopulationData); ok {
			nIndividuals += xyPop.AN
		}
	} else if variant.Chrom == "Y" {
		// TypeScript: nIndividuals = populationFrequencies.XY.an
		if xyPop, ok := populationFrequencies["XY"].(GnomadV2PopulationData); ok {
			nIndividuals = xyPop.AN
		}
	} else {
		// TypeScript: nIndividuals = exomeFreq.an / 2
		nIndividuals = exomeFreq.AN / 2
	}

	// Calculate counts following TypeScript logic exactly
	// TypeScript: nHomAlt: exomeFreq.homozygote_count
	nHomAlt := exomeFreq.HomozygoteCount

	// TypeScript: nHet: exomeFreq.ac - 2 * exomeFreq.homozygote_count
	nHet := exomeFreq.AC - 2*exomeFreq.HomozygoteCount

	// TypeScript: nHomRef: nIndividuals - exomeFreq.ac + exomeFreq.homozygote_count
	nHomRef := nIndividuals - exomeFreq.AC + exomeFreq.HomozygoteCount

	// TypeScript function for populations
	getNumIndividualsInPopulation := func(popFreq interface{}) int {
		if variant.Chrom == "X" {
			// popFreq.XX.an / 2 + popFreq.XY.an
			if popMap, ok := popFreq.(map[string]GnomadV2PopulationData); ok {
				xxAn := 0
				xyAn := 0
				if xxPop, ok := popMap["XX"]; ok {
					xxAn = xxPop.AN
				}
				if xyPop, ok := popMap["XY"]; ok {
					xyAn = xyPop.AN
				}
				return xxAn/2 + xyAn
			}
		} else if variant.Chrom == "Y" {
			// popFreq.XY.an
			if popMap, ok := popFreq.(map[string]GnomadV2PopulationData); ok {
				if xyPop, ok := popMap["XY"]; ok {
					return xyPop.AN
				}
			}
		}
		// For autosomal chromosomes or as fallback
		if pop, ok := popFreq.(GnomadV2PopulationData); ok {
			return pop.AN / 2
		}
		return 0
	}

	// TypeScript: exomeFreq.populations.map(...).filter(...)
	populationIds := make([]string, 0)
	for _, pop := range exomeFreq.Populations {
		if !strings.Contains(pop.ID, "_") && pop.ID != "XX" && pop.ID != "XY" {
			populationIds = append(populationIds, pop.ID)
		}
	}

	// Build population data following TypeScript logic exactly
	populations := make([]PopulationCategoryCounts, 0)
	for _, popID := range populationIds {
		if popFreq, ok := populationFrequencies[popID]; ok {
			popNIndividuals := getNumIndividualsInPopulation(popFreq)
			
			var popNHomAlt, popNHet, popAc int
			if pop, ok := popFreq.(GnomadV2PopulationData); ok {
				popNHomAlt = pop.HomozygoteCount
				popAc = pop.AC
				popNHet = pop.AC - 2*pop.HomozygoteCount
			}

			// TypeScript: nHomRef: nIndividualsInPop - popFreq.ac + popFreq.homozygote_count
			popNHomRef := popNIndividuals - popAc + popNHomAlt

			populations = append(populations, PopulationCategoryCounts{
				ID:      popID,
				NHomAlt: popNHomAlt,
				NHet:    popNHet,
				NHomRef: popNHomRef,
			})
		}
	}

	return &VariantCategoryCounts{
		NHomAlt:     nHomAlt,
		NHet:        nHet,
		NHomRef:     nHomRef,
		Populations: populations,
	}, nil
}

// getCategoryCounts extracts genotype category counts from a variant (legacy function)
func getCategoryCounts(variant *model.VariantDetails) (*VariantCategoryCounts, error) {
	if variant.Exome == nil {
		return nil, fmt.Errorf("variant %s lacks exome data", variant.VariantID)
	}

	exome := variant.Exome

	// Build population frequencies map similar to TypeScript reduce function
	populationFrequencies := make(map[string]interface{})
	if exome.Populations != nil {
		for _, pop := range exome.Populations {
			if strings.Contains(pop.ID, "_") {
				// Handle populations with suffix like "nfe_XX", "nfe_XY"
				parts := strings.Split(pop.ID, "_")
				if len(parts) == 2 {
					popID := parts[0]
					subPopID := parts[1]
					
					if populationFrequencies[popID] == nil {
						populationFrequencies[popID] = make(map[string]*model.PopulationAlleleFrequencies)
					}
					popMap := populationFrequencies[popID].(map[string]*model.PopulationAlleleFrequencies)
					popMap[subPopID] = pop
				}
			} else {
				populationFrequencies[pop.ID] = pop
			}
		}
	}

	// Calculate total individuals following TypeScript logic
	var nIndividuals int
	if variant.Chrom == "X" {
		// nIndividuals = populationFrequencies.XX.an / 2 + populationFrequencies.XY.an
		if xxPop, ok := populationFrequencies["XX"].(*model.PopulationAlleleFrequencies); ok {
			nIndividuals += xxPop.An / 2
		}
		if xyPop, ok := populationFrequencies["XY"].(*model.PopulationAlleleFrequencies); ok {
			nIndividuals += xyPop.An
		}
	} else if variant.Chrom == "Y" {
		// nIndividuals = populationFrequencies.XY.an
		if xyPop, ok := populationFrequencies["XY"].(*model.PopulationAlleleFrequencies); ok {
			nIndividuals = xyPop.An
		}
	} else {
		// Autosomal chromosomes: nIndividuals = exomeFreq.an / 2
		nIndividuals = exome.An / 2
	}

	// Calculate counts following TypeScript logic
	nHomAlt := 0
	if exome.HomozygoteCount != nil {
		nHomAlt = *exome.HomozygoteCount
	}

	nHet := exome.Ac - 2*nHomAlt

	// TypeScript: nHomRef: nIndividuals - exomeFreq.ac + exomeFreq.homozygote_count
	nHomRef := nIndividuals - exome.Ac + nHomAlt

	// Function to get number of individuals in a population (matches TypeScript getNumIndividualsInPopulation)
	getNumIndividualsInPopulation := func(popFreq interface{}) int {
		if variant.Chrom == "X" {
			// popFreq.XX.an / 2 + popFreq.XY.an
			if popMap, ok := popFreq.(map[string]*model.PopulationAlleleFrequencies); ok {
				xxAn := 0
				xyAn := 0
				if xxPop, ok := popMap["XX"]; ok {
					xxAn = xxPop.An
				}
				if xyPop, ok := popMap["XY"]; ok {
					xyAn = xyPop.An
				}
				return xxAn/2 + xyAn
			}
		} else if variant.Chrom == "Y" {
			// popFreq.XY.an
			if popMap, ok := popFreq.(map[string]*model.PopulationAlleleFrequencies); ok {
				if xyPop, ok := popMap["XY"]; ok {
					return xyPop.An
				}
			}
		} else {
			// popFreq.an / 2
			if pop, ok := popFreq.(*model.PopulationAlleleFrequencies); ok {
				return pop.An / 2
			}
		}
		return 0
	}

	// Get population IDs filtering like TypeScript: !(popId.includes('_') || popId === 'XX' || popId === 'XY')
	populationIds := make([]string, 0)
	if exome.Populations != nil {
		for _, pop := range exome.Populations {
			if !strings.Contains(pop.ID, "_") && pop.ID != "XX" && pop.ID != "XY" {
				populationIds = append(populationIds, pop.ID)
			}
		}
	}

	// Build population data following TypeScript logic
	populations := make([]PopulationCategoryCounts, 0)
	for _, popID := range populationIds {
		if popFreq, ok := populationFrequencies[popID]; ok {
			popNIndividuals := getNumIndividualsInPopulation(popFreq)
			
			var popNHomAlt, popNHet, popAc int
			if pop, ok := popFreq.(*model.PopulationAlleleFrequencies); ok {
				popNHomAlt = pop.HomozygoteCount
				popAc = pop.Ac
				popNHet = pop.Ac - 2*pop.HomozygoteCount
			}

			// TypeScript: nHomRef: nIndividualsInPop - popFreq.ac + popFreq.homozygote_count
			popNHomRef := popNIndividuals - popAc + popNHomAlt

			populations = append(populations, PopulationCategoryCounts{
				ID:      popID,
				NHomAlt: popNHomAlt,
				NHet:    popNHet,
				NHomRef: popNHomRef,
			})
		}
	}

	return &VariantCategoryCounts{
		NHomAlt:     nHomAlt,
		NHet:        nHet,
		NHomRef:     nHomRef,
		Populations: populations,
	}, nil
}

// estimateHaplotypeCounts estimates haplotype counts from genotype counts
func estimateHaplotypeCounts(genotypeCounts []int) []float64 {
	// If no samples are heterozygous for both variants (genotypeCounts[4] == 0),
	// we can directly calculate haplotype counts
	if genotypeCounts[4] == 0 {
		return []float64{
			float64(2*genotypeCounts[0] + genotypeCounts[1] + genotypeCounts[3]), // AB
			float64(2*genotypeCounts[6] + genotypeCounts[3] + genotypeCounts[7]), // aB
			float64(2*genotypeCounts[2] + genotypeCounts[1] + genotypeCounts[5]), // Ab
			float64(2*genotypeCounts[8] + genotypeCounts[5] + genotypeCounts[7]), // ab
		}
	}

	// Use EM algorithm for haplotype frequency estimation
	return haplotypeFreqEM(genotypeCounts)
}

// haplotypeFreqEM implements the EM algorithm for haplotype frequency estimation
func haplotypeFreqEM(genotypeCounts []int) []float64 {
	if len(genotypeCounts) != 9 {
		return []float64{0, 0, 0, 0}
	}

	nSamples := 0
	for _, count := range genotypeCounts {
		nSamples += count
	}

	// Need some non-ref samples to compute
	if genotypeCounts[0] == nSamples {
		return []float64{0, 0, 0, 0}
	}

	nHaplotypes := float64(nSamples * 2)

	counts := []float64{
		float64(2*genotypeCounts[0] + genotypeCounts[1] + genotypeCounts[3]), // AB
		float64(2*genotypeCounts[6] + genotypeCounts[3] + genotypeCounts[7]), // aB
		float64(2*genotypeCounts[2] + genotypeCounts[1] + genotypeCounts[5]), // Ab
		float64(2*genotypeCounts[8] + genotypeCounts[5] + genotypeCounts[7]), // ab
	}

	// Initial estimate with AaBb contributing equally to each haplotype
	pNext := make([]float64, 4)
	for i := 0; i < 4; i++ {
		pNext[i] = (counts[i] + float64(genotypeCounts[4])/2.0) / nHaplotypes
	}

	pCurrent := make([]float64, 4)
	for i := 0; i < 4; i++ {
		pCurrent[i] = pNext[i] + 1
	}

	// EM iterations
	iterations := 0
	for iterations <= 100 {
		// Check convergence
		maxDiff := 0.0
		for i := 0; i < 4; i++ {
			diff := math.Abs(pNext[i] - pCurrent[i])
			if diff > maxDiff {
				maxDiff = diff
			}
		}
		if maxDiff <= 1e-7 {
			break
		}

		copy(pCurrent, pNext)

		k := pCurrent[0]*pCurrent[3] + pCurrent[1]*pCurrent[2]
		if k == 0 {
			break
		}

		pNext[0] = (pCurrent[0]*pCurrent[3]*float64(genotypeCounts[4])/k + counts[0]) / nHaplotypes
		pNext[1] = (pCurrent[1]*pCurrent[2]*float64(genotypeCounts[4])/k + counts[1]) / nHaplotypes
		pNext[2] = (pCurrent[1]*pCurrent[2]*float64(genotypeCounts[4])/k + counts[2]) / nHaplotypes
		pNext[3] = (pCurrent[0]*pCurrent[3]*float64(genotypeCounts[4])/k + counts[3]) / nHaplotypes

		iterations++
	}

	// Convert back to counts
	haplotypeCounts := make([]float64, 4)
	for i := 0; i < 4; i++ {
		haplotypeCounts[i] = pNext[i] * nHaplotypes
	}

	return haplotypeCounts
}

// getProbabilityCompoundHeterozygous calculates the probability of compound heterozygosity
func getProbabilityCompoundHeterozygous(haplotypeCounts []float64) *float64 {
	if len(haplotypeCounts) != 4 {
		return nil
	}

	// P(compound het) = (n.aB * n.Ab) / (n.AB * n.ab + n.aB * n.Ab)
	numerator := haplotypeCounts[1] * haplotypeCounts[2]             // aB * Ab
	denominator := haplotypeCounts[0]*haplotypeCounts[3] + numerator // AB * ab + aB * Ab

	if denominator == 0 {
		return nil
	}

	pCompoundHet := numerator / denominator
	if math.IsNaN(pCompoundHet) {
		return nil
	}

	return &pCompoundHet
}

// convertToModelVariantCooccurrence converts document to model type
func convertToModelVariantCooccurrence(doc *VariantCooccurrenceDocument) *model.VariantCooccurrence {
	populations := make([]*model.VariantCooccurrenceInPopulation, len(doc.Populations))
	for i, pop := range doc.Populations {
		populations[i] = &model.VariantCooccurrenceInPopulation{
			ID:                    pop.ID,
			GenotypeCounts:        pop.GenotypeCounts,
			HaplotypeCounts:       pop.HaplotypeCounts,
			PCompoundHeterozygous: pop.PCompoundHeterozygous,
		}
	}

	return &model.VariantCooccurrence{
		VariantIds:            doc.VariantIDs,
		GenotypeCounts:        doc.GenotypeCounts,
		HaplotypeCounts:       doc.HaplotypeCounts,
		PCompoundHeterozygous: doc.PCompoundHeterozygous,
		Populations:           populations,
	}
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

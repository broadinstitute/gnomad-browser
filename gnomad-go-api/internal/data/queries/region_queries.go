package queries

import (
	"context"
	"fmt"
	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// Valid chromosomes for region queries
var validChromosomes = map[string]bool{
	"1": true, "2": true, "3": true, "4": true, "5": true, "6": true,
	"7": true, "8": true, "9": true, "10": true, "11": true, "12": true,
	"13": true, "14": true, "15": true, "16": true, "17": true, "18": true,
	"19": true, "20": true, "21": true, "22": true, "X": true, "Y": true, "M": true,
}


// Chromosome numbers for x position calculation
var chromosomeNumbers = map[string]int{
	"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
	"7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12,
	"13": 13, "14": 14, "15": 15, "16": 16, "17": 17, "18": 18,
	"19": 19, "20": 20, "21": 21, "22": 22, "X": 23, "Y": 24, "M": 25,
}

// ValidateRegion validates region parameters
func ValidateRegion(chrom string, start int, stop int) error {
	if !validChromosomes[chrom] {
		return fmt.Errorf("Invalid chromosome: '%s'", chrom)
	}

	if start < 1 {
		return fmt.Errorf("Region start must be greater than 0")
	}

	if start >= 1e9 {
		return fmt.Errorf("Region start must be less than 1,000,000,000")
	}

	if stop < 1 {
		return fmt.Errorf("Region stop must be greater than 0")
	}

	if stop >= 1e9 {
		return fmt.Errorf("Region stop must be less than 1,000,000,000")
	}

	if start > stop {
		return fmt.Errorf("Region stop must be greater than region start")
	}

	return nil
}

// XPosition calculates the x position for a chromosome and position
func XPosition(chrom string, pos int) int64 {
	chromNum, ok := chromosomeNumbers[chrom]
	if !ok {
		return 0
	}
	return int64(chromNum)*1e9 + int64(pos)
}

// FetchRegion fetches a region and returns a Region model
func FetchRegion(ctx context.Context, esClient *elastic.Client, chrom string, start int, stop int, referenceGenome string) (*model.Region, error) {
	// Validate region parameters
	if err := ValidateRegion(chrom, start, stop); err != nil {
		return nil, err
	}

	// Convert reference genome to enum
	refGenome := model.ReferenceGenomeID(referenceGenome)

	// Create the region object
	region := &model.Region{
		ReferenceGenome: refGenome,
		Chrom:           chrom,
		Start:           start,
		Stop:            stop,
	}

	return region, nil
}

// FetchGenesInRegion fetches genes that overlap with the specified region
func FetchGenesInRegion(ctx context.Context, esClient *elastic.Client, chrom string, start int, stop int, referenceGenome string) ([]*model.RegionGene, error) {
	index, ok := geneIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unknown reference genome: %s", referenceGenome)
	}

	// Build the query to find genes overlapping with the region
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"must": []interface{}{
					map[string]interface{}{
						"term": map[string]interface{}{
							"chrom": chrom,
						},
					},
					map[string]interface{}{
						"range": map[string]interface{}{
							"start": map[string]interface{}{
								"lte": stop,
							},
						},
					},
					map[string]interface{}{
						"range": map[string]interface{}{
							"stop": map[string]interface{}{
								"gte": start,
							},
						},
					},
				},
			},
		},
		"size": 1000, // Limit results to avoid too many genes
	}

	// Execute the search
	response, err := esClient.Search(ctx, index, query)
	if err != nil {
		return nil, fmt.Errorf("error searching for genes in region: %w", err)
	}

	// Convert results to RegionGene models
	regionGenes := make([]*model.RegionGene, 0)
	for _, hit := range response.Hits.Hits {
		source := hit.Source
		// Gene documents have data at root level or under "value" depending on index structure
		var dataSource map[string]interface{}
		if value, ok := source["value"].(map[string]interface{}); ok {
			dataSource = value
		} else {
			dataSource = source
		}

		// Extract basic gene information
		geneID, _ := dataSource["gene_id"].(string)
		symbol, _ := dataSource["symbol"].(string)
		geneStart, _ := dataSource["start"].(float64)
		geneStop, _ := dataSource["stop"].(float64)

		// Convert exons
		exons := make([]*model.Exon, 0)
		if exonsData, ok := dataSource["exons"].([]interface{}); ok {
			for _, exonData := range exonsData {
				if exonMap, ok := exonData.(map[string]interface{}); ok {
					featureType, _ := exonMap["feature_type"].(string)
					exonStart, _ := exonMap["start"].(float64)
					exonStop, _ := exonMap["stop"].(float64)

					exons = append(exons, &model.Exon{
						FeatureType: featureType,
						Start:       int(exonStart),
						Stop:        int(exonStop),
					})
				}
			}
		}

		// Convert transcripts
		transcripts := make([]*model.RegionGeneTranscript, 0)
		if transcriptsData, ok := dataSource["transcripts"].([]interface{}); ok {
			for _, transcriptData := range transcriptsData {
				if transcriptMap, ok := transcriptData.(map[string]interface{}); ok {
					transcriptID, _ := transcriptMap["transcript_id"].(string)
					transcriptStart, _ := transcriptMap["start"].(float64)
					transcriptStop, _ := transcriptMap["stop"].(float64)

					// Convert transcript exons
					transcriptExons := make([]*model.Exon, 0)
					if transcriptExonsData, ok := transcriptMap["exons"].([]interface{}); ok {
						for _, exonData := range transcriptExonsData {
							if exonMap, ok := exonData.(map[string]interface{}); ok {
								featureType, _ := exonMap["feature_type"].(string)
								exonStart, _ := exonMap["start"].(float64)
								exonStop, _ := exonMap["stop"].(float64)

								transcriptExons = append(transcriptExons, &model.Exon{
									FeatureType: featureType,
									Start:       int(exonStart),
									Stop:        int(exonStop),
								})
							}
						}
					}

					transcripts = append(transcripts, &model.RegionGeneTranscript{
						TranscriptID: transcriptID,
						Start:        int(transcriptStart),
						Stop:         int(transcriptStop),
						Exons:        transcriptExons,
					})
				}
			}
		}

		regionGenes = append(regionGenes, &model.RegionGene{
			GeneID:      geneID,
			Symbol:      symbol,
			Start:       int(geneStart),
			Stop:        int(geneStop),
			Exons:       exons,
			Transcripts: transcripts,
		})
	}

	return regionGenes, nil
}

// FetchVariantsInRegion fetches variants within the specified region
func FetchVariantsInRegion(ctx context.Context, esClient *elastic.Client, chrom string, start int, stop int, dataset string) ([]*model.Variant, error) {
	// Calculate x positions for range query
	xStart := XPosition(chrom, start)
	xStop := XPosition(chrom, stop)

	// Get the appropriate index for this dataset
	index, err := getVariantIndexForDataset(dataset)
	if err != nil {
		return nil, fmt.Errorf("error getting index for dataset %s: %w", dataset, err)
	}

	// Build the query to find variants in the region
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"must": []interface{}{
					map[string]interface{}{
						"range": map[string]interface{}{
							"xpos": map[string]interface{}{
								"gte": xStart,
								"lte": xStop,
							},
						},
					},
				},
			},
		},
		"_source": map[string]interface{}{
			"includes": []string{"value"},
		},
		"size": 10000, // Limit results
		"sort": []interface{}{
			map[string]interface{}{
				"xpos": map[string]interface{}{
					"order": "asc",
				},
			},
		},
	}

	// Execute the search
	response, err := esClient.Search(ctx, index, query)
	if err != nil {
		return nil, fmt.Errorf("error searching for variants in region: %w", err)
	}

	// Convert results to Variant models with full data
	variants := make([]*model.Variant, 0)
	for _, hit := range response.Hits.Hits {
		source := hit.Source
		// Variant documents have data under "value" field
		var dataSource map[string]interface{}
		if value, ok := source["value"].(map[string]interface{}); ok {
			dataSource = value
		} else {
			dataSource = source
		}

		variant, err := convertDocumentToVariant(dataSource, dataset)
		if err != nil {
			// Skip variants that fail to convert
			continue
		}

		variants = append(variants, variant)
	}

	return variants, nil
}

// convertDocumentToVariant converts an Elasticsearch document to a Variant model
func convertDocumentToVariant(doc map[string]interface{}, dataset string) (*model.Variant, error) {
	variantID, _ := doc["variant_id"].(string)
	if variantID == "" {
		return nil, fmt.Errorf("variant_id not found in document")
	}

	// Determine reference genome based on dataset
	var refGenome model.ReferenceGenomeID
	switch dataset {
	case "exac", "gnomad_r2_1", "gnomad_r2_1_controls", "gnomad_r2_1_non_cancer", "gnomad_r2_1_non_neuro", "gnomad_r2_1_non_topmed":
		refGenome = model.ReferenceGenomeIDGRCh37
	case "gnomad_r3", "gnomad_r3_controls_and_biobanks", "gnomad_r3_non_cancer", "gnomad_r3_non_neuro", "gnomad_r3_non_topmed", "gnomad_r3_non_v2", "gnomad_r3_genomes":
		refGenome = model.ReferenceGenomeIDGRCh38
	case "gnomad_r4", "gnomad_r4_non_ukb":
		refGenome = model.ReferenceGenomeIDGRCh38
	default:
		refGenome = model.ReferenceGenomeIDGRCh37
	}

	// Extract basic fields
	chrom, _ := doc["chrom"].(string)
	pos, _ := doc["pos"].(float64)
	ref, _ := doc["ref"].(string)
	alt, _ := doc["alt"].(string)

	// If basic fields are missing, try to extract from locus and alleles (v3/v4 format)
	if chrom == "" {
		if locus, ok := doc["locus"].(map[string]interface{}); ok {
			chrom, _ = locus["contig"].(string)
			pos, _ = locus["position"].(float64)
		}
	}
	if ref == "" || alt == "" {
		if alleles, ok := doc["alleles"].([]interface{}); ok && len(alleles) >= 2 {
			ref, _ = alleles[0].(string)
			alt, _ = alleles[1].(string)
		}
	}

	// Create the variant
	variant := &model.Variant{
		VariantID:       variantID,
		ReferenceGenome: refGenome,
		Chrom:           chrom,
		Pos:             int(pos),
		Ref:             ref,
		Alt:             alt,
		Coverage: &model.VariantCoverageDetails{
			Exome:  &model.VariantCoverage{},
			Genome: &model.VariantCoverage{},
		},
	}

	// Extract rsids
	if rsids, ok := doc["rsids"].([]interface{}); ok && len(rsids) > 0 {
		rsidStrings := make([]string, 0, len(rsids))
		for _, rsid := range rsids {
			if rsidStr, ok := rsid.(string); ok {
				rsidStrings = append(rsidStrings, rsidStr)
			}
		}
		variant.Rsids = rsidStrings
		// Set deprecated rsid field to first rsid
		if len(rsidStrings) > 0 {
			variant.Rsid = &rsidStrings[0]
		}
	} else if rsid, ok := doc["rsid"].(string); ok && rsid != "" {
		variant.Rsid = &rsid
		variant.Rsids = []string{rsid}
	}

	// Extract caid
	if caid, ok := doc["caid"].(string); ok {
		variant.Caid = &caid
	}

	// Extract flags
	if flags, ok := doc["flags"].([]interface{}); ok {
		flagStrings := make([]string, 0, len(flags))
		for _, flag := range flags {
			if flagStr, ok := flag.(string); ok {
				flagStrings = append(flagStrings, flagStr)
			}
		}
		variant.Flags = flagStrings
	}

	// Extract exome data
	if exomeData, ok := doc["exome"].(map[string]interface{}); ok {
		variant.Exome = extractExomeData(exomeData, dataset)
	}

	// Extract genome data
	if genomeData, ok := doc["genome"].(map[string]interface{}); ok {
		variant.Genome = extractGenomeData(genomeData, dataset)
	}

	// Extract joint data (v4 only)
	if jointData, ok := doc["joint"].(map[string]interface{}); ok {
		variant.Joint = extractJointData(jointData, dataset)
	}

	// Extract transcript consequences - take the first one for flattened fields
	if transcriptConsequences, ok := doc["transcript_consequences"].([]interface{}); ok && len(transcriptConsequences) > 0 {
		if firstConsequence, ok := transcriptConsequences[0].(map[string]interface{}); ok {
			// Set flattened fields from first transcript consequence
			if consequence, ok := firstConsequence["major_consequence"].(string); ok {
				variant.Consequence = &consequence
			}
			if geneID, ok := firstConsequence["gene_id"].(string); ok {
				variant.GeneID = &geneID
			}
			if geneSymbol, ok := firstConsequence["gene_symbol"].(string); ok {
				variant.GeneSymbol = &geneSymbol
			}
			if hgvs, ok := firstConsequence["hgvs"].(string); ok {
				variant.Hgvs = &hgvs
			}
			if hgvsc, ok := firstConsequence["hgvsc"].(string); ok {
				variant.Hgvsc = &hgvsc
			}
			if hgvsp, ok := firstConsequence["hgvsp"].(string); ok {
				variant.Hgvsp = &hgvsp
			}
			if lof, ok := firstConsequence["lof"].(string); ok {
				variant.Lof = &lof
			}
			if lofFilter, ok := firstConsequence["lof_filter"].(string); ok {
				variant.LofFilter = &lofFilter
			}
			if lofFlags, ok := firstConsequence["lof_flags"].(string); ok {
				variant.LofFlags = &lofFlags
			}
			if transcriptID, ok := firstConsequence["transcript_id"].(string); ok {
				variant.TranscriptID = &transcriptID
			}
			if transcriptVersion, ok := firstConsequence["transcript_version"].(string); ok {
				variant.TranscriptVersion = &transcriptVersion
			}
		}
	}

	// TODO: Extract other fields as needed (transcript_consequences, in_silico_predictors, etc.)

	return variant, nil
}

// extractExomeData extracts exome data from document
func extractExomeData(exomeData map[string]interface{}, dataset string) *model.VariantDetailsExomeData {
	// Determine which subset to use based on dataset
	subset := getSubsetForDataset(dataset)

	// Try to get frequency data for the subset
	var freqData map[string]interface{}
	if freq, ok := exomeData["freq"].(map[string]interface{}); ok {
		if subsetData, ok := freq[subset].(map[string]interface{}); ok {
			freqData = subsetData
		} else if subset != "all" {
			// Fallback to "all" if specific subset not found
			if allData, ok := freq["all"].(map[string]interface{}); ok {
				freqData = allData
			}
		}
	}

	if freqData == nil {
		return nil
	}

	ac, _ := freqData["ac"].(float64)
	an, _ := freqData["an"].(float64)
	acHemi, _ := freqData["hemizygote_count"].(float64)
	acHom, _ := freqData["homozygote_count"].(float64)

	// Extract filters
	var filters []string
	if filterList, ok := freqData["filters"].([]interface{}); ok {
		for _, f := range filterList {
			if filterStr, ok := f.(string); ok {
				filters = append(filters, filterStr)
			}
		}
	}

	return &model.VariantDetailsExomeData{
		Ac:      int(ac),
		An:      int(an),
		AcHemi:  int(acHemi),
		AcHom:   int(acHom),
		Filters: filters,
	}
}

// extractGenomeData extracts genome data from document
func extractGenomeData(genomeData map[string]interface{}, dataset string) *model.VariantDetailsGenomeData {
	// Genome data usually uses "all" subset
	var freqData map[string]interface{}
	if freq, ok := genomeData["freq"].(map[string]interface{}); ok {
		if allData, ok := freq["all"].(map[string]interface{}); ok {
			freqData = allData
		}
	}

	if freqData == nil {
		return nil
	}

	ac, _ := freqData["ac"].(float64)
	an, _ := freqData["an"].(float64)
	acHemi, _ := freqData["hemizygote_count"].(float64)
	acHom, _ := freqData["homozygote_count"].(float64)

	// Extract filters
	var filters []string
	if filterList, ok := freqData["filters"].([]interface{}); ok {
		for _, f := range filterList {
			if filterStr, ok := f.(string); ok {
				filters = append(filters, filterStr)
			}
		}
	}

	return &model.VariantDetailsGenomeData{
		Ac:      int(ac),
		An:      int(an),
		AcHemi:  int(acHemi),
		AcHom:   int(acHom),
		Filters: filters,
	}
}

// extractJointData extracts joint data from document (v4 only)
func extractJointData(jointData map[string]interface{}, dataset string) *model.VariantDetailsJointData {
	subset := getSubsetForDataset(dataset)

	var freqData map[string]interface{}
	if freq, ok := jointData["freq"].(map[string]interface{}); ok {
		if subsetData, ok := freq[subset].(map[string]interface{}); ok {
			freqData = subsetData
		}
	}

	if freqData == nil {
		return nil
	}

	ac, _ := freqData["ac"].(float64)
	an, _ := freqData["an"].(float64)
	hemiCount, _ := freqData["hemizygote_count"].(float64)
	homCount, _ := freqData["homozygote_count"].(float64)

	// Extract filters
	var filters []string
	if filterList, ok := freqData["filters"].([]interface{}); ok {
		for _, f := range filterList {
			if filterStr, ok := f.(string); ok {
				filters = append(filters, filterStr)
			}
		}
	}

	return &model.VariantDetailsJointData{
		Ac:              int(ac),
		An:              int(an),
		HemizygoteCount: toIntPtr(int(hemiCount)),
		HomozygoteCount: toIntPtr(int(homCount)),
		Filters:         filters,
	}
}

// getSubsetForDataset returns the appropriate subset name for a dataset
func getSubsetForDataset(dataset string) string {
	switch dataset {
	case "gnomad_r2_1_controls":
		return "controls"
	case "gnomad_r2_1_non_cancer":
		return "non_cancer"
	case "gnomad_r2_1_non_neuro":
		return "non_neuro"
	case "gnomad_r2_1_non_topmed":
		return "non_topmed"
	case "gnomad_r3_controls_and_biobanks":
		return "controls_and_biobanks"
	case "gnomad_r3_non_cancer":
		return "non_cancer"
	case "gnomad_r3_non_neuro":
		return "non_neuro"
	case "gnomad_r3_non_topmed":
		return "non_topmed"
	case "gnomad_r3_non_v2":
		return "non_v2"
	case "gnomad_r4_non_ukb":
		return "non_ukb"
	default:
		return "all"
	}
}


// getVariantIndexForDataset returns the Elasticsearch index for a given dataset
func getVariantIndexForDataset(dataset string) (string, error) {
	// Map dataset to appropriate index
	switch dataset {
	case "exac":
		return "exac_variants", nil
	case "gnomad_r2_1", "gnomad_r2_1_controls", "gnomad_r2_1_non_cancer", "gnomad_r2_1_non_neuro", "gnomad_r2_1_non_topmed":
		return "gnomad_v2_variants", nil
	case "gnomad_r3", "gnomad_r3_controls_and_biobanks", "gnomad_r3_non_cancer", "gnomad_r3_non_neuro", "gnomad_r3_non_topmed", "gnomad_r3_non_v2", "gnomad_r3_genomes":
		return "gnomad_v3_variants", nil
	case "gnomad_r4", "gnomad_r4_non_ukb":
		return "gnomad_v4_variants", nil
	default:
		return "", fmt.Errorf("unknown dataset: %s", dataset)
	}
}

// FetchVariantsByGene fetches variants for a specific gene using efficient gene_id filtering
func FetchVariantsByGene(ctx context.Context, esClient *elastic.Client, geneID string, chrom string, exons []*model.Exon, dataset string) ([]*model.Variant, error) {
	// Get the appropriate index for the dataset
	index, err := getVariantIndexForDataset(dataset)
	if err != nil {
		return nil, err
	}

	// Filter exons to only include CDS regions and merge overlapping regions
	filteredExons := make([]*model.Exon, 0)
	for _, exon := range exons {
		if exon.FeatureType == "CDS" {
			filteredExons = append(filteredExons, exon)
		}
	}

	// If no CDS exons, use all exons
	if len(filteredExons) == 0 {
		filteredExons = exons
	}

	// Add padding to exon regions (75bp as in TypeScript)
	const padding = 75
	paddedExons := make([]*model.Exon, 0, len(filteredExons))
	for _, exon := range filteredExons {
		paddedExons = append(paddedExons, &model.Exon{
			Start: exon.Start - padding,
			Stop:  exon.Stop + padding,
		})
	}

	// Create range queries for each exon region
	rangeQueries := make([]map[string]interface{}, 0, len(paddedExons))
	for _, exon := range paddedExons {
		rangeQueries = append(rangeQueries, map[string]interface{}{
			"range": map[string]interface{}{
				"locus.position": map[string]interface{}{
					"gte": exon.Start,
					"lte": exon.Stop,
				},
			},
		})
	}

	// Build the query with gene_id filter and exon ranges
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": []map[string]interface{}{
					{
						"term": map[string]interface{}{
							"gene_id": geneID,
						},
					},
					{
						"term": map[string]interface{}{
							"locus.contig": chrom,
						},
					},
					{
						"bool": map[string]interface{}{
							"should": rangeQueries,
						},
					},
				},
			},
		},
		"sort": []map[string]interface{}{
			{
				"locus.position": map[string]interface{}{
					"order": "asc",
				},
			},
		},
		"size": 10000, // Adjust based on gene size
	}

	// Execute the search
	response, err := esClient.Search(ctx, index, query)
	if err != nil {
		return nil, fmt.Errorf("error searching for variants by gene: %w", err)
	}

	// Convert results to variant models
	variants := make([]*model.Variant, 0, len(response.Hits.Hits))
	for _, hit := range response.Hits.Hits {
		source := hit.Source
		// Variant documents have data under "value" field
		var dataSource map[string]interface{}
		if value, ok := source["value"].(map[string]interface{}); ok {
			dataSource = value
		} else {
			dataSource = source
		}

		variant, err := convertDocumentToVariant(dataSource, dataset)
		if err != nil {
			// Log error but continue processing other variants
			continue
		}
		variants = append(variants, variant)
	}

	return variants, nil
}


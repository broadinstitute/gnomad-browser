package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

const (
	gnomadSTRV3Index = "gnomad_v3_short_tandem_repeats-2025-03-17--19-04"
)

// STRDatasetConfig holds configuration for STR datasets
type STRDatasetConfig struct {
	Index string
}

// strDatasetConfigs maps dataset IDs to their configuration
var strDatasetConfigs = map[string]STRDatasetConfig{
	"gnomad_r3": {
		Index: gnomadSTRV3Index,
	},
	"gnomad_r4": {
		Index: gnomadSTRV3Index,
	},
}

// STRElasticsearchDoc represents the Elasticsearch document structure for STR data
type STRElasticsearchDoc struct {
	ID    string      `json:"id"`
	Value STRValueDoc `json:"value"`
}

// STRValueDoc represents the value field in STR Elasticsearch documents
type STRValueDoc struct {
	ID                    string                               `json:"id"`
	Gene                  STRGeneDoc                           `json:"gene"`
	AssociatedDiseases    []STRAssociatedDiseaseDoc            `json:"associated_diseases"`
	StripyID              *string                              `json:"stripy_id"`
	StrchiveID            *string                              `json:"strchive_id"`
	MainReferenceRegion   STRReferenceRegionDoc                `json:"main_reference_region"`
	ReferenceRegions      []STRReferenceRegionDoc              `json:"reference_regions"`
	ReferenceRepeatUnit   string                               `json:"reference_repeat_unit"`
	RepeatUnits           []STRRepeatUnitDoc                   `json:"repeat_units"`
	AlleleSizeDistribution []STRAlleleSizeDistributionCohortDoc `json:"allele_size_distribution"`
	GenotypeDistribution  []STRGenotypeDistributionCohortDoc   `json:"genotype_distribution"`
	AgeDistribution       []STRAgeDistributionBinDoc           `json:"age_distribution"`
	AdjacentRepeats       []STRAdjacentRepeatDoc               `json:"adjacent_repeats"`
}

// STRGeneDoc represents gene information for STR
type STRGeneDoc struct {
	EnsemblID string `json:"ensembl_id"`
	Symbol    string `json:"symbol"`
	Region    string `json:"region"`
}

// STRAssociatedDiseaseDoc represents disease association data
type STRAssociatedDiseaseDoc struct {
	Name                      string                                     `json:"name"`
	Symbol                    string                                     `json:"symbol"`
	OmimID                    *string                                    `json:"omim_id"`
	InheritanceMode           string                                     `json:"inheritance_mode"`
	RepeatSizeClassifications []STRRepeatSizeClassificationDoc          `json:"repeat_size_classifications"`
	Notes                     *string                                    `json:"notes"`
}

// STRRepeatSizeClassificationDoc represents repeat size classification
type STRRepeatSizeClassificationDoc struct {
	Classification string `json:"classification"`
	Min            *int   `json:"min"`
	Max            *int   `json:"max"`
}

// STRReferenceRegionDoc represents genomic region information
type STRReferenceRegionDoc struct {
	ReferenceGenome string `json:"reference_genome"`
	Chrom           string `json:"chrom"`
	Start           int    `json:"start"`
	Stop            int    `json:"stop"`
}

// STRRepeatUnitDoc represents repeat unit information
type STRRepeatUnitDoc struct {
	RepeatUnit     string `json:"repeat_unit"`
	Classification string `json:"classification"`
}

// STRAgeDistributionBinDoc represents age distribution data
type STRAgeDistributionBinDoc struct {
	AgeRange     []*int  `json:"age_range"`
	Distribution [][]int `json:"distribution"`
}

// STRAlleleSizeDistributionCohortDoc represents allele size distribution data
type STRAlleleSizeDistributionCohortDoc struct {
	AncestryGroup      string                   `json:"ancestry_group"`
	Sex                string                   `json:"sex"`
	Repunit            string                   `json:"repunit"`
	QualityDescription string                   `json:"quality_description"`
	QScore             float64                  `json:"q_score"`
	Distribution       []STRAlleleSizeItemDoc   `json:"distribution"`
}

// STRAlleleSizeItemDoc represents individual allele size item
type STRAlleleSizeItemDoc struct {
	RepunitCount int `json:"repunit_count"`
	Frequency    int `json:"frequency"`
}

// STRGenotypeDistributionCohortDoc represents genotype distribution data
type STRGenotypeDistributionCohortDoc struct {
	AncestryGroup      string                 `json:"ancestry_group"`
	Sex                string                 `json:"sex"`
	ShortAlleleRepunit string                 `json:"short_allele_repunit"`
	LongAlleleRepunit  string                 `json:"long_allele_repunit"`
	QualityDescription string                 `json:"quality_description"`
	QScore             float64                `json:"q_score"`
	Distribution       []STRGenotypeItemDoc   `json:"distribution"`
}

// STRGenotypeItemDoc represents individual genotype item
type STRGenotypeItemDoc struct {
	ShortAlleleRepunitCount int `json:"short_allele_repunit_count"`
	LongAlleleRepunitCount  int `json:"long_allele_repunit_count"`
	Frequency               int `json:"frequency"`
}

// STRAdjacentRepeatDoc represents adjacent repeat information
type STRAdjacentRepeatDoc struct {
	ID                     string                               `json:"id"`
	ReferenceRegion        STRReferenceRegionDoc                `json:"reference_region"`
	ReferenceRepeatUnit    string                               `json:"reference_repeat_unit"`
	RepeatUnits            []string                             `json:"repeat_units"`
	AlleleSizeDistribution []STRAlleleSizeDistributionCohortDoc `json:"allele_size_distribution"`
	GenotypeDistribution   []STRGenotypeDistributionCohortDoc   `json:"genotype_distribution"`
	AgeDistribution        []STRAgeDistributionBinDoc           `json:"age_distribution"`
}

// FetchShortTandemRepeat fetches a specific STR by ID
func FetchShortTandemRepeat(ctx context.Context, esClient *elastic.Client, id string, datasetID string) (*model.ShortTandemRepeatDetails, error) {
	config, exists := strDatasetConfigs[datasetID]
	if !exists {
		return nil, fmt.Errorf("STR data is not available for dataset %s", datasetID)
	}

	// Search for the document by ID
	hit, err := esClient.SearchByID(ctx, config.Index, "id", id)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch STR %s: %w", id, err)
	}

	if hit == nil {
		return nil, nil // STR not found
	}

	// Extract the 'value' field from _source
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("invalid STR document structure")
	}

	// Parse into struct
	var doc STRValueDoc
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal STR value: %w", err)
	}
	if err := json.Unmarshal(jsonBytes, &doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal STR document: %w", err)
	}

	return convertSTRDocToDetails(&doc), nil
}

// FetchShortTandemRepeats fetches all STRs for a dataset
func FetchShortTandemRepeats(ctx context.Context, esClient *elastic.Client, datasetID string) ([]*model.ShortTandemRepeat, error) {
	config, exists := strDatasetConfigs[datasetID]
	if !exists {
		return nil, fmt.Errorf("STR data is not available for dataset %s", datasetID)
	}

	// Summary fields for STR list queries
	sourceFields := []string{
		"id",
		"value.id",
		"value.gene",
		"value.associated_diseases",
		"value.stripy_id",
		"value.strchive_id",
		"value.main_reference_region",
		"value.reference_regions",
		"value.reference_repeat_unit",
	}

	query := map[string]any{
		"query": map[string]any{
			"match_all": map[string]any{},
		},
		"sort": []map[string]any{
			{"id": map[string]any{"order": "asc"}},
		},
		"_source": sourceFields,
		"size":    10000, // Get all STRs
	}

	searchResponse, err := esClient.Search(ctx, config.Index, query)
	if err != nil {
		return nil, fmt.Errorf("failed to search STRs: %w", err)
	}

	strs := make([]*model.ShortTandemRepeat, 0, len(searchResponse.Hits.Hits))
	for _, hit := range searchResponse.Hits.Hits {
		// Extract the 'value' field from _source
		value, ok := hit.Source["value"].(map[string]any)
		if !ok {
			log.Printf("Warning: invalid STR document structure for document %s", hit.ID)
			continue
		}

		// Parse into struct
		var doc STRValueDoc
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			log.Printf("Warning: failed to marshal STR value for document %s: %v", hit.ID, err)
			continue
		}
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			log.Printf("Warning: failed to unmarshal STR document %s: %v", hit.ID, err)
			continue
		}
		
		strs = append(strs, convertSTRDocToSummary(&doc))
	}

	return strs, nil
}

// FetchShortTandemRepeatsByGene fetches STRs associated with a gene
func FetchShortTandemRepeatsByGene(ctx context.Context, esClient *elastic.Client, ensemblGeneID string, datasetID string) ([]*model.ShortTandemRepeat, error) {
	config, exists := strDatasetConfigs[datasetID]
	if !exists {
		return nil, fmt.Errorf("STR data is not available for dataset %s", datasetID)
	}

	// Summary fields for STR list queries
	sourceFields := []string{
		"id",
		"value.id",
		"value.gene",
		"value.associated_diseases",
		"value.stripy_id",
		"value.strchive_id",
		"value.main_reference_region",
		"value.reference_regions",
		"value.reference_repeat_unit",
	}

	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": map[string]any{
					"term": map[string]any{
						"ensembl_id": ensemblGeneID,
					},
				},
			},
		},
		"sort": []map[string]any{
			{"id": map[string]any{"order": "asc"}},
		},
		"_source": sourceFields,
		"size":    100,
	}

	searchResponse, err := esClient.Search(ctx, config.Index, query)
	if err != nil {
		return nil, fmt.Errorf("failed to search STRs by gene: %w", err)
	}

	strs := make([]*model.ShortTandemRepeat, 0, len(searchResponse.Hits.Hits))
	for _, hit := range searchResponse.Hits.Hits {
		// Extract the 'value' field from _source
		value, ok := hit.Source["value"].(map[string]any)
		if !ok {
			log.Printf("Warning: invalid STR document structure for document %s", hit.ID)
			continue
		}

		// Parse into struct
		var doc STRValueDoc
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			log.Printf("Warning: failed to marshal STR value for document %s: %v", hit.ID, err)
			continue
		}
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			log.Printf("Warning: failed to unmarshal STR document %s: %v", hit.ID, err)
			continue
		}
		
		strs = append(strs, convertSTRDocToSummary(&doc))
	}

	return strs, nil
}

// FetchShortTandemRepeatsByRegion fetches STRs within a genomic region
func FetchShortTandemRepeatsByRegion(ctx context.Context, esClient *elastic.Client, chrom string, start int, stop int, datasetID string) ([]*model.ShortTandemRepeat, error) {
	config, exists := strDatasetConfigs[datasetID]
	if !exists {
		return nil, fmt.Errorf("STR data is not available for dataset %s", datasetID)
	}

	// Summary fields for STR list queries
	sourceFields := []string{
		"id",
		"value.id",
		"value.gene",
		"value.associated_diseases",
		"value.stripy_id",
		"value.strchive_id",
		"value.main_reference_region",
		"value.reference_regions",
		"value.reference_repeat_unit",
	}

	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": []map[string]any{
					{
						"term": map[string]any{
							"value.main_reference_region.chrom": chrom,
						},
					},
					{
						"range": map[string]any{
							"value.main_reference_region.start": map[string]any{
								"lte": stop,
							},
						},
					},
					{
						"range": map[string]any{
							"value.main_reference_region.stop": map[string]any{
								"gte": start,
							},
						},
					},
				},
			},
		},
		"sort": []map[string]any{
			{"id": map[string]any{"order": "asc"}},
		},
		"_source": sourceFields,
		"size":    100,
	}

	searchResponse, err := esClient.Search(ctx, config.Index, query)
	if err != nil {
		return nil, fmt.Errorf("failed to search STRs by region: %w", err)
	}
	
	// Debug: log the query and response
	// log.Printf("Region query for %s:%d-%d returned %d hits", chrom, start, stop, len(searchResponse.Hits.Hits))

	strs := make([]*model.ShortTandemRepeat, 0, len(searchResponse.Hits.Hits))
	for _, hit := range searchResponse.Hits.Hits {
		// Extract the 'value' field from _source
		value, ok := hit.Source["value"].(map[string]any)
		if !ok {
			log.Printf("Warning: invalid STR document structure for document %s", hit.ID)
			continue
		}

		// Parse into struct
		var doc STRValueDoc
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			log.Printf("Warning: failed to marshal STR value for document %s: %v", hit.ID, err)
			continue
		}
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			log.Printf("Warning: failed to unmarshal STR document %s: %v", hit.ID, err)
			continue
		}
		
		strs = append(strs, convertSTRDocToSummary(&doc))
	}

	return strs, nil
}

// convertSTRDocToDetails converts STR ES document to GraphQL ShortTandemRepeatDetails model
func convertSTRDocToDetails(doc *STRValueDoc) *model.ShortTandemRepeatDetails {
	// Convert gene
	gene := &model.ShortTandemRepeatGene{
		EnsemblID: doc.Gene.EnsemblID,
		Symbol:    doc.Gene.Symbol,
		Region:    doc.Gene.Region,
	}

	// Convert associated diseases
	diseases := make([]*model.ShortTandemRepeatAssociatedDisease, len(doc.AssociatedDiseases))
	for i, diseaseDoc := range doc.AssociatedDiseases {
		classifications := make([]*model.ShortTandemRepeatAssociatedDiseaseRepeatSizeClassification, len(diseaseDoc.RepeatSizeClassifications))
		for j, classDoc := range diseaseDoc.RepeatSizeClassifications {
			classifications[j] = &model.ShortTandemRepeatAssociatedDiseaseRepeatSizeClassification{
				Classification: classDoc.Classification,
				Min:            classDoc.Min,
				Max:            classDoc.Max,
			}
		}

		diseases[i] = &model.ShortTandemRepeatAssociatedDisease{
			Name:                      diseaseDoc.Name,
			Symbol:                    diseaseDoc.Symbol,
			OmimID:                    diseaseDoc.OmimID,
			InheritanceMode:           diseaseDoc.InheritanceMode,
			RepeatSizeClassifications: classifications,
			Notes:                     diseaseDoc.Notes,
		}
	}

	// Convert main reference region
	mainRefRegion := convertReferenceRegion(&doc.MainReferenceRegion)

	// Convert reference regions
	refRegions := make([]*model.ShortTandemRepeatReferenceRegion, len(doc.ReferenceRegions))
	for i, regionDoc := range doc.ReferenceRegions {
		refRegions[i] = convertReferenceRegion(&regionDoc)
	}

	// Convert repeat units
	repeatUnits := make([]*model.ShortTandemRepeatRepeatUnit, len(doc.RepeatUnits))
	for i, unitDoc := range doc.RepeatUnits {
		repeatUnits[i] = &model.ShortTandemRepeatRepeatUnit{
			RepeatUnit:     unitDoc.RepeatUnit,
			Classification: unitDoc.Classification,
		}
	}

	// Convert allele size distribution
	alleleSizeDist := make([]*model.ShortTandemRepeatAlleleSizeDistributionCohort, len(doc.AlleleSizeDistribution))
	for i, cohortDoc := range doc.AlleleSizeDistribution {
		distribution := make([]*model.ShortTandemRepeatAlleleSizeItem, len(cohortDoc.Distribution))
		for j, itemDoc := range cohortDoc.Distribution {
			distribution[j] = &model.ShortTandemRepeatAlleleSizeItem{
				RepunitCount: itemDoc.RepunitCount,
				Frequency:    itemDoc.Frequency,
			}
		}

		alleleSizeDist[i] = &model.ShortTandemRepeatAlleleSizeDistributionCohort{
			AncestryGroup:      cohortDoc.AncestryGroup,
			Sex:                cohortDoc.Sex,
			Repunit:            cohortDoc.Repunit,
			QualityDescription: cohortDoc.QualityDescription,
			QScore:             cohortDoc.QScore,
			Distribution:       distribution,
		}
	}

	// Convert genotype distribution
	genotypeDist := make([]*model.ShortTandemRepeatGenotypeDistributionCohort, len(doc.GenotypeDistribution))
	for i, cohortDoc := range doc.GenotypeDistribution {
		distribution := make([]*model.ShortTandemRepeatGenotypeItem, len(cohortDoc.Distribution))
		for j, itemDoc := range cohortDoc.Distribution {
			distribution[j] = &model.ShortTandemRepeatGenotypeItem{
				ShortAlleleRepunitCount: itemDoc.ShortAlleleRepunitCount,
				LongAlleleRepunitCount:  itemDoc.LongAlleleRepunitCount,
				Frequency:               itemDoc.Frequency,
			}
		}

		genotypeDist[i] = &model.ShortTandemRepeatGenotypeDistributionCohort{
			AncestryGroup:      cohortDoc.AncestryGroup,
			Sex:                cohortDoc.Sex,
			ShortAlleleRepunit: cohortDoc.ShortAlleleRepunit,
			LongAlleleRepunit:  cohortDoc.LongAlleleRepunit,
			QualityDescription: cohortDoc.QualityDescription,
			QScore:             cohortDoc.QScore,
			Distribution:       distribution,
		}
	}

	// Convert age distribution
	ageDist := make([]*model.ShortTandemRepeatAgeDistributionBin, len(doc.AgeDistribution))
	for i, ageDoc := range doc.AgeDistribution {
		ageDist[i] = &model.ShortTandemRepeatAgeDistributionBin{
			AgeRange:     ageDoc.AgeRange,
			Distribution: ageDoc.Distribution,
		}
	}

	// Convert adjacent repeats
	adjacentRepeats := make([]*model.ShortTandemRepeatAdjacentRepeat, len(doc.AdjacentRepeats))
	for i, adjDoc := range doc.AdjacentRepeats {
		adjAlleleSizeDist := make([]*model.ShortTandemRepeatAlleleSizeDistributionCohort, len(adjDoc.AlleleSizeDistribution))
		for j, cohortDoc := range adjDoc.AlleleSizeDistribution {
			distribution := make([]*model.ShortTandemRepeatAlleleSizeItem, len(cohortDoc.Distribution))
			for k, itemDoc := range cohortDoc.Distribution {
				distribution[k] = &model.ShortTandemRepeatAlleleSizeItem{
					RepunitCount: itemDoc.RepunitCount,
					Frequency:    itemDoc.Frequency,
				}
			}

			adjAlleleSizeDist[j] = &model.ShortTandemRepeatAlleleSizeDistributionCohort{
				AncestryGroup:      cohortDoc.AncestryGroup,
				Sex:                cohortDoc.Sex,
				Repunit:            cohortDoc.Repunit,
				QualityDescription: cohortDoc.QualityDescription,
				QScore:             cohortDoc.QScore,
				Distribution:       distribution,
			}
		}

		adjGenotypeDist := make([]*model.ShortTandemRepeatGenotypeDistributionCohort, len(adjDoc.GenotypeDistribution))
		for j, cohortDoc := range adjDoc.GenotypeDistribution {
			distribution := make([]*model.ShortTandemRepeatGenotypeItem, len(cohortDoc.Distribution))
			for k, itemDoc := range cohortDoc.Distribution {
				distribution[k] = &model.ShortTandemRepeatGenotypeItem{
					ShortAlleleRepunitCount: itemDoc.ShortAlleleRepunitCount,
					LongAlleleRepunitCount:  itemDoc.LongAlleleRepunitCount,
					Frequency:               itemDoc.Frequency,
				}
			}

			adjGenotypeDist[j] = &model.ShortTandemRepeatGenotypeDistributionCohort{
				AncestryGroup:      cohortDoc.AncestryGroup,
				Sex:                cohortDoc.Sex,
				ShortAlleleRepunit: cohortDoc.ShortAlleleRepunit,
				LongAlleleRepunit:  cohortDoc.LongAlleleRepunit,
				QualityDescription: cohortDoc.QualityDescription,
				QScore:             cohortDoc.QScore,
				Distribution:       distribution,
			}
		}

		adjAgeDist := make([]*model.ShortTandemRepeatAgeDistributionBin, len(adjDoc.AgeDistribution))
		for j, ageDoc := range adjDoc.AgeDistribution {
			adjAgeDist[j] = &model.ShortTandemRepeatAgeDistributionBin{
				AgeRange:     ageDoc.AgeRange,
				Distribution: ageDoc.Distribution,
			}
		}

		adjacentRepeats[i] = &model.ShortTandemRepeatAdjacentRepeat{
			ID:                     adjDoc.ID,
			ReferenceRegion:        convertReferenceRegion(&adjDoc.ReferenceRegion),
			ReferenceRepeatUnit:    adjDoc.ReferenceRepeatUnit,
			RepeatUnits:            adjDoc.RepeatUnits,
			AlleleSizeDistribution: adjAlleleSizeDist,
			GenotypeDistribution:   adjGenotypeDist,
			AgeDistribution:        adjAgeDist,
		}
	}

	return &model.ShortTandemRepeatDetails{
		ID:                     doc.ID,
		Gene:                   gene,
		AssociatedDiseases:     diseases,
		StripyID:               doc.StripyID,
		StrchiveID:             doc.StrchiveID,
		MainReferenceRegion:    mainRefRegion,
		ReferenceRegions:       refRegions,
		ReferenceRepeatUnit:    doc.ReferenceRepeatUnit,
		RepeatUnits:            repeatUnits,
		AlleleSizeDistribution: alleleSizeDist,
		GenotypeDistribution:   genotypeDist,
		AgeDistribution:        ageDist,
		AdjacentRepeats:        adjacentRepeats,
	}
}

// convertSTRDocToSummary converts STR ES document to GraphQL ShortTandemRepeat model (summary version)
func convertSTRDocToSummary(doc *STRValueDoc) *model.ShortTandemRepeat {
	// Convert gene
	gene := &model.ShortTandemRepeatGene{
		EnsemblID: doc.Gene.EnsemblID,
		Symbol:    doc.Gene.Symbol,
		Region:    doc.Gene.Region,
	}

	// Convert associated diseases
	diseases := make([]*model.ShortTandemRepeatAssociatedDisease, len(doc.AssociatedDiseases))
	for i, diseaseDoc := range doc.AssociatedDiseases {
		classifications := make([]*model.ShortTandemRepeatAssociatedDiseaseRepeatSizeClassification, len(diseaseDoc.RepeatSizeClassifications))
		for j, classDoc := range diseaseDoc.RepeatSizeClassifications {
			classifications[j] = &model.ShortTandemRepeatAssociatedDiseaseRepeatSizeClassification{
				Classification: classDoc.Classification,
				Min:            classDoc.Min,
				Max:            classDoc.Max,
			}
		}

		diseases[i] = &model.ShortTandemRepeatAssociatedDisease{
			Name:                      diseaseDoc.Name,
			Symbol:                    diseaseDoc.Symbol,
			OmimID:                    diseaseDoc.OmimID,
			InheritanceMode:           diseaseDoc.InheritanceMode,
			RepeatSizeClassifications: classifications,
			Notes:                     diseaseDoc.Notes,
		}
	}

	// Convert main reference region
	mainRefRegion := convertReferenceRegion(&doc.MainReferenceRegion)

	// Convert reference regions
	refRegions := make([]*model.ShortTandemRepeatReferenceRegion, len(doc.ReferenceRegions))
	for i, regionDoc := range doc.ReferenceRegions {
		refRegions[i] = convertReferenceRegion(&regionDoc)
	}

	return &model.ShortTandemRepeat{
		ID:                  doc.ID,
		Gene:                gene,
		AssociatedDiseases:  diseases,
		StripyID:            doc.StripyID,
		StrchiveID:          doc.StrchiveID,
		MainReferenceRegion: mainRefRegion,
		ReferenceRegions:    refRegions,
		ReferenceRepeatUnit: doc.ReferenceRepeatUnit,
	}
}

// convertReferenceRegion converts reference region doc to GraphQL model
func convertReferenceRegion(doc *STRReferenceRegionDoc) *model.ShortTandemRepeatReferenceRegion {
	var refGenome model.ReferenceGenomeID
	switch doc.ReferenceGenome {
	case "GRCh37":
		refGenome = "GRCh37"
	case "GRCh38":
		refGenome = "GRCh38"
	default:
		refGenome = "GRCh38" // Default fallback
	}

	return &model.ShortTandemRepeatReferenceRegion{
		ReferenceGenome: refGenome,
		Chrom:           doc.Chrom,
		Start:           doc.Start,
		Stop:            doc.Stop,
	}
}
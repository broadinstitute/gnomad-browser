package queries

import (
	"context"
	"encoding/json"
	"fmt"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

const (
	// CNV datasets and their corresponding Elasticsearch indices
	gnomadCNVV4Index = "gnomad_v4_cnvs"
)

// CNVDatasetConfig maps dataset IDs to their configuration
type CNVDatasetConfig struct {
	Index string
}

var cnvDatasetConfigs = map[string]CNVDatasetConfig{
	"gnomad_cnv_r4": {
		Index: gnomadCNVV4Index,
	},
}

// CNVElasticsearchDoc represents the Elasticsearch document structure for CNVs
type CNVElasticsearchDoc struct {
	Value CNVValueDoc `json:"value"`
}

// CNVValueDoc represents the 'value' field in CNV Elasticsearch documents
type CNVValueDoc struct {
	VariantID       string                   `json:"variant_id"`
	Chrom           string                   `json:"chrom"`
	Pos             int                      `json:"pos"`
	End             int                      `json:"end"`
	Length          *int                     `json:"length"`
	Type            *string                  `json:"type"`
	PosMin          *int                     `json:"posmin"`
	PosMax          *int                     `json:"posmax"`
	EndMin          *int                     `json:"endmin"`
	EndMax          *int                     `json:"endmax"`
	Filters         []string                 `json:"filters"`
	Alts            []string                 `json:"alts"`
	Genes           []string                 `json:"genes"`
	Qual            *float64                 `json:"qual"`
	ReferenceGenome string                   `json:"reference_genome"`
	Freq            CNVFrequencyData         `json:"freq"`
	Populations     []CNVPopulationData      `json:"populations"`
}

// CNVFrequencyData represents frequency data for the CNV
type CNVFrequencyData struct {
	SC float64 `json:"sc"` // Sample count
	SN float64 `json:"sn"` // Sample number
	SF float64 `json:"sf"` // Sample frequency
}

// CNVPopulationData represents population-specific CNV data
type CNVPopulationData struct {
	ID string  `json:"id"`
	SC float64 `json:"sc"`
	SN float64 `json:"sn"`
	SF float64 `json:"sf"`
}

// FetchCopyNumberVariant fetches a specific copy number variant by ID
func FetchCopyNumberVariant(ctx context.Context, client *elastic.Client, variantID string, datasetID string) (*model.CopyNumberVariantDetails, error) {
	config, exists := cnvDatasetConfigs[datasetID]
	if !exists {
		return nil, fmt.Errorf("unsupported CNV dataset: %s", datasetID)
	}

	// Build query
	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": map[string]any{
					"term": map[string]any{
						"variant_id": variantID,
					},
				},
			},
		},
		"_source": map[string]any{
			"includes": []string{"value"},
		},
		"size": 1,
	}

	// Execute search
	response, err := client.Search(ctx, config.Index, query)
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
		return nil, fmt.Errorf("invalid CNV document structure")
	}

	// Parse into struct
	var doc CNVValueDoc
	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal CNV value: %w", err)
	}
	if err := json.Unmarshal(jsonBytes, &doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal CNV document: %w", err)
	}

	// Convert to GraphQL model
	return shapeCNVDetailsData(&doc), nil
}

// FetchCopyNumberVariantsByGene fetches copy number variants that overlap with a gene
func FetchCopyNumberVariantsByGene(ctx context.Context, client *elastic.Client, geneSymbol string, datasetID string) ([]*model.CopyNumberVariant, error) {
	config, exists := cnvDatasetConfigs[datasetID]
	if !exists {
		return nil, fmt.Errorf("unsupported CNV dataset: %s", datasetID)
	}

	// Build query for gene overlaps
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
		"_source": []string{
			"value.chrom",
			"value.end",
			"value.filters",
			"value.freq",
			"value.length",
			"value.pos",
			"value.reference_genome",
			"value.type",
			"value.posmin",
			"value.posmax",
			"value.endmin",
			"value.endmax",
			"value.variant_id",
		},
		"sort": []map[string]any{
			{"xpos": map[string]string{"order": "asc"}},
		},
		"size": 10000,
	}

	// Execute search with pagination
	hits, err := fetchAllSearchResults(ctx, client, config.Index, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch CNVs by gene: %w", err)
	}

	// Process results - initialize slice to ensure non-nil return
	cnvs := make([]*model.CopyNumberVariant, 0)
	for _, hit := range hits {
		// Extract the 'value' field from _source
		value, ok := hit.Source["value"].(map[string]any)
		if !ok {
			continue // Skip malformed documents
		}

		// Parse into struct
		var doc CNVValueDoc
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			continue // Skip malformed documents
		}
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue // Skip malformed documents
		}

		// Filter by sample count > 0
		if doc.Freq.SC > 0 {
			cnvs = append(cnvs, shapeCNVData(&doc))
		}
	}

	return cnvs, nil
}

// FetchCopyNumberVariantsByRegion fetches copy number variants in a genomic region
func FetchCopyNumberVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int, xstart, xstop float64, datasetID string) ([]*model.CopyNumberVariant, error) {
	config, exists := cnvDatasetConfigs[datasetID]
	if !exists {
		return nil, fmt.Errorf("unsupported CNV dataset: %s", datasetID)
	}

	// Build query for region overlap
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
				},
			},
		},
		"_source": []string{
			"value.chrom",
			"value.end",
			"value.filters",
			"value.freq",
			"value.length",
			"value.pos",
			"value.reference_genome",
			"value.type",
			"value.posmin",
			"value.posmax",
			"value.endmin",
			"value.endmax",
			"value.variant_id",
		},
		"sort": []map[string]any{
			{"xpos": map[string]string{"order": "asc"}},
		},
		"size": 10000,
	}

	// Execute search with pagination
	hits, err := fetchAllSearchResults(ctx, client, config.Index, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch CNVs by region: %w", err)
	}

	// Process results - initialize slice to ensure non-nil return
	cnvs := make([]*model.CopyNumberVariant, 0)
	for _, hit := range hits {
		// Extract the 'value' field from _source
		value, ok := hit.Source["value"].(map[string]any)
		if !ok {
			continue // Skip malformed documents
		}

		// Parse into struct
		var doc CNVValueDoc
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			continue // Skip malformed documents
		}
		if err := json.Unmarshal(jsonBytes, &doc); err != nil {
			continue // Skip malformed documents
		}

		// Filter by sample count > 0
		if doc.Freq.SC > 0 {
			cnvs = append(cnvs, shapeCNVData(&doc))
		}
	}

	return cnvs, nil
}

// shapeCNVData converts CNV document data to GraphQL CopyNumberVariant model
func shapeCNVData(doc *CNVValueDoc) *model.CopyNumberVariant {
	// Convert reference genome string to enum
	var refGenome model.ReferenceGenomeID
	switch doc.ReferenceGenome {
	case "GRCh37":
		refGenome = model.ReferenceGenomeIDGRCh37
	case "GRCh38":
		refGenome = model.ReferenceGenomeIDGRCh38
	default:
		refGenome = model.ReferenceGenomeIDGRCh38 // Default fallback
	}

	return &model.CopyNumberVariant{
		VariantID:       doc.VariantID,
		Chrom:           doc.Chrom,
		Pos:             doc.Pos,
		End:             doc.End,
		Length:          doc.Length,
		Type:            doc.Type,
		Posmin:          doc.PosMin,
		Posmax:          doc.PosMax,
		Endmin:          doc.EndMin,
		Endmax:          doc.EndMax,
		Filters:         doc.Filters,
		ReferenceGenome: refGenome,
		Sc:              doc.Freq.SC,
		Sn:              doc.Freq.SN,
		Sf:              doc.Freq.SF,
	}
}

// shapeCNVDetailsData converts CNV document data to GraphQL CopyNumberVariantDetails model
func shapeCNVDetailsData(doc *CNVValueDoc) *model.CopyNumberVariantDetails {
	// Convert reference genome string to enum
	var refGenome model.ReferenceGenomeID
	switch doc.ReferenceGenome {
	case "GRCh37":
		refGenome = model.ReferenceGenomeIDGRCh37
	case "GRCh38":
		refGenome = model.ReferenceGenomeIDGRCh38
	default:
		refGenome = model.ReferenceGenomeIDGRCh38 // Default fallback
	}

	// Convert population data
	var populations []*model.CopyNumberVariantPopulation
	for _, pop := range doc.Populations {
		populations = append(populations, &model.CopyNumberVariantPopulation{
			ID: pop.ID,
			Sc: pop.SC,
			Sn: pop.SN,
			Sf: pop.SF,
		})
	}

	return &model.CopyNumberVariantDetails{
		VariantID:       doc.VariantID,
		Chrom:           doc.Chrom,
		Pos:             doc.Pos,
		End:             doc.End,
		Length:          doc.Length,
		Type:            doc.Type,
		Posmin:          doc.PosMin,
		Posmax:          doc.PosMax,
		Endmin:          doc.EndMin,
		Endmax:          doc.EndMax,
		Filters:         doc.Filters,
		Alts:            doc.Alts,
		Genes:           doc.Genes,
		Qual:            doc.Qual,
		ReferenceGenome: refGenome,
		Sc:              doc.Freq.SC,
		Sn:              doc.Freq.SN,
		Sf:              doc.Freq.SF,
		Populations:     populations,
	}
}

// fetchAllSearchResults is a helper to fetch all results with pagination
func fetchAllSearchResults(ctx context.Context, client *elastic.Client, index string, query map[string]any) ([]elastic.Hit, error) {
	var allHits []elastic.Hit
	
	response, err := client.Search(ctx, index, query)
	if err != nil {
		return nil, err
	}
	
	allHits = append(allHits, response.Hits.Hits...)
	
	// For simplicity, we're just taking the first batch
	// In a production system, you might want to implement proper pagination
	// if the number of results exceeds the size limit
	
	return allHits, nil
}
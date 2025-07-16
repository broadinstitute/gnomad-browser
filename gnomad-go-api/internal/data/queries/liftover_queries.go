package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

const LiftoverIndex = "liftover"

// LiftoverDocument represents the Elasticsearch document structure for liftover data
type LiftoverDocument struct {
	Source   LiftoverVariantDoc `json:"source"`
	Liftover LiftoverVariantDoc `json:"liftover"`
	Datasets []string           `json:"datasets"`
}

type LiftoverVariantDoc struct {
	VariantID       string `json:"variant_id"`
	ReferenceGenome string `json:"reference_genome"`
}

// isVariantID checks if a string is a valid variant ID format
func isVariantID(s string) bool {
	// Match pattern like "1-55516888-G-GA" or "X-12345-A-T"
	matched, _ := regexp.MatchString(`^[0-9XY]+\-[0-9]+\-[ATCG]+\-[ATCG]+$`, s)
	return matched
}

// normalizeVariantID ensures consistent variant ID formatting
func normalizeVariantID(variantID string) string {
	// For now, just return as-is, but could add normalization logic here
	return variantID
}

// FetchLiftover retrieves liftover data based on source or target variant ID
func FetchLiftover(ctx context.Context, esClient *elastic.Client, sourceVariantID *string, liftoverVariantID *string, referenceGenome string) ([]*model.LiftoverResult, error) {
	if sourceVariantID == nil && liftoverVariantID == nil {
		return nil, fmt.Errorf("one of source_variant_id or liftover_variant_id is required")
	}

	if sourceVariantID != nil && liftoverVariantID != nil {
		return nil, fmt.Errorf("only one of source_variant_id or liftover_variant_id can be provided")
	}

	var query map[string]interface{}

	if liftoverVariantID != nil {
		// Validate variant ID
		if !isVariantID(*liftoverVariantID) {
			return nil, fmt.Errorf("invalid variant ID: %s", *liftoverVariantID)
		}

		// Search by target/liftover variant
		normalizedID := normalizeVariantID(*liftoverVariantID)
		query = map[string]interface{}{
			"query": map[string]interface{}{
				"bool": map[string]interface{}{
					"filter": []map[string]interface{}{
						{
							"term": map[string]interface{}{
								"liftover.variant_id": normalizedID,
							},
						},
						{
							"term": map[string]interface{}{
								"liftover.reference_genome": referenceGenome,
							},
						},
					},
				},
			},
			"size": 100,
		}
	} else {
		// Validate variant ID
		if !isVariantID(*sourceVariantID) {
			return nil, fmt.Errorf("invalid variant ID: %s", *sourceVariantID)
		}

		// Search by source variant
		normalizedID := normalizeVariantID(*sourceVariantID)
		query = map[string]interface{}{
			"query": map[string]interface{}{
				"bool": map[string]interface{}{
					"filter": []map[string]interface{}{
						{
							"term": map[string]interface{}{
								"source.variant_id": normalizedID,
							},
						},
						{
							"term": map[string]interface{}{
								"source.reference_genome": referenceGenome,
							},
						},
					},
				},
			},
			"size": 100,
		}
	}

	// Execute search
	response, err := esClient.Search(ctx, LiftoverIndex, query)
	if err != nil {
		return nil, fmt.Errorf("error searching liftover index: %w", err)
	}

	// Initialize with empty slice to ensure we never return nil
	results := make([]*model.LiftoverResult, 0)

	for _, hit := range response.Hits.Hits {
		// Parse the liftover document
		var liftoverDoc LiftoverDocument
		sourceBytes, err := json.Marshal(hit.Source)
		if err != nil {
			continue
		}

		if err := json.Unmarshal(sourceBytes, &liftoverDoc); err != nil {
			continue
		}

		// Filter out invalid liftover variants (those that don't have valid variant IDs)
		if !isVariantID(liftoverDoc.Liftover.VariantID) {
			continue
		}

		// Convert to GraphQL model
		result := &model.LiftoverResult{
			Source: &model.LiftoverVariant{
				VariantID:       liftoverDoc.Source.VariantID,
				ReferenceGenome: convertReferenceGenome(liftoverDoc.Source.ReferenceGenome),
			},
			Liftover: &model.LiftoverVariant{
				VariantID:       liftoverDoc.Liftover.VariantID,
				ReferenceGenome: convertReferenceGenome(liftoverDoc.Liftover.ReferenceGenome),
			},
			Datasets: liftoverDoc.Datasets,
		}

		results = append(results, result)
	}

	return results, nil
}

// convertReferenceGenome converts string reference genome to enum
func convertReferenceGenome(refGenome string) model.ReferenceGenomeID {
	switch refGenome {
	case "GRCh37":
		return model.ReferenceGenomeIDGRCh37
	case "GRCh38":
		return model.ReferenceGenomeIDGRCh38
	default:
		// Default to GRCh37 if unknown
		return model.ReferenceGenomeIDGRCh37
	}
}

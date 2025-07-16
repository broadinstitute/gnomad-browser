package queries

import (
	"context"
	"fmt"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// FetchMatchingVariants searches for variants matching a text query
func FetchMatchingVariants(ctx context.Context, esClient *elastic.Client, query string, datasetID string) ([]*model.VariantSearchResult, error) {
	// Get the fetcher for the dataset
	fetcher, ok := datasetFetchers[datasetID]
	if !ok {
		return nil, fmt.Errorf("unsupported dataset: %s", datasetID)
	}

	// Detect query type and dispatch to appropriate search logic
	queryType := detectQueryType(query)

	switch queryType {
	case "variant_id":
		return searchVariantsByID(ctx, esClient, fetcher, query)
	case "rsid":
		return searchVariantsByRSID(ctx, esClient, fetcher, query)
	case "caid":
		return searchVariantsByCAID(ctx, esClient, fetcher, query)
	default:
		return nil, fmt.Errorf("unsupported search query type")
	}
}

// detectQueryType determines the type of query based on the input string
func detectQueryType(query string) string {
	query = strings.TrimSpace(query)
	lowerQuery := strings.ToLower(query)

	// Check for rsID pattern
	if strings.HasPrefix(lowerQuery, "rs") {
		return "rsid"
	}

	// Check for ClinVar Allele ID pattern
	if strings.Contains(lowerQuery, "clinvar") || strings.Contains(lowerQuery, "caid") {
		return "caid"
	}

	// Default to variant ID (chrom-pos-ref-alt format)
	return "variant_id"
}

// searchVariantsByID searches for variants by variant ID
func searchVariantsByID(ctx context.Context, esClient *elastic.Client, fetcher VariantFetcher, query string) ([]*model.VariantSearchResult, error) {
	// Normalize the variant ID
	normalizedID := NormalizeVariantID(query)

	// Build the search query
	searchQuery := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": map[string]interface{}{
					"term": map[string]interface{}{
						"variant_id": normalizedID,
					},
				},
			},
		},
		"_source": []string{"value.variant_id"},
		"size":    100,
	}

	// Execute the search
	response, err := esClient.Search(ctx, getIndexForFetcher(fetcher), searchQuery)
	if err != nil {
		return nil, fmt.Errorf("error searching for variants: %w", err)
	}

	// Convert results
	results := make([]*model.VariantSearchResult, len(response.Hits.Hits))
	for i, hit := range response.Hits.Hits {
		source := hit.Source
		var variantID string

		if value, ok := source["value"].(map[string]interface{}); ok {
			if id, ok := value["variant_id"].(string); ok {
				variantID = id
			}
		}

		results[i] = &model.VariantSearchResult{
			VariantID: variantID,
		}
	}

	return results, nil
}

// searchVariantsByRSID searches for variants by rsID
func searchVariantsByRSID(ctx context.Context, esClient *elastic.Client, fetcher VariantFetcher, query string) ([]*model.VariantSearchResult, error) {
	// Normalize the rsID
	normalizedRSID := strings.ToLower(strings.TrimSpace(query))

	// Build the search query
	searchQuery := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": map[string]interface{}{
					"term": map[string]interface{}{
						"rsids": normalizedRSID,
					},
				},
			},
		},
		"_source": []string{"value.variant_id"},
		"size":    100,
	}

	// Execute the search
	response, err := esClient.Search(ctx, getIndexForFetcher(fetcher), searchQuery)
	if err != nil {
		return nil, fmt.Errorf("error searching for variants: %w", err)
	}

	// Convert results
	results := make([]*model.VariantSearchResult, len(response.Hits.Hits))
	for i, hit := range response.Hits.Hits {
		source := hit.Source
		var variantID string

		if value, ok := source["value"].(map[string]interface{}); ok {
			if id, ok := value["variant_id"].(string); ok {
				variantID = id
			}
		}

		results[i] = &model.VariantSearchResult{
			VariantID: variantID,
		}
	}

	return results, nil
}

// searchVariantsByCAID searches for variants by ClinVar Allele ID
func searchVariantsByCAID(ctx context.Context, esClient *elastic.Client, fetcher VariantFetcher, query string) ([]*model.VariantSearchResult, error) {
	// Build the search query
	searchQuery := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": map[string]interface{}{
					"term": map[string]interface{}{
						"caid": query,
					},
				},
			},
		},
		"_source": []string{"value.variant_id"},
		"size":    100,
	}

	// Execute the search
	response, err := esClient.Search(ctx, getIndexForFetcher(fetcher), searchQuery)
	if err != nil {
		return nil, fmt.Errorf("error searching for variants: %w", err)
	}

	// Convert results
	results := make([]*model.VariantSearchResult, len(response.Hits.Hits))
	for i, hit := range response.Hits.Hits {
		source := hit.Source
		var variantID string

		if value, ok := source["value"].(map[string]interface{}); ok {
			if id, ok := value["variant_id"].(string); ok {
				variantID = id
			}
		}

		results[i] = &model.VariantSearchResult{
			VariantID: variantID,
		}
	}

	return results, nil
}

// getIndexForFetcher returns the Elasticsearch index for a fetcher
func getIndexForFetcher(fetcher VariantFetcher) string {
	// Use type assertion to get the BaseVariantFetcher and access ESIndex
	switch f := fetcher.(type) {
	case *GnomadV4VariantFetcher:
		return f.ESIndex
	case *GnomadV3VariantFetcher:
		return f.ESIndex
	case *GnomadV2VariantFetcher:
		return f.ESIndex
	case *ExacVariantFetcher:
		return f.ESIndex
	default:
		// Fallback - this shouldn't happen in normal operation
		return "variants"
	}
}

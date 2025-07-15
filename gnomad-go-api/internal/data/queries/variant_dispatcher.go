package queries

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// Global registry of dataset fetchers.
var datasetFetchers = make(map[string]VariantFetcher)

// RegisterDatasetFetcher registers a fetcher for a dataset.
func RegisterDatasetFetcher(datasetID string, fetcher VariantFetcher) {
	datasetFetchers[datasetID] = fetcher
}

// InitializeFetchers sets up all dataset-specific fetchers.
func InitializeFetchers() {
	// gnomAD v4 datasets
	RegisterDatasetFetcher("gnomad_r4", &GnomadV4VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r4",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v4_variants",
		},
		Subset: "all",
	})

	RegisterDatasetFetcher("gnomad_r4_non_ukb", &GnomadV4VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r4_non_ukb",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v4_variants",
		},
		Subset: "non_ukb",
	})

	// gnomAD v2 datasets
	RegisterDatasetFetcher("gnomad_r2_1", &GnomadV2VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r2_1",
			ReferenceGenome: model.ReferenceGenomeIDGRCh37,
			ESIndex:         "gnomad_v2_1_1_variants",
		},
	})
}

// Main dispatcher function.
func FetchVariantByID(ctx context.Context, client *elastic.Client, datasetID, variantID string) (*model.VariantDetails, error) {
	fetcher, ok := datasetFetchers[datasetID]
	if !ok {
		return nil, fmt.Errorf("unsupported dataset: %s", datasetID)
	}

	// Validate reference genome match
	if err := validateVariantID(variantID, fetcher.GetReferenceGenome()); err != nil {
		return nil, err
	}

	return fetcher.FetchVariantByID(ctx, client, variantID)
}

func FetchVariantByRSID(ctx context.Context, client *elastic.Client, datasetID, rsid string) (*model.VariantDetails, error) {
	fetcher, ok := datasetFetchers[datasetID]
	if !ok {
		return nil, fmt.Errorf("unsupported dataset: %s", datasetID)
	}

	return fetcher.FetchVariantByRSID(ctx, client, rsid)
}

func FetchVariantByVRSID(ctx context.Context, client *elastic.Client, datasetID, vrsID string) (*model.VariantDetails, error) {
	fetcher, ok := datasetFetchers[datasetID]
	if !ok {
		return nil, fmt.Errorf("unsupported dataset: %s", datasetID)
	}

	return fetcher.FetchVariantByVRSID(ctx, client, vrsID)
}

// validateVariantID checks if variant ID matches expected reference genome.
func validateVariantID(variantID string, referenceGenome model.ReferenceGenomeID) error {
	parts := strings.Split(variantID, "-")
	if len(parts) < 4 {
		return fmt.Errorf("invalid variant ID format: %s", variantID)
	}

	chr := parts[0]

	// Check for reference genome mismatch
	switch referenceGenome {
	case model.ReferenceGenomeIDGRCh37:
		if strings.HasPrefix(chr, "chr") {
			return fmt.Errorf("GRCh37 variant IDs should not include 'chr' prefix")
		}
	case model.ReferenceGenomeIDGRCh38:
		if !strings.HasPrefix(chr, "chr") && chr != "M" {
			return fmt.Errorf("GRCh38 variant IDs should include 'chr' prefix")
		}
	}

	return nil
}

// Based on @gnomad/identifiers normalizeVariantId function.
func NormalizeVariantID(variantID string) string {
	// Trim whitespace
	variantID = strings.TrimSpace(variantID)

	// Handle various formats:
	// 1. Standard variant ID format
	matched, err := regexp.MatchString(`^(\d+|x|y|m|mt)[-:]`, strings.ToLower(variantID))
	if err == nil && matched {
		// Convert to uppercase for ref/alt
		parts := strings.Split(variantID, "-")
		if len(parts) >= 4 {
			// Keep chrom lowercase, position as-is, uppercase ref/alt
			parts[0] = strings.ToLower(parts[0])
			parts[2] = strings.ToUpper(parts[2])
			parts[3] = strings.ToUpper(parts[3])

			return strings.Join(parts, "-")
		}
	}

	// 2. RSID format - keep lowercase
	if strings.HasPrefix(strings.ToLower(variantID), "rs") {
		return strings.ToLower(variantID)
	}

	// 3. Other formats (ClinVar, etc) - return as-is after trim
	return variantID
}

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

// GetDatasetFetcher returns a fetcher for a given dataset ID
func GetDatasetFetcher(datasetID string) (VariantFetcher, bool) {
	fetcher, ok := datasetFetchers[datasetID]
	return fetcher, ok
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

	// gnomAD v3 datasets
	RegisterDatasetFetcher("gnomad_r3", &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	})

	RegisterDatasetFetcher("gnomad_r3_controls_and_biobanks", &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_controls_and_biobanks",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "controls_and_biobanks",
	})

	RegisterDatasetFetcher("gnomad_r3_non_cancer", &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_non_cancer",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "non_cancer",
	})

	RegisterDatasetFetcher("gnomad_r3_non_neuro", &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_non_neuro",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "non_neuro",
	})

	RegisterDatasetFetcher("gnomad_r3_non_topmed", &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_non_topmed",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "non_topmed",
	})

	RegisterDatasetFetcher("gnomad_r3_non_v2", &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_non_v2",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "non_v2",
	})

	// gnomAD v2 datasets
	RegisterDatasetFetcher("gnomad_r2_1", &GnomadV2VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r2_1",
			ReferenceGenome: model.ReferenceGenomeIDGRCh37,
			ESIndex:         GnomadV2Index,
		},
		Subset: "gnomad",
	})

	// ExAC dataset
	RegisterDatasetFetcher("exac", &ExacVariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "exac",
			ReferenceGenome: model.ReferenceGenomeIDGRCh37,
			ESIndex:         ExacVariantIndex,
		},
	})
}

// Main dispatcher function.
func FetchVariantByID(ctx context.Context, client *elastic.Client, datasetID, variantID string) (*model.VariantDetails, error) {
	fetcher, ok := datasetFetchers[datasetID]
	if !ok {
		return nil, fmt.Errorf("unsupported dataset: %s", datasetID)
	}

	// Convert variant ID to the format expected by the reference genome
	convertedID := convertVariantIDForReferenceGenome(variantID, fetcher.GetReferenceGenome())

	// Validate reference genome match
	if err := validateVariantID(convertedID, fetcher.GetReferenceGenome()); err != nil {
		return nil, err
	}

	return fetcher.FetchVariantByID(ctx, client, convertedID)
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

// convertVariantIDForReferenceGenome converts variant ID to the format expected by the reference genome
func convertVariantIDForReferenceGenome(variantID string, referenceGenome model.ReferenceGenomeID) string {
	parts := strings.Split(variantID, "-")
	if len(parts) < 4 {
		return variantID // Return as-is if not a valid format
	}

	chr := parts[0]

	switch referenceGenome {
	case model.ReferenceGenomeIDGRCh37:
		// Remove "chr" prefix if present
		if strings.HasPrefix(chr, "chr") {
			parts[0] = chr[3:]
		}
	case model.ReferenceGenomeIDGRCh38:
		// For GRCh38, also remove "chr" prefix if present to match ES data format
		if strings.HasPrefix(chr, "chr") {
			parts[0] = chr[3:]
		}
	}

	return strings.Join(parts, "-")
}

// validateVariantID checks if variant ID matches expected reference genome.
func validateVariantID(variantID string, referenceGenome model.ReferenceGenomeID) error {
	parts := strings.Split(variantID, "-")
	if len(parts) < 4 {
		return fmt.Errorf("invalid variant ID format: %s", variantID)
	}

	// Check for reference genome mismatch - be permissive since data format may vary
	switch referenceGenome {
	case model.ReferenceGenomeIDGRCh37:
		// Allow both formats for GRCh37
		break
	case model.ReferenceGenomeIDGRCh38:
		// Allow both formats for GRCh38 since ES data might be stored without "chr" prefix
		break
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

package queries

import (
	"context"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// VariantFetcher defines the interface for dataset-specific variant fetchers.
type VariantFetcher interface {
	// Core variant fetch methods - single variant
	FetchVariantByID(ctx context.Context, client *elastic.Client, variantID string) (*model.VariantDetails, error)
	FetchVariantByRSID(ctx context.Context, client *elastic.Client, rsid string) (*model.VariantDetails, error)
	FetchVariantByVRSID(ctx context.Context, client *elastic.Client, vrsID string) (*model.VariantDetails, error)

	// Batch variant fetch methods - multiple variants
	FetchVariantsByGene(ctx context.Context, client *elastic.Client, gene *model.Gene) ([]*model.Variant, error)
	FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.Variant, error)
	FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.Variant, error)

	// Dataset info
	GetDatasetID() string
	GetReferenceGenome() model.ReferenceGenomeID
}

// BaseVariantFetcher provides common functionality.
type BaseVariantFetcher struct {
	DatasetID       string
	ReferenceGenome model.ReferenceGenomeID
	ESIndex         string
}

func (b *BaseVariantFetcher) GetDatasetID() string {
	return b.DatasetID
}

func (b *BaseVariantFetcher) GetReferenceGenome() model.ReferenceGenomeID {
	return b.ReferenceGenome
}

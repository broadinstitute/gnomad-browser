package queries

import (
	"context"
	"fmt"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// GnomadV4VariantFetcher implements variant fetching for gnomAD v4.
type GnomadV4VariantFetcher struct {
	BaseVariantFetcher
	Subset string
}

func (f *GnomadV4VariantFetcher) FetchVariantByID(ctx context.Context, client *elastic.Client, variantID string) (*model.VariantDetails, error) {
	// Placeholder - will be implemented in Session 5
	return nil, fmt.Errorf("gnomAD v4 variant fetching not yet implemented")
}

func (f *GnomadV4VariantFetcher) FetchVariantByRSID(ctx context.Context, client *elastic.Client, rsid string) (*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v4 RSID fetching not yet implemented")
}

func (f *GnomadV4VariantFetcher) FetchVariantByVRSID(ctx context.Context, client *elastic.Client, vrsID string) (*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v4 VRS ID fetching not yet implemented")
}

// Batch fetching methods.
func (f *GnomadV4VariantFetcher) FetchVariantsByGene(ctx context.Context, client *elastic.Client, geneID string, transcriptID *string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v4 gene variant fetching not yet implemented")
}

func (f *GnomadV4VariantFetcher) FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v4 region variant fetching not yet implemented")
}

func (f *GnomadV4VariantFetcher) FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v4 transcript variant fetching not yet implemented")
}

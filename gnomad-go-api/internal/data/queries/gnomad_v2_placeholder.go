package queries

import (
	"context"
	"fmt"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// GnomadV2VariantFetcher implements variant fetching for gnomAD v2.
type GnomadV2VariantFetcher struct {
	BaseVariantFetcher
}

func (f *GnomadV2VariantFetcher) FetchVariantByID(ctx context.Context, client *elastic.Client, variantID string) (*model.VariantDetails, error) {
	// Placeholder - will be implemented later
	return nil, fmt.Errorf("gnomAD v2 variant fetching not yet implemented")
}

func (f *GnomadV2VariantFetcher) FetchVariantByRSID(ctx context.Context, client *elastic.Client, rsid string) (*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v2 RSID fetching not yet implemented")
}

func (f *GnomadV2VariantFetcher) FetchVariantByVRSID(ctx context.Context, client *elastic.Client, vrsID string) (*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v2 VRS ID fetching not yet implemented")
}

// Batch fetching methods.
func (f *GnomadV2VariantFetcher) FetchVariantsByGene(ctx context.Context, client *elastic.Client, geneID string, transcriptID *string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v2 gene variant fetching not yet implemented")
}

func (f *GnomadV2VariantFetcher) FetchVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v2 region variant fetching not yet implemented")
}

func (f *GnomadV2VariantFetcher) FetchVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string) ([]*model.VariantDetails, error) {
	return nil, fmt.Errorf("gnomAD v2 transcript variant fetching not yet implemented")
}

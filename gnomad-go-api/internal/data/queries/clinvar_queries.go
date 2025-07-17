package queries

import (
	"context"
	"encoding/json"
	"fmt"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// ClinVar Elasticsearch indices
var ClinVarVariantIndices = map[string]string{
	"GRCh37": "clinvar_grch37_variants",
	"GRCh38": "clinvar_grch38_variants",
}

// ClinVarVariantDocument represents the ES document structure for ClinVar variants
type ClinVarVariantDocument struct {
	VariantID               string                   `json:"variant_id"`
	ReferenceGenome         string                   `json:"reference_genome"`
	Chrom                   string                   `json:"chrom"`
	Pos                     int                      `json:"pos"`
	Ref                     string                   `json:"ref"`
	Alt                     string                   `json:"alt"`
	ClinicalSignificance    string                   `json:"clinical_significance"`
	ClinVarVariationID      string                   `json:"clinvar_variation_id"`
	GoldStars               int                      `json:"gold_stars"`
	HGVSC                   *string                  `json:"hgvsc"`
	HGVSP                   *string                  `json:"hgvsp"`
	InGnomAD                *bool                    `json:"in_gnomad"`
	MajorConsequence        *string                  `json:"major_consequence"`
	ReviewStatus            string                   `json:"review_status"`
	TranscriptID            *string                  `json:"transcript_id"`
	RSID                    *string                  `json:"rsid"`
	LastEvaluated           *string                  `json:"last_evaluated"`
	TranscriptConsequences  []map[string]interface{} `json:"transcript_consequences"`
	GnomAD                  *ClinVarGnomADData       `json:"gnomad"`
	Submissions             []ClinVarSubmissionDoc   `json:"submissions"`
}

// ClinVarGnomADData represents gnomAD data within ClinVar variants
type ClinVarGnomADData struct {
	Exome  *ClinVarGnomADSequencingData `json:"exome"`
	Genome *ClinVarGnomADSequencingData `json:"genome"`
}

// ClinVarGnomADSequencingData represents sequencing type data within gnomAD
type ClinVarGnomADSequencingData struct {
	AC      int      `json:"ac"`
	AN      int      `json:"an"`
	Filters []string `json:"filters"`
}

// ClinVarSubmissionDoc represents a ClinVar submission
type ClinVarSubmissionDoc struct {
	ClinicalSignificance *string               `json:"clinical_significance"`
	LastEvaluated        *string               `json:"last_evaluated"`
	ReviewStatus         string                `json:"review_status"`
	SubmitterName        string                `json:"submitter_name"`
	Conditions           []ClinVarConditionDoc `json:"conditions"`
}

// ClinVarConditionDoc represents a ClinVar condition
type ClinVarConditionDoc struct {
	Name     string  `json:"name"`
	MedGenID *string `json:"medgen_id"`
}

// FetchClinVarVariant retrieves a ClinVar variant by variant ID and reference genome
func FetchClinVarVariant(ctx context.Context, client *elastic.Client, variantID string, referenceGenome string) (*model.ClinVarVariantDetails, error) {
	index, ok := ClinVarVariantIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unsupported reference genome: %s", referenceGenome)
	}

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

	response, err := client.Search(ctx, index, query)
	if err != nil {
		return nil, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	if len(response.Hits.Hits) == 0 {
		return nil, nil
	}

	hit := response.Hits.Hits[0]

	// Extract the 'value' field from _source
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("unexpected document structure: missing 'value' field")
	}

	// Convert to JSON and back to parse into our struct
	valueJSON, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal document: %w", err)
	}

	var doc ClinVarVariantDocument
	if err := json.Unmarshal(valueJSON, &doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal document: %w", err)
	}

	// Convert to GraphQL model
	result := &model.ClinVarVariantDetails{
		VariantID:            doc.VariantID,
		ReferenceGenome:      mapReferenceGenome(doc.ReferenceGenome),
		Chrom:                doc.Chrom,
		Pos:                  doc.Pos,
		Ref:                  doc.Ref,
		Alt:                  doc.Alt,
		ClinicalSignificance: doc.ClinicalSignificance,
		ClinvarVariationID:   doc.ClinVarVariationID,
		GoldStars:            doc.GoldStars,
		InGnomad:             doc.InGnomAD != nil && *doc.InGnomAD,
		ReviewStatus:         doc.ReviewStatus,
	}

	// Optional fields
	if doc.RSID != nil {
		result.Rsid = doc.RSID
	}
	if doc.LastEvaluated != nil {
		result.LastEvaluated = doc.LastEvaluated
	}

	// Convert gnomAD data - always return structure with null fields when no data
	if doc.GnomAD != nil {
		result.Gnomad = convertClinVarGnomADData(doc.GnomAD)
	} else {
		result.Gnomad = &model.ClinVarVariantGnomadData{
			Exome:  nil,
			Genome: nil,
		}
	}

	// Convert submissions
	if len(doc.Submissions) > 0 {
		result.Submissions = make([]*model.ClinVarSubmission, len(doc.Submissions))
		for i, sub := range doc.Submissions {
			result.Submissions[i] = convertClinVarSubmission(sub)
		}
	}

	return result, nil
}

// convertClinVarGnomADData converts ClinVar gnomAD data to GraphQL model
func convertClinVarGnomADData(data *ClinVarGnomADData) *model.ClinVarVariantGnomadData {
	result := &model.ClinVarVariantGnomadData{}

	if data.Exome != nil && (data.Exome.AC > 0 || data.Exome.AN > 0 || len(data.Exome.Filters) > 0) {
		result.Exome = &model.ClinVarVariantGnomadSequencingTypeData{
			Ac:      data.Exome.AC,
			An:      data.Exome.AN,
			Filters: data.Exome.Filters,
		}
	}

	if data.Genome != nil && (data.Genome.AC > 0 || data.Genome.AN > 0 || len(data.Genome.Filters) > 0) {
		result.Genome = &model.ClinVarVariantGnomadSequencingTypeData{
			Ac:      data.Genome.AC,
			An:      data.Genome.AN,
			Filters: data.Genome.Filters,
		}
	}

	return result
}

// convertClinVarSubmission converts a ClinVar submission to GraphQL model
func convertClinVarSubmission(sub ClinVarSubmissionDoc) *model.ClinVarSubmission {
	result := &model.ClinVarSubmission{
		ReviewStatus:  sub.ReviewStatus,
		SubmitterName: sub.SubmitterName,
	}

	// Optional fields
	if sub.ClinicalSignificance != nil {
		result.ClinicalSignificance = sub.ClinicalSignificance
	}
	if sub.LastEvaluated != nil {
		result.LastEvaluated = sub.LastEvaluated
	}

	// Convert conditions
	if len(sub.Conditions) > 0 {
		result.Conditions = make([]*model.ClinVarCondition, len(sub.Conditions))
		for i, cond := range sub.Conditions {
			result.Conditions[i] = &model.ClinVarCondition{
				Name: cond.Name,
			}
			if cond.MedGenID != nil {
				result.Conditions[i].MedgenID = cond.MedGenID
			}
		}
	}

	return result
}

// mapReferenceGenome maps string to enum
func mapReferenceGenome(genome string) model.ReferenceGenomeID {
	switch genome {
	case "GRCh37":
		return model.ReferenceGenomeIDGRCh37
	case "GRCh38":
		return model.ReferenceGenomeIDGRCh38
	default:
		return model.ReferenceGenomeIDGRCh38 // default
	}
}

// FetchClinVarVariantsByGene fetches ClinVar variants for a gene
func FetchClinVarVariantsByGene(ctx context.Context, client *elastic.Client, geneID string, referenceGenome string) ([]*model.ClinVarVariant, error) {
	index, ok := ClinVarVariantIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unsupported reference genome: %s", referenceGenome)
	}

	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": map[string]any{
					"term": map[string]any{
						"gene_id": geneID,
					},
				},
			},
		},
		"_source": map[string]any{
			"includes": []string{"value"},
		},
		"sort": []map[string]any{
			{"pos": map[string]any{"order": "asc"}},
		},
		"size": 10000,
	}

	response, err := client.Search(ctx, index, query)
	if err != nil {
		return []*model.ClinVarVariant{}, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	// Create gene context for transcript consequence selection
	context := FlagContext{
		Type:   "gene",
		GeneID: geneID,
	}

	results := make([]*model.ClinVarVariant, 0, len(response.Hits.Hits))
	for _, hit := range response.Hits.Hits {
		variant, err := convertHitToClinVarVariantWithContext(hit, &context)
		if err != nil {
			continue // Skip invalid variants
		}
		results = append(results, variant)
	}

	return results, nil
}

// FetchClinVarVariantsByRegion fetches ClinVar variants for a region
func FetchClinVarVariantsByRegion(ctx context.Context, client *elastic.Client, chrom string, start, stop int, referenceGenome string) ([]*model.ClinVarVariant, error) {
	index, ok := ClinVarVariantIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unsupported reference genome: %s", referenceGenome)
	}

	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": []map[string]any{
					{"term": map[string]any{"chrom": chrom}},
					{"range": map[string]any{
						"pos": map[string]any{
							"gte": start,
							"lte": stop,
						},
					}},
				},
			},
		},
		"_source": map[string]any{
			"includes": []string{"value"},
		},
		"sort": []map[string]any{
			{"pos": map[string]any{"order": "asc"}},
		},
		"size": 10000,
	}

	response, err := client.Search(ctx, index, query)
	if err != nil {
		return []*model.ClinVarVariant{}, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	// Create region context for transcript consequence selection
	context := FlagContext{
		Type: "region",
	}

	results := make([]*model.ClinVarVariant, 0, len(response.Hits.Hits))
	for _, hit := range response.Hits.Hits {
		variant, err := convertHitToClinVarVariantWithContext(hit, &context)
		if err != nil {
			continue // Skip invalid variants
		}
		results = append(results, variant)
	}

	return results, nil
}

// FetchClinVarVariantsByTranscript fetches ClinVar variants for a transcript
func FetchClinVarVariantsByTranscript(ctx context.Context, client *elastic.Client, transcriptID string, referenceGenome string) ([]*model.ClinVarVariant, error) {
	index, ok := ClinVarVariantIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unsupported reference genome: %s", referenceGenome)
	}

	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": map[string]any{
					"term": map[string]any{
						"transcript_id": transcriptID,
					},
				},
			},
		},
		"_source": map[string]any{
			"includes": []string{"value"},
		},
		"sort": []map[string]any{
			{"pos": map[string]any{"order": "asc"}},
		},
		"size": 10000,
	}

	response, err := client.Search(ctx, index, query)
	if err != nil {
		return []*model.ClinVarVariant{}, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	results := make([]*model.ClinVarVariant, 0, len(response.Hits.Hits))
	
	// Create transcript context for proper field extraction
	context := FlagContext{
		Type:         "transcript",
		TranscriptID: transcriptID,
	}
	
	for _, hit := range response.Hits.Hits {
		variant, err := convertHitToClinVarVariantWithContext(hit, &context)
		if err != nil {
			continue // Skip invalid variants
		}
		results = append(results, variant)
	}

	return results, nil
}

// convertHitToClinVarVariant converts an Elasticsearch hit to a ClinVarVariant model
func convertHitToClinVarVariant(hit elastic.Hit) (*model.ClinVarVariant, error) {
	// Use empty context for backward compatibility
	return convertHitToClinVarVariantWithContext(hit, nil)
}

// convertHitToClinVarVariantWithContext converts an Elasticsearch hit to a ClinVarVariant model with context
func convertHitToClinVarVariantWithContext(hit elastic.Hit, context *FlagContext) (*model.ClinVarVariant, error) {
	// Extract the 'value' field from _source
	value, ok := hit.Source["value"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("unexpected document structure: missing 'value' field")
	}

	// Convert to JSON and back to parse into our struct
	valueJSON, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal document: %w", err)
	}

	var doc ClinVarVariantDocument
	if err := json.Unmarshal(valueJSON, &doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal document: %w", err)
	}

	// Convert to GraphQL model
	result := &model.ClinVarVariant{
		VariantID:            doc.VariantID,
		ReferenceGenome:      mapReferenceGenome(doc.ReferenceGenome),
		Chrom:                doc.Chrom,
		Pos:                  doc.Pos,
		Ref:                  doc.Ref,
		Alt:                  doc.Alt,
		ClinicalSignificance: doc.ClinicalSignificance,
		ClinvarVariationID:   doc.ClinVarVariationID,
		GoldStars:            doc.GoldStars,
		ReviewStatus:         doc.ReviewStatus,
	}

	// Optional fields
	if doc.HGVSC != nil {
		result.Hgvsc = doc.HGVSC
	}
	if doc.HGVSP != nil {
		result.Hgvsp = doc.HGVSP
	}
	if doc.InGnomAD != nil {
		result.InGnomad = doc.InGnomAD
	}

	// Handle transcript consequences with context
	if context != nil && len(doc.TranscriptConsequences) > 0 {
		// Use GetConsequenceForContext to get the appropriate transcript consequence
		if consequence := GetConsequenceForContext(doc.TranscriptConsequences, *context); consequence != nil {
			// Extract major_consequence and transcript_id from the selected consequence
			if majorConsequence, ok := consequence["major_consequence"].(string); ok {
				result.MajorConsequence = &majorConsequence
			}
			if transcriptID, ok := consequence["transcript_id"].(string); ok {
				result.TranscriptID = &transcriptID
			}
		}
	} else {
		// Fall back to document-level fields for backward compatibility
		if doc.MajorConsequence != nil {
			result.MajorConsequence = doc.MajorConsequence
		}
		if doc.TranscriptID != nil {
			result.TranscriptID = doc.TranscriptID
		}
	}

	// Convert gnomAD data - always return structure with null fields when no data
	if doc.GnomAD != nil {
		result.Gnomad = convertClinVarGnomADData(doc.GnomAD)
	} else {
		result.Gnomad = &model.ClinVarVariantGnomadData{
			Exome:  nil,
			Genome: nil,
		}
	}

	return result, nil
}


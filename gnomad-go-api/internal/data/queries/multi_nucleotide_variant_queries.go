package queries

import (
	"context"
	"encoding/json"
	"fmt"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// Multi-nucleotide variant Elasticsearch index
const MNVVariantIndex = "gnomad_v2_mnvs"

// MNVDocument represents the ES document structure for multi-nucleotide variants
type MNVDocument struct {
	VariantID       string                          `json:"variant_id"`
	ReferenceGenome string                          `json:"reference_genome"`
	Chrom           string                          `json:"chrom"`
	Pos             int                             `json:"pos"`
	Ref             string                          `json:"ref"`
	Alt             string                          `json:"alt"`
	ConstituentSNVs []MNVConstituentSNVDoc          `json:"constituent_snvs"`
	Exome           *MNVSequencingDataDoc           `json:"exome"`
	Genome          *MNVSequencingDataDoc           `json:"genome"`
	Consequences    []MNVConsequenceDoc             `json:"consequences"`
	RelatedMNVs     []MNVSummaryDoc                 `json:"related_mnvs"`
}

// MNVConstituentSNVDoc represents a constituent SNV document
type MNVConstituentSNVDoc struct {
	VariantID string                    `json:"variant_id"`
	Exome     *MNVConstituentSNVSeqDoc  `json:"exome"`
	Genome    *MNVConstituentSNVSeqDoc  `json:"genome"`
}

// MNVConstituentSNVSeqDoc represents sequencing data for constituent SNVs
type MNVConstituentSNVSeqDoc struct {
	AC      *int       `json:"ac"`
	AN      *int       `json:"an"`
	Filters []string   `json:"filters"`
}

// MNVSequencingDataDoc represents sequencing data for the MNV
type MNVSequencingDataDoc struct {
	AC           *int  `json:"ac"`
	ACHom        *int  `json:"ac_hom"`
	NIndividuals *int  `json:"n_individuals"`
}

// MNVConsequenceDoc represents consequence data for the MNV
type MNVConsequenceDoc struct {
	GeneID           string                            `json:"gene_id"`
	GeneName         string                            `json:"gene_name"`
	TranscriptID     string                            `json:"transcript_id"`
	Category         *string                           `json:"category"`
	AminoAcids       string                            `json:"amino_acids"`
	Codons           string                            `json:"codons"`
	Consequence      string                            `json:"consequence"`
	SNVConsequences  []MNVConstituentSNVConsequenceDoc `json:"snv_consequences"`
}

// MNVConstituentSNVConsequenceDoc represents consequence data for constituent SNVs
type MNVConstituentSNVConsequenceDoc struct {
	VariantID   string `json:"variant_id"`
	AminoAcids  string `json:"amino_acids"`
	Codons      string `json:"codons"`
	Consequence string `json:"consequence"`
}

// MNVSummaryDoc represents related MNV summary data
type MNVSummaryDoc struct {
	VariantID string `json:"variant_id"`
}

// FetchMultiNucleotideVariant fetches a multi-nucleotide variant by ID and dataset
func FetchMultiNucleotideVariant(ctx context.Context, client *elastic.Client, variantID string, datasetID string) (*model.MultiNucleotideVariantDetails, error) {
	// MNVs are only available for gnomad_r2_1 dataset
	if datasetID != "gnomad_r2_1" {
		return nil, fmt.Errorf("multi-nucleotide variants are only available for gnomad_r2_1 dataset")
	}

	// Use search by ID to retrieve the document
	hit, err := client.SearchByID(ctx, MNVVariantIndex, "variant_id", variantID)
	if err != nil {
		return nil, fmt.Errorf("elasticsearch search failed: %w", err)
	}

	if hit == nil {
		return nil, nil // Not found
	}

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

	var doc MNVDocument
	if err := json.Unmarshal(valueJSON, &doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal document: %w", err)
	}

	// Convert to GraphQL model
	result := &model.MultiNucleotideVariantDetails{
		VariantID:       doc.VariantID,
		ReferenceGenome: mapReferenceGenome(doc.ReferenceGenome),
		Chrom:           doc.Chrom,
		Pos:             doc.Pos,
		Ref:             doc.Ref,
		Alt:             doc.Alt,
		ConstituentSnvs: convertConstituentSNVs(doc.ConstituentSNVs),
		Exome:           convertMNVSequencingData(doc.Exome),
		Genome:          convertMNVSequencingData(doc.Genome),
		Consequences:    convertMNVConsequences(doc.Consequences),
		RelatedMnvs:     convertRelatedMNVs(doc.RelatedMNVs),
	}

	return result, nil
}

// convertConstituentSNVs converts constituent SNV documents to GraphQL model
func convertConstituentSNVs(docs []MNVConstituentSNVDoc) []*model.MultiNucleotideVariantConstituentSnv {
	if docs == nil {
		return nil
	}

	result := make([]*model.MultiNucleotideVariantConstituentSnv, len(docs))
	for i, doc := range docs {
		result[i] = &model.MultiNucleotideVariantConstituentSnv{
			VariantID: doc.VariantID,
			Exome:     convertConstituentSNVSeqData(doc.Exome),
			Genome:    convertConstituentSNVSeqData(doc.Genome),
		}
	}
	return result
}

// convertConstituentSNVSeqData converts constituent SNV sequencing data
func convertConstituentSNVSeqData(doc *MNVConstituentSNVSeqDoc) *model.MultiNucleotideVariantConstituentSNVSequencingData {
	if doc == nil || doc.AC == nil {
		return nil
	}

	return &model.MultiNucleotideVariantConstituentSNVSequencingData{
		Ac:      doc.AC,
		An:      doc.AN,
		Filters: doc.Filters,
	}
}

// convertMNVSequencingData converts MNV sequencing data
func convertMNVSequencingData(doc *MNVSequencingDataDoc) *model.MultiNucleotideVariantDetailsSequencingData {
	if doc == nil || doc.AC == nil {
		return nil
	}

	return &model.MultiNucleotideVariantDetailsSequencingData{
		Ac:           doc.AC,
		AcHom:        doc.ACHom,
		NIndividuals: doc.NIndividuals,
	}
}

// convertMNVConsequences converts MNV consequences
func convertMNVConsequences(docs []MNVConsequenceDoc) []*model.MultiNucleotideVariantConsequence {
	if docs == nil {
		return nil
	}

	result := make([]*model.MultiNucleotideVariantConsequence, len(docs))
	for i, doc := range docs {
		result[i] = &model.MultiNucleotideVariantConsequence{
			GeneID:          doc.GeneID,
			GeneName:        doc.GeneName,
			TranscriptID:    doc.TranscriptID,
			Category:        doc.Category,
			AminoAcids:      doc.AminoAcids,
			Codons:          doc.Codons,
			Consequence:     doc.Consequence,
			SnvConsequences: convertSNVConsequences(doc.SNVConsequences),
		}
	}
	return result
}

// convertSNVConsequences converts SNV consequences
func convertSNVConsequences(docs []MNVConstituentSNVConsequenceDoc) []*model.MultiNucleotideVariantConstituentSNVConsequence {
	result := make([]*model.MultiNucleotideVariantConstituentSNVConsequence, len(docs))
	for i, doc := range docs {
		result[i] = &model.MultiNucleotideVariantConstituentSNVConsequence{
			VariantID:   doc.VariantID,
			AminoAcids:  doc.AminoAcids,
			Codons:      doc.Codons,
			Consequence: doc.Consequence,
		}
	}
	return result
}

// convertRelatedMNVs converts related MNVs
func convertRelatedMNVs(docs []MNVSummaryDoc) []*model.MultiNucleotideVariantSummary {
	result := make([]*model.MultiNucleotideVariantSummary, len(docs))
	for i, doc := range docs {
		result[i] = &model.MultiNucleotideVariantSummary{
			VariantID: doc.VariantID,
		}
	}
	return result
}
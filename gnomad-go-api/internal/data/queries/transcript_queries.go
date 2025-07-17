package queries

import (
	"context"
	"fmt"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"

	"github.com/mitchellh/mapstructure"
)

var transcriptIndices = map[string]string{
	"GRCh37": "transcripts_grch37",
	"GRCh38": "transcripts_grch38",
}

// TranscriptESDocument represents the Elasticsearch document structure for transcripts
type TranscriptESDocument struct {
	Value TranscriptDocumentValue `json:"value"`
}

type TranscriptDocumentValue struct {
	TranscriptID         string                  `json:"transcript_id" mapstructure:"transcript_id"`
	TranscriptVersion    string                  `json:"transcript_version" mapstructure:"transcript_version"`
	Chrom                string                  `json:"chrom" mapstructure:"chrom"`
	Start                int                     `json:"start" mapstructure:"start"`
	Stop                 int                     `json:"stop" mapstructure:"stop"`
	Exons                []ExonDocument          `json:"exons" mapstructure:"exons"`
	Strand               string                  `json:"strand" mapstructure:"strand"`
	GeneID               string                  `json:"gene_id" mapstructure:"gene_id"`
	Gene                 *TranscriptGeneDocument `json:"gene" mapstructure:"gene"`
	GtexTissueExpression map[string]float64      `json:"gtex_tissue_expression" mapstructure:"gtex_tissue_expression"`
	GnomadConstraint     *GnomadConstraintDoc    `json:"gnomad_constraint" mapstructure:"gnomad_constraint"`
	ExacConstraint       *ExacConstraintDoc      `json:"exac_constraint" mapstructure:"exac_constraint"`
}

type TranscriptGeneDocument struct {
	GeneID                string                  `json:"gene_id" mapstructure:"gene_id"`
	GeneVersion           string                  `json:"gene_version" mapstructure:"gene_version"`
	Symbol                string                  `json:"symbol" mapstructure:"symbol"`
	HgncID                *string                 `json:"hgnc_id" mapstructure:"hgnc_id"`
	NcbiID                *string                 `json:"ncbi_id" mapstructure:"ncbi_id"`
	OmimID                *string                 `json:"omim_id" mapstructure:"omim_id"`
	Name                  *string                 `json:"name" mapstructure:"name"`
	Chrom                 string                  `json:"chrom" mapstructure:"chrom"`
	Start                 int                     `json:"start" mapstructure:"start"`
	Stop                  int                     `json:"stop" mapstructure:"stop"`
	Strand                string                  `json:"strand" mapstructure:"strand"`
	Exons                 []ExonDocument          `json:"exons" mapstructure:"exons"`
	CanonicalTranscriptID *string                 `json:"canonical_transcript_id" mapstructure:"canonical_transcript_id"`
	Transcripts           []TranscriptDocument    `json:"transcripts" mapstructure:"transcripts"`
	ManeSelectTranscript  *ManeSelectDocument     `json:"mane_select_transcript" mapstructure:"mane_select_transcript"`
	Flags                 []string                `json:"flags" mapstructure:"flags"`
	Pext                  *TranscriptPextDocument `json:"pext" mapstructure:"pext"`
	GnomadConstraint      *GnomadConstraintDoc    `json:"gnomad_constraint" mapstructure:"gnomad_constraint"`
	ExacConstraint        *ExacConstraintDoc      `json:"exac_constraint" mapstructure:"exac_constraint"`
	// ExacRegionalMissenseConstraintRegions - to be implemented later
	// ExacRegionalMissenseConstraintRegions []*ExacRegionalMissenseConstraintRegionDoc `json:"exac_regional_missense_constraint_regions" mapstructure:"exac_regional_missense_constraint_regions"`
}

type GtexTissueDocument struct {
	Tissue string  `json:"tissue" mapstructure:"tissue"`
	Value  float64 `json:"value" mapstructure:"value"`
}

type TranscriptPextDocument struct {
	Regions []TranscriptPextRegionDocument `json:"regions" mapstructure:"regions"`
	Flags   []string                       `json:"flags" mapstructure:"flags"`
}

type TranscriptPextRegionDocument struct {
	Start   int                `json:"start" mapstructure:"start"`
	Stop    int                `json:"stop" mapstructure:"stop"`
	Mean    float64            `json:"mean" mapstructure:"mean"`
	Tissues map[string]float64 `json:"tissues" mapstructure:"tissues"`
}

// FetchTranscript fetches a transcript by ID and reference genome
func FetchTranscript(ctx context.Context, esClient *elastic.Client, transcriptID string, referenceGenome string) (*model.Transcript, error) {
	index, ok := transcriptIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unsupported reference genome: %s", referenceGenome)
	}

	// Use SearchByID to get the document (similar to genes.go pattern)
	hit, err := esClient.SearchByID(ctx, index, "transcript_id", transcriptID)
	if err != nil {
		return nil, fmt.Errorf("error fetching transcript %s: %w", transcriptID, err)
	}

	if hit == nil {
		return nil, nil // Not found
	}

	// Extract the source
	source := hit.Source

	// Extract the 'value' field from the source (since SearchByID filters to only include 'value')
	value, ok := source["value"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid document structure: missing 'value' field")
	}

	// Decode into our document value structure
	var docValue TranscriptDocumentValue
	if err := mapstructure.Decode(value, &docValue); err != nil {
		return nil, fmt.Errorf("error decoding document: %w", err)
	}

	// Create document wrapper
	transcriptDoc := TranscriptESDocument{Value: docValue}

	// Convert to GraphQL model
	transcript, err := convertTranscriptDocumentToModel(&transcriptDoc.Value, referenceGenome)
	if err != nil {
		return nil, fmt.Errorf("error converting transcript document: %w", err)
	}

	return transcript, nil
}

// convertTranscriptDocumentToModel converts an ES document to a GraphQL model
func convertTranscriptDocumentToModel(doc *TranscriptDocumentValue, referenceGenome string) (*model.Transcript, error) {
	// Convert reference genome string to enum
	var refGenome model.ReferenceGenomeID
	switch referenceGenome {
	case "GRCh37":
		refGenome = model.ReferenceGenomeIDGRCh37
	case "GRCh38":
		refGenome = model.ReferenceGenomeIDGRCh38
	default:
		return nil, fmt.Errorf("unsupported reference genome: %s", referenceGenome)
	}

	// Convert exons
	exons := make([]*model.Exon, len(doc.Exons))
	for i, exon := range doc.Exons {
		exons[i] = &model.Exon{
			FeatureType: exon.FeatureType,
			Start:       exon.Start,
			Stop:        exon.Stop,
		}
	}

	// Convert GTEx tissue expression (map format)
	var gtexTissues []*model.GtexTissue
	if doc.GtexTissueExpression != nil {
		gtexTissues = make([]*model.GtexTissue, 0, len(doc.GtexTissueExpression))
		for tissue, value := range doc.GtexTissueExpression {
			gtexTissues = append(gtexTissues, &model.GtexTissue{
				Tissue: tissue,
				Value:  value,
			})
		}
	}

	// Convert transcript gene
	var transcriptGene *model.TranscriptGene
	if doc.Gene != nil {
		var err error
		transcriptGene, err = convertTranscriptGeneDocumentToModel(doc.Gene, referenceGenome)
		if err != nil {
			return nil, fmt.Errorf("error converting transcript gene: %w", err)
		}
	}

	// Convert constraint data
	var gnomadConstraint *model.GnomadConstraint
	if doc.GnomadConstraint != nil {
		gnomadConstraint = &model.GnomadConstraint{
			ExpLof:     doc.GnomadConstraint.ExpLof,
			ExpMis:     doc.GnomadConstraint.ExpMis,
			ExpSyn:     doc.GnomadConstraint.ExpSyn,
			ObsLof:     doc.GnomadConstraint.ObsLof,
			ObsMis:     doc.GnomadConstraint.ObsMis,
			ObsSyn:     doc.GnomadConstraint.ObsSyn,
			OeLof:      doc.GnomadConstraint.OeLof,
			OeLofLower: doc.GnomadConstraint.OeLofLower,
			OeLofUpper: doc.GnomadConstraint.OeLofUpper,
			OeMis:      doc.GnomadConstraint.OeMis,
			OeMisLower: doc.GnomadConstraint.OeMisLower,
			OeMisUpper: doc.GnomadConstraint.OeMisUpper,
			OeSyn:      doc.GnomadConstraint.OeSyn,
			OeSynLower: doc.GnomadConstraint.OeSynLower,
			OeSynUpper: doc.GnomadConstraint.OeSynUpper,
			LofZ:       doc.GnomadConstraint.LofZ,
			MisZ:       doc.GnomadConstraint.MisZ,
			SynZ:       doc.GnomadConstraint.SynZ,
			Pli:        doc.GnomadConstraint.Pli,
			Flags:      doc.GnomadConstraint.Flags,
			PLi:        doc.GnomadConstraint.Pli, // Deprecated field
		}
	}

	// ExAC constraint is only available for GRCh37
	// For GRCh38, we set it to nil and let the resolver handle the error
	var exacConstraint *model.ExacConstraint
	if referenceGenome == "GRCh37" && doc.ExacConstraint != nil {
		exacConstraint = &model.ExacConstraint{
			ExpSyn: doc.ExacConstraint.ExpSyn,
			ExpMis: doc.ExacConstraint.ExpMis,
			ExpLof: doc.ExacConstraint.ExpLof,
			ObsSyn: doc.ExacConstraint.ObsSyn,
			ObsMis: doc.ExacConstraint.ObsMis,
			ObsLof: doc.ExacConstraint.ObsLof,
			MuSyn:  doc.ExacConstraint.MuSyn,
			MuMis:  doc.ExacConstraint.MuMis,
			MuLof:  doc.ExacConstraint.MuLof,
			SynZ:   doc.ExacConstraint.SynZ,
			MisZ:   doc.ExacConstraint.MisZ,
			LofZ:   doc.ExacConstraint.LofZ,
			Pli:    doc.ExacConstraint.Pli,
			PLi: func() float64 {
				if doc.ExacConstraint.Pli != nil {
					return *doc.ExacConstraint.Pli
				} else {
					return 0
				}
			}(), // Deprecated field
		}
	}

	return &model.Transcript{
		ReferenceGenome:      refGenome,
		TranscriptID:         doc.TranscriptID,
		TranscriptVersion:    doc.TranscriptVersion,
		Chrom:                doc.Chrom,
		Start:                doc.Start,
		Stop:                 doc.Stop,
		Exons:                exons,
		Strand:               doc.Strand,
		GeneID:               doc.GeneID,
		Gene:                 transcriptGene,
		GtexTissueExpression: gtexTissues,
		GnomadConstraint:     gnomadConstraint,
		ExacConstraint:       exacConstraint,
	}, nil
}

// convertTranscriptGeneDocumentToModel converts transcript gene document to model
func convertTranscriptGeneDocumentToModel(doc *TranscriptGeneDocument, referenceGenome string) (*model.TranscriptGene, error) {
	// Convert reference genome string to enum
	var refGenome model.ReferenceGenomeID
	switch referenceGenome {
	case "GRCh37":
		refGenome = model.ReferenceGenomeIDGRCh37
	case "GRCh38":
		refGenome = model.ReferenceGenomeIDGRCh38
	default:
		return nil, fmt.Errorf("unsupported reference genome: %s", referenceGenome)
	}

	// Convert exons
	exons := make([]*model.Exon, len(doc.Exons))
	for i, exon := range doc.Exons {
		exons[i] = &model.Exon{
			FeatureType: exon.FeatureType,
			Start:       exon.Start,
			Stop:        exon.Stop,
		}
	}

	// Convert transcripts
	transcripts := make([]*model.GeneTranscript, len(doc.Transcripts))
	for i, transcript := range doc.Transcripts {
		transcriptExons := make([]*model.Exon, len(transcript.Exons))
		for j, exon := range transcript.Exons {
			transcriptExons[j] = &model.Exon{
				FeatureType: exon.FeatureType,
				Start:       exon.Start,
				Stop:        exon.Stop,
			}
		}

		transcripts[i] = &model.GeneTranscript{
			ReferenceGenome:   refGenome,
			TranscriptID:      transcript.TranscriptID,
			TranscriptVersion: transcript.TranscriptVersion,
			Chrom:             transcript.Chrom,
			Start:             transcript.Start,
			Stop:              transcript.Stop,
			Exons:             transcriptExons,
			Strand:            transcript.Strand,
		}
	}

	// Convert MANE select transcript
	var maneSelect *model.ManeSelectTranscript
	if doc.ManeSelectTranscript != nil {
		maneSelect = &model.ManeSelectTranscript{
			EnsemblID:      doc.ManeSelectTranscript.EnsemblID,
			EnsemblVersion: doc.ManeSelectTranscript.EnsemblVersion,
			RefseqID:       doc.ManeSelectTranscript.RefseqID,
			RefseqVersion:  doc.ManeSelectTranscript.RefseqVersion,
		}
	}

	// Convert Pext (with map-based tissues)
	var pext *model.Pext
	if doc.Pext != nil {
		pextRegions := make([]*model.PextRegion, len(doc.Pext.Regions))
		for i, region := range doc.Pext.Regions {
			tissues := make([]*model.PextRegionTissue, 0, len(region.Tissues))
			for tissueKey, tissueValue := range region.Tissues {
				tissues = append(tissues, &model.PextRegionTissue{
					Tissue: &tissueKey,
					Value:  &tissueValue,
				})
			}
			pextRegions[i] = &model.PextRegion{
				Start:   region.Start,
				Stop:    region.Stop,
				Mean:    region.Mean,
				Tissues: tissues,
			}
		}
		pext = &model.Pext{
			Regions: pextRegions,
			Flags:   doc.Pext.Flags,
		}
	}

	// Convert constraint data
	var gnomadConstraint *model.GnomadConstraint
	if doc.GnomadConstraint != nil {
		gnomadConstraint = &model.GnomadConstraint{
			ExpLof:     doc.GnomadConstraint.ExpLof,
			ExpMis:     doc.GnomadConstraint.ExpMis,
			ExpSyn:     doc.GnomadConstraint.ExpSyn,
			ObsLof:     doc.GnomadConstraint.ObsLof,
			ObsMis:     doc.GnomadConstraint.ObsMis,
			ObsSyn:     doc.GnomadConstraint.ObsSyn,
			OeLof:      doc.GnomadConstraint.OeLof,
			OeLofLower: doc.GnomadConstraint.OeLofLower,
			OeLofUpper: doc.GnomadConstraint.OeLofUpper,
			OeMis:      doc.GnomadConstraint.OeMis,
			OeMisLower: doc.GnomadConstraint.OeMisLower,
			OeMisUpper: doc.GnomadConstraint.OeMisUpper,
			OeSyn:      doc.GnomadConstraint.OeSyn,
			OeSynLower: doc.GnomadConstraint.OeSynLower,
			OeSynUpper: doc.GnomadConstraint.OeSynUpper,
			LofZ:       doc.GnomadConstraint.LofZ,
			MisZ:       doc.GnomadConstraint.MisZ,
			SynZ:       doc.GnomadConstraint.SynZ,
			Pli:        doc.GnomadConstraint.Pli,
			Flags:      doc.GnomadConstraint.Flags,
			PLi:        doc.GnomadConstraint.Pli, // Deprecated field
		}
	}

	// ExAC constraint is only available for GRCh37
	var exacConstraint *model.ExacConstraint
	if referenceGenome == "GRCh37" && doc.ExacConstraint != nil {
		exacConstraint = &model.ExacConstraint{
			ExpSyn: doc.ExacConstraint.ExpSyn,
			ExpMis: doc.ExacConstraint.ExpMis,
			ExpLof: doc.ExacConstraint.ExpLof,
			ObsSyn: doc.ExacConstraint.ObsSyn,
			ObsMis: doc.ExacConstraint.ObsMis,
			ObsLof: doc.ExacConstraint.ObsLof,
			MuSyn:  doc.ExacConstraint.MuSyn,
			MuMis:  doc.ExacConstraint.MuMis,
			MuLof:  doc.ExacConstraint.MuLof,
			SynZ:   doc.ExacConstraint.SynZ,
			MisZ:   doc.ExacConstraint.MisZ,
			LofZ:   doc.ExacConstraint.LofZ,
			Pli:    doc.ExacConstraint.Pli,
			PLi: func() float64 {
				if doc.ExacConstraint.Pli != nil {
					return *doc.ExacConstraint.Pli
				} else {
					return 0
				}
			}(), // Deprecated field
		}
	}

	// Convert ExAC regional missense constraint regions - to be implemented later
	var exacRegionalConstraints []*model.ExacRegionalMissenseConstraintRegion

	return &model.TranscriptGene{
		ReferenceGenome:                       refGenome,
		GeneID:                                doc.GeneID,
		GeneVersion:                           doc.GeneVersion,
		Symbol:                                doc.Symbol,
		HgncID:                                doc.HgncID,
		NcbiID:                                doc.NcbiID,
		OmimID:                                doc.OmimID,
		Name:                                  doc.Name,
		Chrom:                                 doc.Chrom,
		Start:                                 doc.Start,
		Stop:                                  doc.Stop,
		Strand:                                doc.Strand,
		Exons:                                 exons,
		CanonicalTranscriptID:                 doc.CanonicalTranscriptID,
		Transcripts:                           transcripts,
		ManeSelectTranscript:                  maneSelect,
		Flags:                                 doc.Flags,
		Pext:                                  pext,
		GnomadConstraint:                      gnomadConstraint,
		ExacConstraint:                        exacConstraint,
		ExacRegionalMissenseConstraintRegions: exacRegionalConstraints,
	}, nil
}

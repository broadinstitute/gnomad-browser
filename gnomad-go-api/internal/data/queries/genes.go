package queries

import (
	"context"
	"fmt"
	"strings"

	"github.com/mitchellh/mapstructure"
	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

var geneIndices = map[string]string{
	"GRCh37": "genes_grch37",
	"GRCh38": "genes_grch38",
}

// GeneDocument represents the Elasticsearch document structure
type GeneDocument struct {
	Value GeneDocumentValue `json:"value"`
}

type GeneDocumentValue struct {
	GeneID                string               `json:"gene_id" mapstructure:"gene_id"`
	GeneVersion           string               `json:"gene_version" mapstructure:"gene_version"`
	Symbol                string               `json:"symbol" mapstructure:"symbol"`
	GencodeSymbol         string               `json:"gencode_symbol" mapstructure:"gencode_symbol"`
	HgncID                *string              `json:"hgnc_id" mapstructure:"hgnc_id"`
	NcbiID                *string              `json:"ncbi_id" mapstructure:"ncbi_id"`
	OmimID                *string              `json:"omim_id" mapstructure:"omim_id"`
	Name                  *string              `json:"name" mapstructure:"name"`
	Chrom                 string               `json:"chrom" mapstructure:"chrom"`
	Start                 int                  `json:"start" mapstructure:"start"`
	Stop                  int                  `json:"stop" mapstructure:"stop"`
	Strand                string               `json:"strand" mapstructure:"strand"`
	Exons                 []ExonDocument       `json:"exons" mapstructure:"exons"`
	Transcripts           []TranscriptDocument `json:"transcripts" mapstructure:"transcripts"`
	CanonicalTranscriptID *string              `json:"canonical_transcript_id" mapstructure:"canonical_transcript_id"`
	ManeSelectTranscript  *ManeSelectDocument  `json:"mane_select_transcript" mapstructure:"mane_select_transcript"`
	Flags                                       []string                                     `json:"flags" mapstructure:"flags"`
	Pext                                        *PextDocument                                `json:"pext" mapstructure:"pext"`
	GnomadConstraint                            *GnomadConstraintDoc                         `json:"gnomad_constraint" mapstructure:"gnomad_constraint"`
	GnomadV2RegionalMissenseConstraint          *GnomadV2RegionalMissenseConstraintDocument  `json:"gnomad_v2_regional_missense_constraint" mapstructure:"gnomad_v2_regional_missense_constraint"`
	ExacConstraint                              *ExacConstraintDoc                           `json:"exac_constraint" mapstructure:"exac_constraint"`
	ExacRegionalMissenseConstraintRegions       []*ExacRegionalMissenseConstraintRegionData  `json:"exac_regional_missense_constraint_regions" mapstructure:"exac_regional_missense_constraint_regions"`
	MitochondrialConstraint                     *MitochondrialConstraintDocument             `json:"mitochondrial_constraint" mapstructure:"mitochondrial_constraint"`
	MitochondrialMissenseConstraintRegions      []*MitochondrialRegionConstraintData         `json:"mitochondrial_missense_constraint_regions" mapstructure:"mitochondrial_missense_constraint_regions"`
}

type ExonDocument struct {
	FeatureType string `json:"feature_type" mapstructure:"feature_type"`
	Start       int    `json:"start" mapstructure:"start"`
	Stop        int    `json:"stop" mapstructure:"stop"`
}

type TranscriptDocument struct {
	TranscriptID      string         `json:"transcript_id" mapstructure:"transcript_id"`
	TranscriptVersion string         `json:"transcript_version" mapstructure:"transcript_version"`
	Chrom             string         `json:"chrom" mapstructure:"chrom"`
	Start             int            `json:"start" mapstructure:"start"`
	Stop              int            `json:"stop" mapstructure:"stop"`
	Exons             []ExonDocument `json:"exons" mapstructure:"exons"`
	Strand            string         `json:"strand" mapstructure:"strand"`
}

type ManeSelectDocument struct {
	EnsemblID      string `json:"ensembl_id" mapstructure:"ensembl_id"`
	EnsemblVersion string `json:"ensembl_version" mapstructure:"ensembl_version"`
	RefseqID       string `json:"refseq_id" mapstructure:"refseq_id"`
	RefseqVersion  string `json:"refseq_version" mapstructure:"refseq_version"`
}

type PextDocument struct {
	Regions []PextRegionDocument `json:"regions" mapstructure:"regions"`
	Flags   []string             `json:"flags" mapstructure:"flags"`
}

type PextRegionDocument struct {
	Start   int                        `json:"start" mapstructure:"start"`
	Stop    int                        `json:"stop" mapstructure:"stop"`
	Mean    float64                    `json:"mean" mapstructure:"mean"`
	Tissues []PextRegionTissueDocument `json:"tissues" mapstructure:"tissues"`
}

type PextRegionTissueDocument struct {
	Tissue *string  `json:"tissue" mapstructure:"tissue"`
	Value  *float64 `json:"value" mapstructure:"value"`
}

type GnomadConstraintDoc struct {
	ExpLof     *float64 `json:"exp_lof" mapstructure:"exp_lof"`
	ExpMis     float64  `json:"exp_mis" mapstructure:"exp_mis"`
	ExpSyn     *float64 `json:"exp_syn" mapstructure:"exp_syn"`
	ObsLof     *int     `json:"obs_lof" mapstructure:"obs_lof"`
	ObsMis     *int     `json:"obs_mis" mapstructure:"obs_mis"`
	ObsSyn     *int     `json:"obs_syn" mapstructure:"obs_syn"`
	OeLof      *float64 `json:"oe_lof" mapstructure:"oe_lof"`
	OeLofLower *float64 `json:"oe_lof_lower" mapstructure:"oe_lof_lower"`
	OeLofUpper *float64 `json:"oe_lof_upper" mapstructure:"oe_lof_upper"`
	OeMis      float64  `json:"oe_mis" mapstructure:"oe_mis"`
	OeMisLower *float64 `json:"oe_mis_lower" mapstructure:"oe_mis_lower"`
	OeMisUpper *float64 `json:"oe_mis_upper" mapstructure:"oe_mis_upper"`
	OeSyn      *float64 `json:"oe_syn" mapstructure:"oe_syn"`
	OeSynLower *float64 `json:"oe_syn_lower" mapstructure:"oe_syn_lower"`
	OeSynUpper *float64 `json:"oe_syn_upper" mapstructure:"oe_syn_upper"`
	LofZ       *float64 `json:"lof_z" mapstructure:"lof_z"`
	MisZ       float64  `json:"mis_z" mapstructure:"mis_z"`
	SynZ       float64  `json:"syn_z" mapstructure:"syn_z"`
	Pli        *float64 `json:"pli" mapstructure:"pli"`
	Flags      []string `json:"flags" mapstructure:"flags"`
}

type ExacConstraintDoc struct {
	ExpSyn *float64 `json:"exp_syn" mapstructure:"exp_syn"`
	ExpMis *float64 `json:"exp_mis" mapstructure:"exp_mis"`
	ExpLof *float64 `json:"exp_lof" mapstructure:"exp_lof"`
	ObsSyn *int     `json:"obs_syn" mapstructure:"obs_syn"`
	ObsMis *int     `json:"obs_mis" mapstructure:"obs_mis"`
	ObsLof *int     `json:"obs_lof" mapstructure:"obs_lof"`
	MuSyn  *float64 `json:"mu_syn" mapstructure:"mu_syn"`
	MuMis  *float64 `json:"mu_mis" mapstructure:"mu_mis"`
	MuLof  *float64 `json:"mu_lof" mapstructure:"mu_lof"`
	SynZ   float64  `json:"syn_z" mapstructure:"syn_z"`
	MisZ   float64  `json:"mis_z" mapstructure:"mis_z"`
	LofZ   *float64 `json:"lof_z" mapstructure:"lof_z"`
	Pli    *float64 `json:"pli" mapstructure:"pli"`
}


// FetchGeneByID fetches a gene by its ID from Elasticsearch
func FetchGeneByID(ctx context.Context, esClient *elastic.Client, geneID string, referenceGenome string) (*model.Gene, error) {
	index, ok := geneIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unknown reference genome: %s", referenceGenome)
	}

	// Use SearchByID to get the document
	hit, err := esClient.SearchByID(ctx, index, "gene_id", geneID)
	if err != nil {
		return nil, fmt.Errorf("error getting gene: %w", err)
	}

	if hit == nil {
		return nil, nil // Gene not found
	}

	// Extract the source
	source := hit.Source

	// Extract the 'value' field from the source (since SearchByID filters to only include 'value')
	value, ok := source["value"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid document structure: missing 'value' field")
	}

	// Decode into our document value structure
	var docValue GeneDocumentValue
	if err := mapstructure.Decode(value, &docValue); err != nil {
		return nil, fmt.Errorf("error decoding document: %w", err)
	}

	// Create document wrapper
	doc := GeneDocument{Value: docValue}

	// Convert to GraphQL type
	return convertGeneDocumentToGraphQL(&doc, referenceGenome), nil
}

// FetchGeneBySymbol fetches a gene by its symbol from Elasticsearch
func FetchGeneBySymbol(ctx context.Context, esClient *elastic.Client, geneSymbol string, referenceGenome string) (*model.Gene, error) {
	index, ok := geneIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unknown reference genome: %s", referenceGenome)
	}

	// Build the query
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"filter": map[string]interface{}{
					"term": map[string]interface{}{
						"symbol_upper_case": strings.ToUpper(geneSymbol),
					},
				},
			},
		},
		"size": 1,
	}

	// Execute the search
	response, err := esClient.Search(ctx, index, query)
	if err != nil {
		return nil, fmt.Errorf("error searching for gene: %w", err)
	}

	if len(response.Hits.Hits) == 0 {
		return nil, nil // Gene not found
	}

	// Get the first hit
	source := response.Hits.Hits[0].Source

	// Extract the 'value' field from the source
	value, ok := source["value"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid document structure: missing 'value' field")
	}

	// Decode into our document value structure
	var docValue GeneDocumentValue
	if err := mapstructure.Decode(value, &docValue); err != nil {
		return nil, fmt.Errorf("error decoding document: %w", err)
	}

	// Create document wrapper
	doc := GeneDocument{Value: docValue}

	// Convert to GraphQL type
	return convertGeneDocumentToGraphQL(&doc, referenceGenome), nil
}

// convertGeneDocumentToGraphQL converts an Elasticsearch document to a GraphQL Gene type
func convertGeneDocumentToGraphQL(doc *GeneDocument, referenceGenome string) *model.Gene {
	val := &doc.Value

	// Convert exons
	exons := make([]*model.Exon, len(val.Exons))
	for i, exon := range val.Exons {
		exons[i] = &model.Exon{
			FeatureType: exon.FeatureType,
			Start:       exon.Start,
			Stop:        exon.Stop,
		}
	}

	// Convert transcripts
	transcripts := make([]*model.GeneTranscript, len(val.Transcripts))
	for i, transcript := range val.Transcripts {
		transcriptExons := make([]*model.Exon, len(transcript.Exons))
		for j, exon := range transcript.Exons {
			transcriptExons[j] = &model.Exon{
				FeatureType: exon.FeatureType,
				Start:       exon.Start,
				Stop:        exon.Stop,
			}
		}

		// Fetch GTEx tissue expression for this transcript (only for GRCh37)
		var gtexTissueExpression []*model.GtexTissue
		if referenceGenome == "GRCh37" {
			// Note: For gene transcripts within gene documents, the tissue expression data 
			// is typically resolved via the transcript resolver for performance reasons
			gtexTissueExpression = nil // Will be resolved by the transcript resolver when queried
		}

		transcripts[i] = &model.GeneTranscript{
			ReferenceGenome:      model.ReferenceGenomeID(referenceGenome),
			TranscriptID:         transcript.TranscriptID,
			TranscriptVersion:    transcript.TranscriptVersion,
			Chrom:                transcript.Chrom,
			Start:                transcript.Start,
			Stop:                 transcript.Stop,
			Exons:                transcriptExons,
			Strand:               transcript.Strand,
			GtexTissueExpression: gtexTissueExpression,
		}
	}

	// Convert MANE select transcript
	var maneSelect *model.ManeSelectTranscript
	if val.ManeSelectTranscript != nil {
		maneSelect = &model.ManeSelectTranscript{
			EnsemblID:      val.ManeSelectTranscript.EnsemblID,
			EnsemblVersion: val.ManeSelectTranscript.EnsemblVersion,
			RefseqID:       val.ManeSelectTranscript.RefseqID,
			RefseqVersion:  val.ManeSelectTranscript.RefseqVersion,
		}
	}

	// Convert Pext
	var pext *model.Pext
	if val.Pext != nil {
		regions := make([]*model.PextRegion, len(val.Pext.Regions))
		for i, region := range val.Pext.Regions {
			tissues := make([]*model.PextRegionTissue, len(region.Tissues))
			for j, tissue := range region.Tissues {
				tissues[j] = &model.PextRegionTissue{
					Tissue: tissue.Tissue,
					Value:  tissue.Value,
				}
			}
			regions[i] = &model.PextRegion{
				Start:   region.Start,
				Stop:    region.Stop,
				Mean:    region.Mean,
				Tissues: tissues,
			}
		}
		pext = &model.Pext{
			Regions: regions,
			Flags:   val.Pext.Flags,
		}
	}

	// Convert gnomAD constraint
	var gnomadConstraint *model.GnomadConstraint
	if val.GnomadConstraint != nil {
		gnomadConstraint = &model.GnomadConstraint{
			ExpLof:     val.GnomadConstraint.ExpLof,
			ExpMis:     val.GnomadConstraint.ExpMis,
			ExpSyn:     val.GnomadConstraint.ExpSyn,
			ObsLof:     val.GnomadConstraint.ObsLof,
			ObsMis:     val.GnomadConstraint.ObsMis,
			ObsSyn:     val.GnomadConstraint.ObsSyn,
			OeLof:      val.GnomadConstraint.OeLof,
			OeLofLower: val.GnomadConstraint.OeLofLower,
			OeLofUpper: val.GnomadConstraint.OeLofUpper,
			OeMis:      val.GnomadConstraint.OeMis,
			OeMisLower: val.GnomadConstraint.OeMisLower,
			OeMisUpper: val.GnomadConstraint.OeMisUpper,
			OeSyn:      val.GnomadConstraint.OeSyn,
			OeSynLower: val.GnomadConstraint.OeSynLower,
			OeSynUpper: val.GnomadConstraint.OeSynUpper,
			LofZ:       val.GnomadConstraint.LofZ,
			MisZ:       val.GnomadConstraint.MisZ,
			SynZ:       val.GnomadConstraint.SynZ,
			Pli:        val.GnomadConstraint.Pli,
			Flags:      val.GnomadConstraint.Flags,
			PLi:        val.GnomadConstraint.Pli, // Deprecated field
		}
	}

	// Convert ExAC constraint
	var exacConstraint *model.ExacConstraint
	if val.ExacConstraint != nil {
		exacConstraint = &model.ExacConstraint{
			ExpSyn: val.ExacConstraint.ExpSyn,
			ExpMis: val.ExacConstraint.ExpMis,
			ExpLof: val.ExacConstraint.ExpLof,
			ObsSyn: val.ExacConstraint.ObsSyn,
			ObsMis: val.ExacConstraint.ObsMis,
			ObsLof: val.ExacConstraint.ObsLof,
			MuSyn:  val.ExacConstraint.MuSyn,
			MuMis:  val.ExacConstraint.MuMis,
			MuLof:  val.ExacConstraint.MuLof,
			SynZ:   val.ExacConstraint.SynZ,
			MisZ:   val.ExacConstraint.MisZ,
			LofZ:   val.ExacConstraint.LofZ,
			Pli:    val.ExacConstraint.Pli,
			PLi: func() float64 {
				if val.ExacConstraint.Pli != nil {
					return *val.ExacConstraint.Pli
				} else {
					return 0
				}
			}(), // Deprecated field
		}
	}

	// Initialize empty cooccurrence counts as default
	hetCounts := []*model.HeterozygousVariantCooccurrenceCounts{}
	homCounts := []*model.HomozygousVariantCooccurrenceCounts{}

	return &model.Gene{
		ReferenceGenome:                        model.ReferenceGenomeID(referenceGenome),
		GeneID:                                 val.GeneID,
		GeneVersion:                            val.GeneVersion,
		Symbol:                                 val.Symbol,
		GencodeSymbol:                          val.GencodeSymbol,
		HgncID:                                 val.HgncID,
		NcbiID:                                 val.NcbiID,
		OmimID:                                 val.OmimID,
		Name:                                   val.Name,
		Chrom:                                  val.Chrom,
		Start:                                  val.Start,
		Stop:                                   val.Stop,
		Strand:                                 val.Strand,
		Exons:                                  exons,
		Transcripts:                            transcripts,
		CanonicalTranscriptID:                  val.CanonicalTranscriptID,
		ManeSelectTranscript:                   maneSelect,
		Flags:                                  val.Flags,
		Pext:                                   pext,
		GnomadConstraint:                       gnomadConstraint,
		GnomadV2RegionalMissenseConstraint:     ConvertGnomadV2RegionalMissenseConstraint(val.GnomadV2RegionalMissenseConstraint),
		ExacConstraint:                         exacConstraint,
		ExacRegionalMissenseConstraintRegions:  ConvertExacRegionalMissenseConstraintRegions(val.ExacRegionalMissenseConstraintRegions),
		MitochondrialConstraint:                ConvertMitochondrialConstraintDoc(val.MitochondrialConstraint),
		MitochondrialMissenseConstraintRegions: ConvertMitochondrialRegionConstraints(val.MitochondrialMissenseConstraintRegions),
		HeterozygousVariantCooccurrenceCounts:  hetCounts,
		HomozygousVariantCooccurrenceCounts:    homCounts,
	}
}

// FetchGenesMatchingText searches for genes matching a text query
func FetchGenesMatchingText(ctx context.Context, esClient *elastic.Client, query string, referenceGenome string) ([]*model.GeneSearchResult, error) {
	index, ok := geneIndices[referenceGenome]
	if !ok {
		return nil, fmt.Errorf("unknown reference genome: %s", referenceGenome)
	}

	upperCaseQuery := strings.ToUpper(query)

	// Check if it's an Ensembl ID
	if strings.HasPrefix(upperCaseQuery, "ENSG") && len(upperCaseQuery) == 15 {
		gene, err := FetchGeneByID(ctx, esClient, upperCaseQuery, referenceGenome)
		if err != nil {
			return nil, err
		}
		if gene != nil {
			return []*model.GeneSearchResult{
				{
					EnsemblID: gene.GeneID,
					Symbol:    &gene.Symbol,
				},
			}, nil
		}
		return []*model.GeneSearchResult{}, nil
	}

	// Search by symbol or prefix
	searchQuery := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"should": []interface{}{
					map[string]interface{}{
						"term": map[string]interface{}{
							"symbol_upper_case": upperCaseQuery,
						},
					},
					map[string]interface{}{
						"prefix": map[string]interface{}{
							"search_terms": upperCaseQuery,
						},
					},
				},
			},
		},
		"_source": []string{"gene_id", "value.gene_version", "value.symbol"},
		"size":    5,
	}

	// Execute the search
	response, err := esClient.Search(ctx, index, searchQuery)
	if err != nil {
		return nil, fmt.Errorf("error searching for genes: %w", err)
	}

	// Convert results
	results := make([]*model.GeneSearchResult, len(response.Hits.Hits))
	for i, hit := range response.Hits.Hits {
		source := hit.Source

		geneID, _ := source["gene_id"].(string)
		var symbol *string
		var version *string

		if value, ok := source["value"].(map[string]interface{}); ok {
			if s, ok := value["symbol"].(string); ok {
				symbol = &s
			}
			if v, ok := value["gene_version"].(string); ok {
				version = &v
			}
		}

		results[i] = &model.GeneSearchResult{
			EnsemblID: geneID,
			EnsemblVersion: func() string {
				if version != nil {
					return *version
				} else {
					return ""
				}
			}(),
			Symbol: symbol,
		}
	}

	return results, nil
}


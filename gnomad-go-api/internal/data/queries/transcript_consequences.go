package queries

import (
	"strings"

	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// GetConsequenceForContext returns the appropriate transcript consequence based on context
func GetConsequenceForContext(consequences []map[string]interface{}, context FlagContext) map[string]interface{} {
	if len(consequences) == 0 {
		return nil
	}

	switch context.Type {
	case "gene":
		// Find consequence for specific gene
		for _, csq := range consequences {
			if geneID, ok := csq["gene_id"].(string); ok && geneID == context.GeneID {
				return csq
			}
		}
		return nil

	case "transcript":
		// Find consequence for specific transcript
		for _, csq := range consequences {
			if transcriptID, ok := csq["transcript_id"].(string); ok && transcriptID == context.TranscriptID {
				return csq
			}
		}
		return nil

	case "region":
		// Return most severe consequence (first in list)
		return consequences[0]

	default:
		return nil
	}
}

// FilterTranscriptConsequencesByGene filters transcript consequences for a specific gene
func FilterTranscriptConsequencesByGene(consequences []map[string]interface{}, geneID string) []map[string]interface{} {
	var filtered []map[string]interface{}

	for _, csq := range consequences {
		if csqGeneID, ok := csq["gene_id"].(string); ok && csqGeneID == geneID {
			filtered = append(filtered, csq)
		}
	}

	return filtered
}

// FilterTranscriptConsequencesByTranscript filters transcript consequences for a specific transcript
func FilterTranscriptConsequencesByTranscript(consequences []map[string]interface{}, transcriptID string) []map[string]interface{} {
	var filtered []map[string]interface{}

	for _, csq := range consequences {
		if csqTranscriptID, ok := csq["transcript_id"].(string); ok && csqTranscriptID == transcriptID {
			filtered = append(filtered, csq)
		}
	}

	return filtered
}

// ShapeTranscriptConsequences converts raw transcript consequence data to GraphQL model
func ShapeTranscriptConsequences(consequences []map[string]interface{}, options TranscriptConsequenceOptions) []*model.TranscriptConsequence {
	if len(consequences) == 0 {
		return nil
	}

	var result []*model.TranscriptConsequence

	for _, csq := range consequences {
		// Filter based on options
		if options.IncludeENSEMBLOnly {
			geneID, _ := csq["gene_id"].(string)
			if !strings.HasPrefix(geneID, "ENSG") {
				continue
			}
		}

		tc := shapeTranscriptConsequence(csq)
		if tc != nil {
			result = append(result, tc)
		}
	}

	return result
}

// TranscriptConsequenceOptions controls how transcript consequences are shaped
type TranscriptConsequenceOptions struct {
	IncludeENSEMBLOnly bool // Only include ENSEMBL transcripts (filter out RefSeq)
}

// shapeTranscriptConsequence converts a single raw transcript consequence to GraphQL model
func shapeTranscriptConsequence(csq map[string]interface{}) *model.TranscriptConsequence {
	tc := &model.TranscriptConsequence{
		MajorConsequence:    toStringPtr(csq["major_consequence"]),
		ConsequenceTerms:    toStringSlice(csq["consequence_terms"]),
		GeneID:              toString(csq["gene_id"]),
		GeneSymbol:          toStringPtr(csq["gene_symbol"]),
		TranscriptID:        toString(csq["transcript_id"]),
		TranscriptVersion:   toStringPtr(csq["transcript_version"]),
		Hgvsc:               toStringPtr(csq["hgvsc"]),
		Hgvsp:               toStringPtr(csq["hgvsp"]),
		IsCanonical:         toBoolPtr(csq["canonical"]),
		IsManeSelect:        toBoolPtr(csq["mane_select"]),
		IsManeSelectVersion: toBoolPtr(csq["mane_select_version"]),
		RefseqID:            toStringPtr(csq["refseq_id"]),
		RefseqVersion:       toStringPtr(csq["refseq_version"]),
		Lof:                 toStringPtr(csq["lof"]),
		LofFilter:           toStringPtr(csq["lof_filter"]),
		LofFlags:            toStringPtr(csq["lof_flags"]),
	}

	// Add additional fields specific to certain datasets
	if biotype, ok := csq["biotype"].(string); ok {
		tc.Biotype = &biotype
	}

	if siftPrediction, ok := csq["sift_prediction"].(string); ok {
		tc.SiftPrediction = &siftPrediction
	}

	if polyphenPrediction, ok := csq["polyphen_prediction"].(string); ok {
		tc.PolyphenPrediction = &polyphenPrediction
	}

	return tc
}

// GetMostSevereConsequence returns the most severe transcript consequence (first in list)
func GetMostSevereConsequence(consequences []map[string]interface{}) map[string]interface{} {
	if len(consequences) == 0 {
		return nil
	}
	return consequences[0]
}

// GetConsequencesByGeneAndTranscript groups consequences by gene and transcript
func GetConsequencesByGeneAndTranscript(consequences []map[string]interface{}) map[string]map[string][]map[string]interface{} {
	result := make(map[string]map[string][]map[string]interface{})

	for _, csq := range consequences {
		geneID, _ := csq["gene_id"].(string)
		transcriptID, _ := csq["transcript_id"].(string)

		if geneID == "" || transcriptID == "" {
			continue
		}

		if _, ok := result[geneID]; !ok {
			result[geneID] = make(map[string][]map[string]interface{})
		}

		result[geneID][transcriptID] = append(result[geneID][transcriptID], csq)
	}

	return result
}

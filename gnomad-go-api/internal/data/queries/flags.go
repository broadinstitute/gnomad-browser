package queries

// FlagContext represents the context in which flags are being requested
type FlagContext struct {
	Type         string // "gene", "region", or "transcript"
	GeneID       string // Only used for gene context
	TranscriptID string // Only used for transcript context
}

// LOF consequence terms that indicate loss of function
var lofConsequenceTerms = map[string]bool{
	"transcript_ablation":     true,
	"splice_acceptor_variant": true,
	"splice_donor_variant":    true,
	"stop_gained":             true,
	"frameshift_variant":      true,
}

// GetFlagsForContext returns flags for a variant based on the query context
func GetFlagsForContext(variant map[string]interface{}, context FlagContext, subset string) []string {
	baseFlags := getBaseVariantFlags(variant, context)
	regionalFlags := getRegionalFlags(variant, subset)

	// Combine flags
	flags := make([]string, 0, len(baseFlags)+len(regionalFlags))
	flags = append(flags, baseFlags...)
	flags = append(flags, regionalFlags...)

	// Add subset-specific flags
	if subset != "all" && subset != "" {
		subsetFlags := getSubsetSpecificFlags(variant, subset)
		flags = append(flags, subsetFlags...)
	}

	return uniqueStrings(flags)
}

// getBaseVariantFlags gets LOFTEE and transcript-related flags based on context
func getBaseVariantFlags(variant map[string]interface{}, context FlagContext) []string {
	// Start with any existing flags on the variant
	var flags []string
	if existingFlags, ok := variant["flags"].([]string); ok {
		flags = append(flags, existingFlags...)
	}

	// Get transcript consequences
	consequences, ok := variant["transcript_consequences"].([]map[string]interface{})
	if !ok {
		return flags
	}

	switch context.Type {
	case "gene":
		return getLofteeFlagsForGeneContext(flags, consequences, context.GeneID)
	case "transcript":
		return getLofteeFlagsForTranscriptContext(flags, consequences, context.TranscriptID)
	case "region":
		return getLofteeFlagsForRegionContext(flags, consequences)
	default:
		return flags
	}
}

// getLofteeFlagsForGeneContext gets LOFTEE flags for gene context
func getLofteeFlagsForGeneContext(baseFlags []string, consequences []map[string]interface{}, geneID string) []string {
	flags := append([]string{}, baseFlags...)

	// Filter consequences for this gene
	var consequencesInGene []map[string]interface{}
	for _, csq := range consequences {
		if csqGeneID, ok := csq["gene_id"].(string); ok && csqGeneID == geneID {
			consequencesInGene = append(consequencesInGene, csq)
		}
	}

	if len(consequencesInGene) == 0 {
		return flags
	}

	// Get LOF consequences in gene
	var lofConsequencesInGene []map[string]interface{}
	for _, csq := range consequencesInGene {
		if lof, ok := csq["lof"].(string); ok && lof != "" {
			lofConsequencesInGene = append(lofConsequencesInGene, csq)
		} else if lofFlags, ok := csq["lof_flags"].(string); ok && lofFlags != "" {
			// Also include consequences with lof_flags but no lof field
			lofConsequencesInGene = append(lofConsequencesInGene, csq)
		}
	}

	mostSevereConsequenceInGene := consequencesInGene[0]

	// Check for LC LOF
	if len(lofConsequencesInGene) > 0 {
		hasHC := false
		for _, csq := range lofConsequencesInGene {
			if lof, ok := csq["lof"].(string); ok && lof == "HC" {
				hasHC = true
				break
			}
		}

		// Check if most severe consequence has LOF and is not OS
		if !hasHC {
			if lof, ok := mostSevereConsequenceInGene["lof"].(string); ok && lof != "" && lof != "OS" {
				flags = append(flags, "lc_lof")
			}
		}

		// Check if any consequence in gene has lof_flags
		hasLofFlags := false
		for _, csq := range consequencesInGene {
			if lofFlags, ok := csq["lof_flags"].(string); ok && lofFlags != "" {
				hasLofFlags = true
				break
			}
		}
		if hasLofFlags {
			flags = append(flags, "lof_flag")
		}
	}

	// Check for non-coding transcript in any consequence in gene
	for _, csq := range consequencesInGene {
		if isLofOnNonCodingTranscript(csq) {
			flags = append(flags, "nc_transcript")
			break
		}
	}

	// Check for OS LOF
	if lof, ok := mostSevereConsequenceInGene["lof"].(string); ok && lof == "OS" {
		flags = append(flags, "os_lof")
	}

	return flags
}

// getLofteeFlagsForTranscriptContext gets LOFTEE flags for transcript context
func getLofteeFlagsForTranscriptContext(baseFlags []string, consequences []map[string]interface{}, transcriptID string) []string {
	flags := append([]string{}, baseFlags...)

	// Find consequence for this transcript
	var consequenceInTranscript map[string]interface{}
	for _, csq := range consequences {
		if csqTranscriptID, ok := csq["transcript_id"].(string); ok && csqTranscriptID == transcriptID {
			consequenceInTranscript = csq
			break
		}
	}

	if consequenceInTranscript == nil {
		return flags
	}

	// Check LOF status
	if lof, ok := consequenceInTranscript["lof"].(string); ok {
		switch lof {
		case "LC":
			flags = append(flags, "lc_lof")
		case "OS":
			flags = append(flags, "os_lof")
		}

		// Check for LOF flags
		if lof != "" {
			if lofFlags, ok := consequenceInTranscript["lof_flags"].(string); ok && lofFlags != "" {
				flags = append(flags, "lof_flag")
			}
		}
	}

	// Check for non-coding transcript
	if isLofOnNonCodingTranscript(consequenceInTranscript) {
		flags = append(flags, "nc_transcript")
	}

	return flags
}

// getLofteeFlagsForRegionContext gets LOFTEE flags for region context
func getLofteeFlagsForRegionContext(baseFlags []string, consequences []map[string]interface{}) []string {
	flags := append([]string{}, baseFlags...)

	if len(consequences) == 0 {
		return flags
	}

	// Get LOF consequences
	var lofConsequences []map[string]interface{}
	for _, csq := range consequences {
		if lof, ok := csq["lof"].(string); ok && lof != "" {
			lofConsequences = append(lofConsequences, csq)
		}
	}

	mostSevereConsequence := consequences[0]

	// Check for LC LOF
	if len(lofConsequences) > 0 {
		hasHC := false
		for _, csq := range lofConsequences {
			if lof, ok := csq["lof"].(string); ok && lof == "HC" {
				hasHC = true
				break
			}
		}

		// Check if most severe consequence has LOF and is not OS
		if !hasHC {
			if lof, ok := mostSevereConsequence["lof"].(string); ok && lof != "" && lof != "OS" {
				flags = append(flags, "lc_lof")
			}
		}

		// Check if all LOF consequences have flags
		allHaveFlags := true
		for _, csq := range lofConsequences {
			if lofFlags, ok := csq["lof_flags"].(string); !ok || lofFlags == "" {
				allHaveFlags = false
				break
			}
		}
		if allHaveFlags && len(lofConsequences) > 0 {
			flags = append(flags, "lof_flag")
		}
	}

	// Check for non-coding transcript
	if isLofOnNonCodingTranscript(mostSevereConsequence) {
		flags = append(flags, "nc_transcript")
	}

	// Check for OS LOF
	if lof, ok := mostSevereConsequence["lof"].(string); ok && lof == "OS" {
		flags = append(flags, "os_lof")
	}

	return flags
}

// isLofOnNonCodingTranscript checks if a consequence is LOF on a non-coding transcript
func isLofOnNonCodingTranscript(consequence map[string]interface{}) bool {
	majorConsequence, hasMajor := consequence["major_consequence"].(string)
	lof, hasLof := consequence["lof"].(string)
	biotype, hasBiotype := consequence["biotype"].(string)

	// If it has a LOF consequence term but no LOFTEE annotation, it's likely non-coding
	if hasMajor && lofConsequenceTerms[majorConsequence] && (!hasLof || lof == "") {
		return true
	}

	// Also check if biotype indicates non-coding transcript
	if hasBiotype && biotype == "nonsense_mediated_decay" && (!hasLof || lof == "") {
		return true
	}

	return false
}

// getRegionalFlags extracts regional flags from exome/genome data
func getRegionalFlags(variant map[string]interface{}, subset string) []string {
	regionalFlagNames := []string{"par", "segdup", "lcr"}
	flagMap := make(map[string]bool)

	// Check exome flags
	if exome, ok := variant["exome"].(map[string]interface{}); ok {
		addRegionalFlagsFromSequenceData(exome, subset, regionalFlagNames, flagMap)
	}

	// Check genome flags
	if genome, ok := variant["genome"].(map[string]interface{}); ok {
		// Genome always uses "all" subset
		addRegionalFlagsFromSequenceData(genome, "all", regionalFlagNames, flagMap)
	}

	// Convert map to slice
	var flags []string
	for flag := range flagMap {
		flags = append(flags, flag)
	}

	return flags
}

// addRegionalFlagsFromSequenceData adds regional flags from sequence data to flag map
func addRegionalFlagsFromSequenceData(seqData map[string]interface{}, subset string, regionalFlags []string, flagMap map[string]bool) {
	freq, hasFreq := seqData["freq"].(map[string]interface{})
	if !hasFreq {
		return
	}

	// Get frequency data for subset
	var freqData map[string]interface{}
	if subset == "" || subset == "all" {
		freqData, _ = freq["all"].(map[string]interface{})
	} else {
		freqData, _ = freq[subset].(map[string]interface{})
	}

	if freqData == nil {
		return
	}

	// Check filters
	if filters, ok := freqData["filters"].([]interface{}); ok {
		for _, filter := range filters {
			if filterStr, ok := filter.(string); ok {
				for _, regionalFlag := range regionalFlags {
					if filterStr == regionalFlag {
						flagMap[regionalFlag] = true
					}
				}
			}
		}
	}
}

// getSubsetSpecificFlags gets flags specific to non-"all" subsets
func getSubsetSpecificFlags(variant map[string]interface{}, subset string) []string {
	var flags []string

	// Check for AC discrepancies between joint and exome+genome
	joint, hasJoint := variant["joint"].(map[string]interface{})
	exome, hasExome := variant["exome"].(map[string]interface{})
	genome, hasGenome := variant["genome"].(map[string]interface{})

	if !hasJoint || !hasExome || !hasGenome {
		return flags
	}

	// Get joint AC for subset
	jointAC := getACFromSequenceData(joint, subset)

	// Get exome AC for subset
	exomeAC := getACFromSequenceData(exome, subset)

	// Get genome AC (always "all")
	genomeAC := getACFromSequenceData(genome, "all")

	// Check for discrepancy
	if jointAC >= 0 && exomeAC >= 0 && genomeAC >= 0 {
		if jointAC != (exomeAC + genomeAC) {
			flags = append(flags, "discrepant_ac")
		}
	}

	return flags
}

// getACFromSequenceData gets AC value from sequence data for a subset
func getACFromSequenceData(seqData map[string]interface{}, subset string) int {
	freq, ok := seqData["freq"].(map[string]interface{})
	if !ok {
		return -1
	}

	freqData, ok := freq[subset].(map[string]interface{})
	if !ok {
		return -1
	}

	ac, ok := freqData["ac"].(float64)
	if !ok {
		return -1
	}

	return int(ac)
}

// Helper function to get unique strings
func uniqueStrings(strings []string) []string {
	if len(strings) == 0 {
		return []string{}
	}

	seen := make(map[string]bool)
	var result []string

	for _, s := range strings {
		if !seen[s] {
			seen[s] = true
			result = append(result, s)
		}
	}

	if result == nil {
		return []string{}
	}
	return result
}

// Helper function to check if a string slice contains a value
func contains(slice []string, value string) bool {
	for _, v := range slice {
		if v == value {
			return true
		}
	}
	return false
}

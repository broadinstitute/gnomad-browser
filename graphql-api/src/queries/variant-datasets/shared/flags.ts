const LOF_CONSEQUENCE_TERMS = new Set([
  'transcript_ablation',
  'splice_acceptor_variant',
  'splice_donor_variant',
  'stop_gained',
  'frameshift_variant',
])

const isLofOnNonCodingTranscript = (transcriptConsequence: any) =>
  LOF_CONSEQUENCE_TERMS.has(transcriptConsequence.major_consequence) && !transcriptConsequence.lof

const getFlagsForGeneContext = (variant: any, geneId: any) => {
  const flags = variant.flags || []

  const allConsequences = variant.transcript_consequences || []
  const consequencesInGene = allConsequences.filter((csq: any) => csq.gene_id === geneId)
  const lofConsequencesInGene = consequencesInGene.filter((csq: any) => csq.lof)
  const mostSevereConsequenceInGene = consequencesInGene[0]

  if (lofConsequencesInGene.length > 0) {
    // In some cases, a coding transcript with a non-pLoF VEP annotation may be ranked higher
    // than a non-coding transcript with a pLoF VEP annotation. LOFTEE does not annotate
    // non-coding transcripts. Check for mostSevereConsequenceInGene.lof to avoid showing an
    // LC pLoF flag next to a non-pLoF VEP consequence.
    if (
      !lofConsequencesInGene.some((csq: any) => csq.lof === 'HC') &&
      mostSevereConsequenceInGene.lof &&
      mostSevereConsequenceInGene.lof !== 'OS'
    ) {
      flags.push('lc_lof')
    }

    if (lofConsequencesInGene.every((csq: any) => csq.lof_flags)) {
      flags.push('lof_flag')
    }
  }

  if (mostSevereConsequenceInGene) {
    // See https://github.com/broadinstitute/gnomad-browser/issues/364
    if (isLofOnNonCodingTranscript(mostSevereConsequenceInGene)) {
      flags.push('nc_transcript')
    }
    if (mostSevereConsequenceInGene.lof === 'OS') {
      flags.push('os_lof')
    }
  }

  return flags
}

const getFlagsForRegionContext = (variant: any) => {
  const flags = variant.flags || []

  const allConsequences = variant.transcript_consequences || []
  const lofConsequences = allConsequences.filter((csq: any) => csq.lof)
  const mostSevereConsequence = allConsequences[0]

  if (lofConsequences.length > 0) {
    // In some cases, a coding transcript with a non-pLoF VEP annotation may be ranked higher
    // than a non-coding transcript with a pLoF VEP annotation. LOFTEE does not annotate
    // non-coding transcripts. Check for mostSevereConsequence.lof to avoid showing an
    // LC pLoF flag next to a non-pLoF VEP consequence.
    if (
      !lofConsequences.some((csq: any) => csq.lof === 'HC') &&
      mostSevereConsequence.lof &&
      mostSevereConsequence.lof !== 'OS'
    ) {
      flags.push('lc_lof')
    }

    if (lofConsequences.every((csq: any) => csq.lof_flags)) {
      flags.push('lof_flag')
    }
  }

  if (mostSevereConsequence) {
    if (isLofOnNonCodingTranscript(mostSevereConsequence)) {
      flags.push('nc_transcript')
    }
    if (mostSevereConsequence.lof === 'OS') {
      flags.push('os_lof')
    }
  }

  return flags
}

const getFlagsForTranscriptContext = (variant: any, transcriptId: any) => {
  const flags = variant.flags || []

  const allConsequences = variant.transcript_consequences || []
  const consequenceInTranscript = allConsequences.find(
    (csq: any) => csq.transcript_id === transcriptId
  )

  if (consequenceInTranscript) {
    if (consequenceInTranscript.lof === 'LC') {
      flags.push('lc_lof')
    }

    if (consequenceInTranscript.lof === 'OS') {
      flags.push('os_lof')
    }

    if (consequenceInTranscript.lof && consequenceInTranscript.lof_flags) {
      flags.push('lof_flag')
    }

    if (isLofOnNonCodingTranscript(consequenceInTranscript)) {
      flags.push('nc_transcript')
    }
  }

  return flags
}

export const getFlagsForContext = (context: any) => {
  switch (context.type) {
    case 'gene':
      return (variant: any) => getFlagsForGeneContext(variant, context.geneId)
    case 'region':
      return getFlagsForRegionContext
    case 'transcript':
      return (variant: any) => getFlagsForTranscriptContext(variant, context.transcriptId)
    default:
      throw Error(`Invalid context for getFlags: ${context.type}`)
  }
}

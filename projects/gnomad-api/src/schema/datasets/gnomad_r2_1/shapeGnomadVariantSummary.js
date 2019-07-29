import POPULATIONS from './populations'

const getFlags = (variantData, transcriptConsequence) => {
  const flags = []

  if (variantData.flags.lcr) {
    flags.push('lcr')
  }

  if (variantData.flags.segdup) {
    flags.push('segdup')
  }

  if (variantData.flags.lof_flag) {
    flags.push('lof_flag')
  }

  // gnomAD 2.1 variants may have an LC LoF flag if they have some LoF category VEP anotations
  // on non-protein-coding transcripts. However, other transcript consequences will be sorted
  // above the non-coding consequences. Checking the displayed consequence's category here
  // prevents the case where an LC LoF flag will be shown next to a missense/synonymous/other
  // VEP annotation on the gene page.
  // See #364.
  const isLofOnNonCodingTranscript =
    transcriptConsequence.lof === 'NC' ||
    (transcriptConsequence.category === 'lof' && !transcriptConsequence.lof)
  if (
    variantData.flags.lc_lof &&
    transcriptConsequence.category === 'lof' &&
    !isLofOnNonCodingTranscript
  ) {
    flags.push('lc_lof')
  }

  if (isLofOnNonCodingTranscript) {
    flags.push('nc_transcript')
  }

  return flags
}

const shapeGnomadVariantSummary = (subsetKey, context) => {
  let getConsequence
  switch (context.type) {
    case 'gene':
      getConsequence = variant =>
        (variant.sortedTranscriptConsequences || []).find(csq => csq.gene_id === context.geneId)
      break
    case 'region':
      getConsequence = variant => (variant.sortedTranscriptConsequences || [])[0]
      break
    case 'transcript':
      getConsequence = variant =>
        (variant.sortedTranscriptConsequences || []).find(
          csq => csq.transcript_id === context.transcriptId
        )
      break
    default:
      throw Error(`Invalid context for shapeGnomadVariantSummary: ${context.type}`)
  }

  return esHit => {
    // eslint-disable-next-line no-underscore-dangle
    const variantData = esHit._source

    // eslint-disable-next-line no-underscore-dangle
    const isExomeVariant = esHit._index === 'gnomad_exomes_2_1_1'

    const ac = variantData[subsetKey].AC_adj.total
    const an = variantData[subsetKey].AN_adj.total

    const transcriptConsequence = getConsequence(variantData) || {}

    return {
      // Variant ID fields
      alt: variantData.alt,
      chrom: variantData.chrom,
      pos: variantData.pos,
      ref: variantData.ref,
      variantId: variantData.variant_id,
      xpos: variantData.xpos,
      // Other fields
      consequence: transcriptConsequence.major_consequence,
      consequence_in_canonical_transcript: !!transcriptConsequence.canonical,
      flags: getFlags(variantData, transcriptConsequence),
      hgvs: transcriptConsequence.hgvs,
      hgvsc: transcriptConsequence.hgvsc ? transcriptConsequence.hgvsc.split(':')[1] : null,
      hgvsp: transcriptConsequence.hgvsp ? transcriptConsequence.hgvsp.split(':')[1] : null,
      rsid: variantData.rsid,
      [isExomeVariant ? 'genome' : 'exome']: null,
      [isExomeVariant ? 'exome' : 'genome']: {
        ac,
        ac_hemi: variantData.nonpar ? variantData[subsetKey].AC_adj.male : 0,
        ac_hom: variantData[subsetKey].nhomalt_adj.total,
        an,
        af: an ? ac / an : 0,
        filters: variantData.filters || [],
        populations: POPULATIONS.map(popId => ({
          id: popId.toUpperCase(),
          ac: (variantData[subsetKey].AC_adj[popId] || {}).total || 0,
          an: (variantData[subsetKey].AN_adj[popId] || {}).total || 0,
          ac_hemi: variantData.nonpar ? (variantData[subsetKey].AC_adj[popId] || {}).male || 0 : 0,
          ac_hom: (variantData[subsetKey].nhomalt_adj[popId] || {}).total || 0,
        })),
      },
    }
  }
}

export default shapeGnomadVariantSummary

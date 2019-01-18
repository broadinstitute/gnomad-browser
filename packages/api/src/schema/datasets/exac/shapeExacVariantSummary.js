import POPULATIONS from './populations'

const getFlags = (variantData, transcriptConsequence) => {
  const flags = []

  if (variantData.flags.lof_flag) {
    flags.push('lof_flag')
  }

  // ExAC variants loaded with the gnomAD 2.1 pipeline may have an LC LoF flag if they have
  // some LoF category VEP anotations on non-protein-coding transcripts. However, other
  // transcript consequences will be sorted above the non-coding consequences. Checking the
  // displayed consequence's category here prevents the case where an LC LoF flag will be shown
  // next to a missense/synonymous/other VEP annotation on the gene page.
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

const shapeExacVariantSummary = context => {
  return esHit => {
    // eslint-disable-next-line no-underscore-dangle
    const variantData = esHit._source
    const transcriptConsequence = esHit.fields.csq[0]
    return {
      gqlType: 'VariantSummary',
      // variant interface fields
      alt: variantData.alt,
      chrom: variantData.chrom,
      pos: variantData.pos,
      ref: variantData.ref,
      variantId: variantData.variant_id,
      xpos: variantData.xpos,
      // other fields
      ac: variantData.AC_Adj,
      ac_hemi: variantData.AC_Hemi || 0,
      ac_hom: variantData.AC_Hom,
      af: variantData.AN_Adj === 0 ? 0 : variantData.AC_Adj / variantData.AN_Adj,
      an: variantData.AN_Adj,
      consequence: transcriptConsequence.major_consequence,
      consequence_in_canonical_transcript: !!transcriptConsequence.canonical,
      datasets: ['exacVariants'],
      filters: variantData.filters,
      flags: getFlags(variantData, transcriptConsequence),
      hgvs: transcriptConsequence.hgvs,
      hgvsc: transcriptConsequence.hgvsc ? transcriptConsequence.hgvsc.split(':')[1] : null,
      hgvsp: transcriptConsequence.hgvsp ? transcriptConsequence.hgvsp.split(':')[1] : null,
      populations: POPULATIONS.map(popId => ({
        id: popId,
        ac: variantData.populations[popId].AC || 0,
        an: variantData.populations[popId].AN || 0,
        ac_hemi: variantData.populations[popId].hemi || 0,
        ac_hom: variantData.populations[popId].hom || 0,
      })),
      rsid: variantData.rsid,
    }
  }
}

export default shapeExacVariantSummary

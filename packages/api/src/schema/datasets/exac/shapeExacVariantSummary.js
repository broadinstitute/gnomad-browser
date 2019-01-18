import POPULATIONS from './populations'

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
      flags: ['lc_lof', 'lof_flag'].filter(flag => variantData.flags[flag]),
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

import { getFlagsForContext } from '../shared/flags'
import { getConsequenceForContext } from '../shared/transcriptConsequence'
import POPULATIONS from './populations'

const shapeExacVariantSummary = context => {
  const getConsequence = getConsequenceForContext(context)
  const getFlags = getFlagsForContext(context)

  return esHit => {
    // eslint-disable-next-line no-underscore-dangle
    const variantData = esHit._source
    const transcriptConsequence = getConsequence(variantData) || {}

    const { filters } = variantData
    if (variantData.AC_Adj === 0 && !filters.includes('AC_Adj0_Filter')) {
      filters.push('AC_Adj0_Filter')
    }

    return {
      // Variant ID fields
      alt: variantData.alt,
      chrom: variantData.chrom,
      pos: variantData.pos,
      ref: variantData.ref,
      variantId: variantData.variant_id,
      // Other fields
      consequence: transcriptConsequence.major_consequence,
      consequence_in_canonical_transcript: !!transcriptConsequence.canonical,
      flags: getFlags(variantData),
      gene_id: transcriptConsequence.gene_id,
      gene_symbol: transcriptConsequence.gene_symbol,
      hgvs: transcriptConsequence.hgvs,
      hgvsc: transcriptConsequence.hgvsc ? transcriptConsequence.hgvsc.split(':')[1] : null,
      hgvsp: transcriptConsequence.hgvsp ? transcriptConsequence.hgvsp.split(':')[1] : null,
      lof: transcriptConsequence.lof,
      lof_filter: transcriptConsequence.lof_filter,
      lof_flags: transcriptConsequence.lof_flags,
      rsid: variantData.rsid,
      exome: {
        ac: variantData.AC_Adj,
        ac_hemi: variantData.AC_Hemi || 0,
        ac_hom: variantData.AC_Hom,
        af: variantData.AN_Adj === 0 ? 0 : variantData.AC_Adj / variantData.AN_Adj,
        an: variantData.AN_Adj,
        filters,
        populations: POPULATIONS.map(popId => ({
          id: popId,
          ac: variantData.populations[popId].AC || 0,
          an: variantData.populations[popId].AN || 0,
          ac_hemi: variantData.populations[popId].hemi || 0,
          ac_hom: variantData.populations[popId].hom || 0,
        })),
      },
      genome: null,
    }
  }
}

export default shapeExacVariantSummary

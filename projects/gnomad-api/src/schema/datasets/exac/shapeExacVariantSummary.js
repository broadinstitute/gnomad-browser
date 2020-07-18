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
      variantId: variantData.variant_id,
      reference_genome: 'GRCh37',
      chrom: variantData.locus.contig,
      pos: variantData.locus.position,
      ref: variantData.alleles[0],
      alt: variantData.alleles[1],
      // Other fields
      consequence: transcriptConsequence.major_consequence,
      consequence_in_canonical_transcript: transcriptConsequence.canonical,
      flags: getFlags(variantData),
      gene_id: transcriptConsequence.gene_id
        ? `ENSG${transcriptConsequence.gene_id.toString().padStart(11, '0')}`
        : null,
      gene_symbol: transcriptConsequence.gene_symbol,
      transcript_id: transcriptConsequence.transcript_id
        ? `ENST${transcriptConsequence.transcript_id.toString().padStart(11, '0')}`
        : null,
      hgvs: transcriptConsequence.hgvsp || transcriptConsequence.hgvsc,
      hgvsc: transcriptConsequence.hgvsc,
      hgvsp: transcriptConsequence.hgvsp,
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

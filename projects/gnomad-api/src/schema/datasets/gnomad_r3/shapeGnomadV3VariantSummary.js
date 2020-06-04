import { getFlagsForContext } from '../shared/flags'
import { getConsequenceForContext } from '../shared/transcriptConsequence'
import POPULATIONS from './gnomadV3Populations'

const shapeGnomadV3VariantSummary = context => {
  const getConsequence = getConsequenceForContext(context)
  const getFlags = getFlagsForContext(context)

  return esHit => {
    const variantData = esHit._source

    const transcriptConsequence = getConsequence(variantData) || {}

    return {
      // Variant ID fields
      variantId: variantData.variant_id,
      reference_genome: 'GRCh38',
      chrom: variantData.locus.contig.slice(3),
      pos: variantData.locus.position,
      ref: variantData.alleles[0],
      alt: variantData.alleles[1],
      // Other fields
      consequence: transcriptConsequence.major_consequence,
      consequence_in_canonical_transcript: !!transcriptConsequence.canonical,
      flags: getFlags(variantData),
      gene_id: transcriptConsequence.gene_id
        ? `ENSG${transcriptConsequence.gene_id.toString().padStart(11, '0')}`
        : null,
      gene_symbol: transcriptConsequence.gene_symbol,
      transcript_id: transcriptConsequence.transcript_id
        ? `ENST${transcriptConsequence.transcript_id.toString().padStart(11, '0')}`
        : null,
      // Backwards compatibility with gnomAD v2.1 variants.
      // This should eventually be moved to the UI.
      hgvs: transcriptConsequence.hgvsp || transcriptConsequence.hgvsc,
      hgvsc: transcriptConsequence.hgvsc,
      hgvsp: transcriptConsequence.hgvsp,
      lof: transcriptConsequence.lof,
      lof_filter: transcriptConsequence.lof_filter,
      lof_flags: transcriptConsequence.lof_flags,
      rsid: variantData.rsid,
      exome: null,
      genome: {
        ac: variantData.freq.adj.total.AC,
        ac_hemi: variantData.nonpar ? variantData.freq.adj.male.AC : 0,
        ac_hom: variantData.freq.adj.total.homozygote_count,
        an: variantData.freq.adj.total.AN,
        af: variantData.freq.adj.total.AF,
        filters: variantData.filters || [],
        populations: POPULATIONS.map(popId => ({
          id: popId.toUpperCase(),
          ac: ((variantData.freq.adj.populations[popId] || {}).total || {}).AC || 0,
          an: ((variantData.freq.adj.populations[popId] || {}).total || {}).AN || 0,
          ac_hemi: variantData.nonpar
            ? ((variantData.freq.adj.populations[popId] || {}).male || {}).AC || 0
            : 0,
          ac_hom:
            ((variantData.freq.adj.populations[popId] || {}).total || {}).homozygote_count || 0,
        })),
      },
    }
  }
}

export default shapeGnomadV3VariantSummary

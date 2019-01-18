import POPULATIONS from './populations'

const shapeGnomadVariantSummary = (subsetKey, context) => {
  return esHit => {
    // eslint-disable-next-line no-underscore-dangle
    const variantData = esHit._source

    // eslint-disable-next-line no-underscore-dangle
    const isExomeVariant = esHit._index === 'gnomad_exomes_2_1'
    const filterPrefix = isExomeVariant ? 'exomes' : 'genomes'
    const dataset = isExomeVariant ? 'gnomadExomeVariants' : 'gnomadGenomeVariants'

    const ac = variantData[subsetKey].AC_adj.total
    const an = variantData[subsetKey].AN_adj.total

    const transcriptConsequence = esHit.fields.csq[0] || {}

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
      ac,
      ac_hemi: variantData.nonpar ? variantData[subsetKey].AC_adj.male : 0,
      ac_hom: variantData[subsetKey].nhomalt_adj.total,
      an,
      af: an ? ac / an : 0,
      consequence: transcriptConsequence.major_consequence,
      consequence_in_canonical_transcript: !!transcriptConsequence.canonical,
      datasets: [dataset],
      filters: (variantData.filters || []).map(f => `${filterPrefix}_${f}`),
      flags: ['lcr', 'segdup', 'lc_lof', 'lof_flag'].filter(flag => variantData.flags[flag]),
      hgvs: transcriptConsequence.hgvs,
      hgvsc: transcriptConsequence.hgvsc ? transcriptConsequence.hgvsc.split(':')[1] : null,
      hgvsp: transcriptConsequence.hgvsp ? transcriptConsequence.hgvsp.split(':')[1] : null,
      populations: POPULATIONS.map(popId => ({
        id: popId.toUpperCase(),
        ac: (variantData[subsetKey].AC_adj[popId] || {}).total || 0,
        an: (variantData[subsetKey].AN_adj[popId] || {}).total || 0,
        ac_hemi: variantData.nonpar ? (variantData[subsetKey].AC_adj[popId] || {}).male || 0 : 0,
        ac_hom: (variantData[subsetKey].nhomalt_adj[popId] || {}).total || 0,
      })),
      rsid: variantData.rsid,
    }
  }
}

export default shapeGnomadVariantSummary

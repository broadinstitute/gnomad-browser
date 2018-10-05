import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

const fetchExacVariantsByRegion = async (ctx, { chrom, start, stop }) => {
  const padding = 75
  const rangeQuery = {
    range: {
      pos: {
        gte: start - padding,
        lte: stop + padding,
      },
    },
  }

  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'exac_v1_variants',
    type: 'variant',
    size: 10000,
    _source: [
      'AC_Adj',
      'AC_Hemi',
      'AC_Hom',
      'AN_Adj',
      'alt',
      'chrom',
      'filters',
      'flags',
      'main_transcript.hgvs',
      'main_transcript.hgvsc',
      'main_transcript.hgvsp',
      'main_transcript.major_consequence',
      'pos',
      'ref',
      'rsid',
      'variant_id',
      'xpos',
    ],

    body: {
      query: {
        bool: {
          filter: [{ term: { chrom } }, rangeQuery],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  return hits.map(hit => {
    // eslint-disable-next-line no-underscore-dangle
    const variantData = hit._source
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
      ac_hemi: variantData.AC_Hemi,
      ac_hom: variantData.AC_Hom,
      af: variantData.AN_Adj === 0 ? 0 : variantData.AC_Adj / variantData.AN_Adj,
      an: variantData.AN_Adj,
      consequence: variantData.main_transcript.major_consequence,
      filters: variantData.filters,
      flags: ['lc_lof', 'lof_flag'].filter(flag => variantData.flags[flag]),
      hgvs: variantData.main_transcript.hgvs,
      hgvc: variantData.main_transcript.hgvsc,
      hgvp: variantData.main_transcript.hgvsp,
      rsid: variantData.rsid,
    }
  })
}

export default fetchExacVariantsByRegion

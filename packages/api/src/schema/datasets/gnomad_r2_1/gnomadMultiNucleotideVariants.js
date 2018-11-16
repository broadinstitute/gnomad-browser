import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

export const fetchGnomadMNVsByIntervals = async (ctx, intervals) => {
  const rangeQueries = intervals.map(region => ({
    range: {
      xpos: {
        // An MNV's pos/xpos contains the position of the first SNP in the pair
        // The second SNP will be one or two base pairs after the first.
        gte: region.xstart - 2,
        lte: region.xstop,
      },
    },
  }))

  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'gnomad_exome_mnvs_2_1',
    type: 'mnv',
    size: 10000,
    _source: ['pos', 'snp1_variant_id', 'snp2_variant_id'],
    body: {
      query: {
        bool: {
          filter: {
            bool: {
              should: rangeQueries,
            },
          },
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  })

  return hits.map(hit => hit._source) // eslint-disable-line no-underscore-dangle
}

// Add an 'mnv' flag to variants that are part of a MNV.
// Requires the variants list to be sorted by position.
export const annotateVariantsWithMNVFlag = (variants, mnvs) => {
  const mnvVariantIds = new Set()
  mnvs.forEach(mnv => {
    mnvVariantIds.add(mnv.snp1_variant_id)
    mnvVariantIds.add(mnv.snp2_variant_id)
  })

  variants.forEach(variant => {
    if (mnvVariantIds.has(variant.variantId)) {
      variant.flags.push('mnv')
    }
  })

  return variants
}

export const fetchGnomadMNVsByVariantId = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_exome_mnvs_2_1',
    type: 'mnv',
    _source: ['AC_mnv', 'category', 'snp1_variant_id', 'snp2_variant_id'],
    body: {
      query: {
        bool: {
          filter: {
            bool: {
              should: [
                { term: { snp1_variant_id: variantId } },
                { term: { snp2_variant_id: variantId } },
              ],
            },
          },
        },
      },
    },
  })

  return response.hits.hits.map(hit => {
    const mnv = hit._source // eslint-disable-line no-underscore-dangle

    const otherVariant = mnv.snp1_variant_id === variantId ? 'snp2' : 'snp1'
    return {
      ac: mnv.AC_mnv,
      category: mnv.category,
      otherVariantId: mnv[`${otherVariant}_variant_id`],
    }
  })
}

const countExacVariantsByRegion = async (ctx, { chrom, start, stop }) => {
  const padding = 75
  const rangeQuery = {
    range: {
      pos: {
        gte: start - padding,
        lte: stop + padding,
      },
    },
  }

  const response = await ctx.database.elastic.count({
    index: 'exac_v1_variants',
    type: 'variant',
    body: {
      query: {
        bool: {
          filter: [{ term: { chrom } }, rangeQuery],
        },
      },
    },
  })

  return response.count
}

export default countExacVariantsByRegion

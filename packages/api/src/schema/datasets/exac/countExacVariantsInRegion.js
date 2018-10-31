const countExacVariantsByRegion = async (ctx, { chrom, start, stop }) => {
  const response = await ctx.database.elastic.count({
    index: 'exac_v1_variants',
    type: 'variant',
    body: {
      query: {
        bool: {
          filter: [
            { term: { chrom } },
            {
              range: {
                pos: {
                  gte: start,
                  lte: stop,
                },
              },
            },
          ],
        },
      },
    },
  })

  return response.count
}

export default countExacVariantsByRegion

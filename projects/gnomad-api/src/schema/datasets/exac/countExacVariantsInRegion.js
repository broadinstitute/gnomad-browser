const countExacVariantsByRegion = async (ctx, { chrom, start, stop }) => {
  const response = await ctx.database.elastic.count({
    index: 'exac_variants',
    type: 'documents',
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': chrom } },
            {
              range: {
                'locus.position': {
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

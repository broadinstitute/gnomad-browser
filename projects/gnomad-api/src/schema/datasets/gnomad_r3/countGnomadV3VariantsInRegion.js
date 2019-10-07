const countGnomadV3VariantsInRegion = async (ctx, { chrom, start, stop }) => {
  const response = await ctx.database.elastic.count({
    index: 'gnomad_r3_variants',
    type: 'documents',
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': `chr${chrom}` } },
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

export default countGnomadV3VariantsInRegion

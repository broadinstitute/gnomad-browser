// The cardinality aggregation returns only an approximate count.
// It is accurate enough for the purposes of determining whether or not to
// return individual variants for a region.
// https://www.elastic.co/guide/en/elasticsearch/guide/current/cardinality.html
const countGnomadVariantsInRegion = async (ctx, { chrom, start, stop }) => {
  const padding = 75
  const rangeQuery = {
    range: {
      pos: {
        gte: start - padding,
        lte: stop + padding,
      },
    },
  }

  const response = await ctx.database.elastic.search({
    index: 'gnomad_exomes_202_37,gnomad_genomes_202_37',
    type: 'variant',
    body: {
      query: {
        bool: {
          filter: [{ term: { contig: chrom } }, rangeQuery],
        },
      },
      aggs: {
        unique_variants: {
          cardinality: {
            field: 'variantId',
          },
        },
      },
    },
    size: 0,
  })

  return response.aggregations.unique_variants.value
}

export default countGnomadVariantsInRegion

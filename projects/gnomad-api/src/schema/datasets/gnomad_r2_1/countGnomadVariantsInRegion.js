// The cardinality aggregation returns only an approximate count.
// It is accurate enough for the purposes of determining whether or not to
// return individual variants for a region.
// https://www.elastic.co/guide/en/elasticsearch/guide/current/cardinality.html
const countGnomadVariantsInRegion = async (ctx, { chrom, start, stop }, subset) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_exomes_2_1_1,gnomad_genomes_2_1_1',
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
            // FIXME: This should query based on the requested subset's AC
            // However, there is no non_cancer field for genomes and we need to query
            // across both indices for the cardinality aggregation to work.
            // Using this workaround since since this function is used only to get an
            // approximate count of variants to determine whether or not to show variants
            // on the region page.
            // A possible solution is adding a non_cancer field to the genomes index as
            // an alias to the gnomad field.
            // https://www.elastic.co/guide/en/elasticsearch/reference/current/alias.html
            { range: { [`gnomad.AC_raw`]: { gt: 0 } } },
          ],
        },
      },
      aggs: {
        unique_variants: {
          cardinality: {
            field: 'variant_id',
          },
        },
      },
    },
    size: 0,
  })

  return response.aggregations.unique_variants.value
}

export default countGnomadVariantsInRegion

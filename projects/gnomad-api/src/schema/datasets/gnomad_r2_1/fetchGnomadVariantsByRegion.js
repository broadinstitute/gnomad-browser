import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

import {
  annotateVariantsWithMNVFlag,
  fetchGnomadMNVsByIntervals,
} from './gnomadMultiNucleotideVariants'
import mergeExomeAndGenomeVariantSummaries from './mergeExomeAndGenomeVariantSummaries'
import shapeGnomadVariantSummary from './shapeGnomadVariantSummary'

const fetchLofCurationResults = async (ctx, region) => {
  const { chrom, start, stop } = region

  const response = await ctx.database.elastic.search({
    index: 'lof_curation_results',
    type: 'documents',
    size: 1000,
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

  return response.hits.hits.map(doc => doc._source)
}

const fetchGnomadVariantsByRegion = async (ctx, region, subset) => {
  const { chrom, start, stop } = region
  const requests = [
    { index: 'gnomad_exomes_2_1_1', subsetInIndex: subset },
    // All genome samples are non_cancer, so separate non-cancer numbers are not stored
    { index: 'gnomad_genomes_2_1_1', subsetInIndex: subset === 'non_cancer' ? 'gnomad' : subset },
  ]

  const [exomeVariants, genomeVariants] = await Promise.all(
    requests.map(async ({ index, subsetInIndex }) => {
      const hits = await fetchAllSearchResults(ctx.database.elastic, {
        index,
        type: 'variant',
        size: 10000,
        _source: [
          `${subsetInIndex}.AC_adj`,
          `${subsetInIndex}.AN_adj`,
          `${subsetInIndex}.nhomalt_adj`,
          'alt',
          'chrom',
          'filters',
          'flags',
          'nonpar',
          'pos',
          'ref',
          'rsid',
          'sortedTranscriptConsequences',
          'variant_id',
        ],
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
                { range: { [`${subsetInIndex}.AC_raw`]: { gt: 0 } } },
              ],
            },
          },
          sort: [{ pos: { order: 'asc' } }],
        },
      })

      return hits.map(shapeGnomadVariantSummary(subsetInIndex, { type: 'region' }))
    })
  )

  const combinedVariants = mergeExomeAndGenomeVariantSummaries(exomeVariants, genomeVariants)

  // TODO: These can be fetched in parallel with exome/genome data
  const [mnvs, lofCurationResults] = await Promise.all([
    fetchGnomadMNVsByIntervals(ctx, [region]),
    fetchLofCurationResults(ctx, region),
  ])

  annotateVariantsWithMNVFlag(combinedVariants, mnvs)

  const lofCurationResultsByVariant = {}
  lofCurationResults.forEach(result => {
    lofCurationResultsByVariant[result.variant_id] =
      lofCurationResultsByVariant[result.variant_id] || {}
    lofCurationResultsByVariant[result.variant_id][result.gene_id] = result
  })

  combinedVariants.forEach(variant => {
    variant.lof_curation = (lofCurationResultsByVariant[variant.variantId] || {})[variant.gene_id] // eslint-disable-line no-param-reassign
  })

  return combinedVariants
}

export default fetchGnomadVariantsByRegion

import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { mergeOverlappingRegions } from '../../../utilities/region'

import {
  annotateVariantsWithMNVFlag,
  fetchGnomadMNVsByIntervals,
} from './gnomadMultiNucleotideVariants'
import mergeExomeAndGenomeVariantSummaries from './mergeExomeAndGenomeVariantSummaries'
import shapeGnomadVariantSummary from './shapeGnomadVariantSummary'

const fetchLofCurationResults = async (ctx, geneId) => {
  const response = await ctx.database.elastic.search({
    index: 'lof_curation_results',
    type: 'documents',
    size: 1000,
    body: {
      query: {
        term: {
          gene_id: geneId,
        },
      },
    },
  })

  return response.hits.hits.map(doc => doc._source)
}

const fetchGnomadVariantsByGene = async (ctx, gene, subset) => {
  const geneId = gene.gene_id
  const filteredRegions = gene.exons.filter(exon => exon.feature_type === 'CDS')
  const sortedRegions = filteredRegions.sort((r1, r2) => r1.xstart - r2.xstart)
  const padding = 75
  const paddedRegions = sortedRegions.map(r => ({
    ...r,
    start: r.start - padding,
    stop: r.stop + padding,
    xstart: r.xstart - padding,
    xstop: r.xstop + padding,
  }))

  const mergedRegions = mergeOverlappingRegions(paddedRegions)

  const rangeQueries = mergedRegions.map(region => ({
    range: {
      pos: {
        gte: region.start,
        lte: region.stop,
      },
    },
  }))

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
                {
                  nested: {
                    path: 'sortedTranscriptConsequences',
                    query: {
                      term: { 'sortedTranscriptConsequences.gene_id': geneId },
                    },
                  },
                },
                { bool: { should: rangeQueries } },
                { range: { [`${subsetInIndex}.AC_raw`]: { gt: 0 } } },
              ],
            },
          },
          sort: [{ pos: { order: 'asc' } }],
        },
      })

      return hits.map(shapeGnomadVariantSummary(subsetInIndex, { type: 'gene', geneId }))
    })
  )

  const combinedVariants = mergeExomeAndGenomeVariantSummaries(exomeVariants, genomeVariants)

  // TODO: These can be fetched in parallel with exome/genome data
  const [mnvs, lofCurationResults] = await Promise.all([
    fetchGnomadMNVsByIntervals(ctx, mergedRegions),
    fetchLofCurationResults(ctx, geneId),
  ])

  annotateVariantsWithMNVFlag(combinedVariants, mnvs)

  const lofCurationResultsByVariant = {}
  lofCurationResults.forEach(result => {
    lofCurationResultsByVariant[result.variant_id] = result
  })

  combinedVariants.forEach(variant => {
    variant.lof_curation = lofCurationResultsByVariant[variant.variantId] // eslint-disable-line no-param-reassign
  })

  return combinedVariants
}

export default fetchGnomadVariantsByGene

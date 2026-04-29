import { chooseIdField, getFilteredRegions } from './variant-datasets/gnomad-v4-variant-queries'
import largeGenes from './helpers/large-genes'
import { mergeOverlappingRegions } from './helpers/region-helpers'
import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'
import { withCache } from '../cache'

const GNOMAD_V4_LONG_READS_VARIANT_INDEX = 'gnomad_v4_lr_variants-2026-04-29--05-00'

export const fetchVariantById = async (esClient: any, variantId: string) => {
  const idField = chooseIdField(variantId)
  const response = await esClient.search({
    index: GNOMAD_V4_LONG_READS_VARIANT_INDEX,
    body: {
      query: {
        bool: {
          filter: { term: { [idField]: variantId } },
        },
      },
    },
    size: 1,
  })
  const hits = response.body?.hits?.hits
  if (hits && hits.length > 0) {
    const hit = hits[0]._source.value
    return hit
  }
  return null
}

// const hasPositiveAC = (variant: any) => variant.freq.all.ac > 0

const _fetchVariantsByGene = async (esClient: any, gene: any) => {
  const isLargeGene = largeGenes.includes(gene.gene_id)

  const pageSize = isLargeGene ? 500 : 10000

  try {
    const filteredRegions = getFilteredRegions(gene.exons)
    const sortedRegions = filteredRegions.sort((r1: any, r2: any) => r1.xstart - r2.xstart)
    const padding = 75
    const paddedRegions = sortedRegions.map((r: any) => ({
      ...r,
      start: r.start - padding,
      stop: r.stop + padding,
      xstart: r.xstart - padding,
      xstop: r.xstop + padding,
    }))

    const mergedRegions = mergeOverlappingRegions(paddedRegions)

    const rangeQueries = mergedRegions.map((region: any) => ({
      range: {
        'locus.position': {
          gte: region.start,
          lte: region.stop,
        },
      },
    }))

    const hits = await fetchAllSearchResults(esClient, {
      index: GNOMAD_V4_LONG_READS_VARIANT_INDEX,
      type: '_doc',
      size: pageSize,
      //    _source: [
      //      'value.freq',
      //      'value.filters',
      //      'value.flags',
      //      'value.fafmax',
      //      'value.alleles',
      //      // 'value.caid',
      //      'value.locus',
      //      'value.flags',
      //      'value.rsids',
      //      'value.transcript_consequences',
      //      'value.variant_id',
      //      'value.in_silico_predictors',
      //      'value.pos',
      //    ],
      body: {
        query: {
          bool: {
            filter: [{ term: { gene_id: gene.gene_id } }, { bool: { should: rangeQueries } }],
          },
        },
        sort: [{ 'locus.position': { order: 'asc' } }],
      },
    })

    return hits
    //   const shapedHits = hits
    //     .map((hit: any) => hit._source.value)
    //     .filter((variant: any) => hasPositiveAC(variant))
    //     .map(shapeVariantSummary(subset, { type: 'gene', geneId: gene.gene_id }))
    //   return shapedHits
    //  const lofCurationResults = await fetchLofCurationResultsByGene(esClient, 'v4', gene)
    //
    //  const lofCurationByVariantId = new Map(
    //    lofCurationResults.map((result) => [
    //      result.variant_id,
    //      result.lof_curations.find((c) => c.gene_id === gene.gene_id),
    //    ])
    //  )
    //
    //  const shapedHitsWithLof = shapedHits.map((variant: any) => ({
    //    ...variant,
    //    lof_curation: lofCurationByVariantId.get(variant.variant_id),
    //  }))
    //
    //  return shapedHitsWithLof
  } catch (error) {
    throw new Error(`'Error fetching variants by gene:', ${error}`)
  }
}

export const fetchVariantsByGene = withCache(
  _fetchVariantsByGene,
  (_: any, gene: any) => `lr_variants:gene:${gene.gene_id}`,
  { expiration: 1 }
  //  { expiration: 300 }
)

const queries = {
  fetchVariantById,
  fetchVariantsByGene,
  // fetchMatchingVariants
}

export default queries

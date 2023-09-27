import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'

const GNOMAD_COPY_NUMBER_VARIANTS_V4_INDEX = 'gnomad_v4_cnvs'

// ================================================================================================
// Variant query
// ================================================================================================

export const fetchCopyNumberVariantsById = async (esClient: any, variantId: any) => {
  const response = await esClient.search({
    index: GNOMAD_COPY_NUMBER_VARIANTS_V4_INDEX,
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: { term: { variant_id: variantId } },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total.value === 0) {
    return null
  }

  const variant = response.body.hits.hits[0]._source.value

  return variant
}

// ================================================================================================
// Gene query
// ================================================================================================

export type GeneQueryParams = { symbol: string }

const esFieldsToFetch = () => [
  'value.chrom',
  'value.end',
  'value.filters',
  'value.length',
  'value.pos',
  'value.reference_genome',
  'value.type',
  'value.posmin',
  'value.posmax',
  'value.endmin',
  'value.endmax',
  'value.variant_id',
]

export const fetchCopyNumberVariantsByGene = async (esClient: any, gene: GeneQueryParams) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_COPY_NUMBER_VARIANTS_V4_INDEX,
    type: '_doc',
    size: 10000,
    _source: esFieldsToFetch(),
    body: {
      query: {
        bool: {
          filter: {
            term: { genes: gene.symbol },
          },
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  })

  return hits
    .map((hit: any) => hit._source.value)
    .map((variant: any) => {
      return variant
    })
}

// ================================================================================================
// Region query
// ================================================================================================
export type RegionQueryParams = {
  chrom: number
  start: number
  stop: number
  xstart: number
  xstop: number
}

export const fetchCopyNumberVariantsByRegion = async (esClient: any, region: RegionQueryParams) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_COPY_NUMBER_VARIANTS_V4_INDEX,
    type: '_doc',
    size: 10000,
    _source: esFieldsToFetch(),
    body: {
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  { range: { xpos: { lte: region.xstop } } },
                  { range: { xend: { gte: region.xstart } } },
                ],
              },
            },
            {
              bool: {
                must: [
                  { range: { xpos2: { lte: region.xstop } } },
                  { range: { xend2: { gte: region.xstart } } },
                ],
              },
            },
          ],
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  })

  return hits
    .map((hit: any) => hit._source.value)
    .filter((variant: any) => {


        // deletions
        if (variant.type === 'DEL') {
            
        }

        // duplicates
        if (variant.type === 'DUP') {

        }

      return true
    })
    .map((variant: any) => {
      return variant
    })
}

import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'

const GNOMAD_COPY_NUMBER_VARIANTS_V4_INDEX = 'gnomad_v4_cnvs'

type CnvDatasetId = 'gnomad_cnv_r4'
type DatasetDependentQueryParams = {
  index: string,
}



const datasetDependentQueryParams: Record<CnvDatasetId, DatasetDependentQueryParams> = {
  gnomad_cnv_r4: {
    index: GNOMAD_COPY_NUMBER_VARIANTS_V4_INDEX,
  }
} as const

export type GeneQueryParams = { symbol: string }
export type RegionQueryParams = {
  chrom: number
  start: number
  stop: number
  xstart: number
  xstop: number
}

// ================================================================================================
// Variant query
// ================================================================================================

export const fetchCopyNumberVariantById = async (
  esClient: any,
  datasetId: CnvDatasetId,
  variantId: string
) => {
  const { index }= datasetDependentQueryParams[datasetId]
  const response = await esClient.search({
    index,
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
  return {
    ...variant,
    ...variant.freq,
  }
}


// ================================================================================================
// Gene query
// ================================================================================================

const esFieldsToFetch = () => [
  'value.chrom',
  'value.end',
  'value.filters',
  'value.freq',
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

export const fetchCopyNumberVariantsByGene = async (
  esClient: any,
  datasetId: CnvDatasetId,
  gene: GeneQueryParams
) => {
  const { index } = datasetDependentQueryParams[datasetId]
  const hits = await fetchAllSearchResults(esClient, {
    index,
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
    .filter((variant: any) => variant.freq.sc > 0)
    .map((variant: any) => {
      return {
        ...variant,
        ...variant.freq,
      }
    })
}

// ================================================================================================
// Region query
// ================================================================================================

export const fetchCopyNumberVariantsByRegion = async (
  esClient: any,
  datasetId: CnvDatasetId,
  region: RegionQueryParams
) => {
  const { index } = datasetDependentQueryParams[datasetId]
  const hits = await fetchAllSearchResults(esClient, {
    index,
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
          ],
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  })

  return hits
    .map((hit: any) => hit._source.value)
    .filter((variant: any) => variant.freq.sc > 0)
    .filter(() => {
      return true
    })
    .map((variant: any) => {
      return {
        ...variant,
        ...variant.freq,
      }
    })
}

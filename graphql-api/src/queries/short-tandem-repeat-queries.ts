import { withCache } from '../cache'
import { DATASET_LABELS } from '../datasets'
import { UserVisibleError } from '../errors'
import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'

const SHORT_TANDEM_REPEAT_INDICES = {
  gnomad_r3: 'gnomad_v3_short_tandem_repeats',
  gnomad_r4: 'gnomad_v3_short_tandem_repeats',
}

const SUMMARY_FIELDS = [
  'id',
  'value.id',
  'value.gene',
  'value.associated_diseases',
  'value.stripy_id',
  'value.reference_region',
  'value.reference_repeat_unit',
]

const _fetchAllShortTandemRepeats = async (esClient: any, datasetId: any) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `Short tandem repeats are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const hits = await fetchAllSearchResults(esClient, {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
    type: '_doc',
    size: 10000,
    _source: SUMMARY_FIELDS,
    body: {
      query: {
        match_all: {},
      },
      sort: [{ id: { order: 'asc' } }],
    },
  })

  return hits.map((hit: any) => hit._source.value)
}

export const fetchAllShortTandemRepeats = withCache(
  _fetchAllShortTandemRepeats,
  (_: any, datasetId: any) => `short_tandem_repeats:${datasetId}`,
  { expiration: 86400 }
)

export const fetchShortTandemRepeatById = async (
  esClient: any,
  datasetId: any,
  shortTandemRepeatId: any
) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `Short tandem repeats are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  try {
    const response = await esClient.get({
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
      type: '_doc',
      id: shortTandemRepeatId,
    })

    return response.body._source.value
  } catch (err) {
    // meta will not be present if the request times out in the queue before reaching ES
    // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
    if (err.meta && err.meta.body.found === false) {
      return null
    }
    throw err
  }
}

export const fetchShortTandemRepeatsByGene = async (
  esClient: any,
  datasetId: any,
  ensemblGeneId: any
) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `Short tandem repeats are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const response = await esClient.search({
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
    type: '_doc',
    size: 100,
    _source: SUMMARY_FIELDS,
    body: {
      query: {
        bool: {
          filter: {
            term: {
              ensembl_id: ensemblGeneId,
            },
          },
        },
      },
      sort: [{ id: { order: 'asc' } }],
    },
  })

  return response.body.hits.hits.map((hit: any) => hit._source.value)
}

export const fetchShortTandemRepeatsByRegion = async (
  esClient: any,
  datasetId: any,
  region: any
) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `Short tandem repeats are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const response = await esClient.search({
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
    type: '_doc',
    size: 100,
    _source: SUMMARY_FIELDS,
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                'reference_region.chrom': region.chrom,
              },
            },
            {
              range: {
                'reference_region.start': {
                  lte: region.stop,
                },
              },
            },
            {
              range: {
                'reference_region.stop': {
                  gte: region.start,
                },
              },
            },
          ],
        },
      },
      sort: [{ id: { order: 'asc' } }],
    },
  })

  return response.body.hits.hits.map((hit: any) => hit._source.value)
}

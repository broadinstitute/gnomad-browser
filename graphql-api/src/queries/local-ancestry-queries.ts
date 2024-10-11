import { DATASET_LABELS } from '../datasets'
import { UserVisibleError } from '../errors'

const LOCAL_ANCESTRY_INDICES = {
  gnomad_r3: 'gnomad_v3_local_ancestry-2024-10-11--20-51',
}

export const fetchLocalAncestryPopulationsByVariant = async (
  esClient: any,
  datasetId: any,
  variantId: any
) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const index = LOCAL_ANCESTRY_INDICES[datasetId]
  if (!index) {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    throw new UserVisibleError(`Local ancestry is not available for ${DATASET_LABELS[datasetId]}`)
  }

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
    return { exome: [], genome: [] }
  }

  return response.body.hits.hits[0]._source.value.populations
}

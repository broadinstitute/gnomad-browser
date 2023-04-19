import { isVariantId } from '@gnomad/identifiers'

const LIFTOVER_INDEX = 'liftover'

export const fetchLiftoverVariantsBySource = async (
  esClient: any,
  variantId: any,
  referenceGenome: any
) => {
  const response = await esClient.search({
    index: LIFTOVER_INDEX,
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'source.variant_id': variantId } },
            { term: { 'source.reference_genome': referenceGenome } },
          ],
        },
      },
    },
    size: 100,
  })

  return response.body.hits.hits
    .map((hit: any) => hit._source)
    .filter((doc: any) => isVariantId(doc.liftover.variant_id))
}

export const fetchLiftoverVariantsByTarget = async (
  esClient: any,
  variantId: any,
  referenceGenome: any
) => {
  const response = await esClient.search({
    index: LIFTOVER_INDEX,
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'liftover.variant_id': variantId } },
            { term: { 'liftover.reference_genome': referenceGenome } },
          ],
        },
      },
    },
    size: 100,
  })

  return response.body.hits.hits
    .map((hit: any) => hit._source)
    .filter((doc: any) => isVariantId(doc.liftover.variant_id))
}

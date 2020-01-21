import { UserVisibleError } from '../../errors'
import getClinvarIndex from './getClinvarIndex'
import shapeClinvarVariant from './shapeClinvarVariant'

const fetchClinvarVariantDetails = async (ctx, variantId, referenceGenome) => {
  const index = getClinvarIndex(referenceGenome)

  const response = await ctx.database.elastic.search({
    index,
    type: 'documents',
    size: 1,
    body: {
      query: {
        bool: {
          filter: [{ term: { variant_id: variantId } }],
        },
      },
    },
  })

  if (response.hits.hits.length === 0) {
    throw new UserVisibleError('Variant not found')
  }

  const doc = response.hits.hits[0] // eslint-disable-line no-underscore-dangle

  return shapeClinvarVariant({ type: 'region', referenceGenome })(doc)
}

export default fetchClinvarVariantDetails

import { UserVisibleError } from '../../errors'

const fetchGnomadV3VariantDetails = (ctx, variantId) => {
  throw new UserVisibleError('Variant not found')
}

export default fetchGnomadV3VariantDetails

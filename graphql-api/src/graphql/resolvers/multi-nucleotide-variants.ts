import { isVariantId, normalizeVariantId } from '@gnomad/identifiers'
import { UserVisibleError } from '../../errors'
import { fetchMultiNuceotideVariantById } from '../../queries/multi-nucleotide-variant-queries'

const resolveMultiNucleotideVariant = (_obj: any, args: any, ctx: any) => {
  if (!isVariantId(args.variant_id)) {
    throw new UserVisibleError('Invalid variant ID')
  }

  const variantId = normalizeVariantId(args.variant_id)

  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  return fetchMultiNuceotideVariantById(ctx.esClient, dataset, variantId)
}

const resolvers = {
  Query: {
    multiNucleotideVariant: resolveMultiNucleotideVariant,
  },
}

export default resolvers

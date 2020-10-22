const { isVariantId, normalizeVariantId } = require('@gnomad/identifiers')

const { UserVisibleError } = require('../../errors')
const { fetchMultiNuceotideVariantById } = require('../../queries/multi-nucleotide-variant-queries')

const resolveMultiNucleotideVariant = (obj, args, ctx) => {
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

module.exports = {
  Query: {
    multiNucleotideVariant: resolveMultiNucleotideVariant,
  },
}

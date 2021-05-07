const { isVariantId } = require('@gnomad/identifiers')

const { DATASET_LABELS } = require('../../datasets')
const { UserVisibleError } = require('../../errors')
const { fetchVariantCooccurrence } = require('../../queries/variant-cooccurrence-queries')

const resolveVariantCooccurrence = async (_, args, ctx) => {
  if (args.variants.length !== 2) {
    throw new UserVisibleError('A pair of variants is required')
  }

  if (!args.variants.every((variantId) => isVariantId(variantId))) {
    throw new UserVisibleError('Invalid variant ID')
  }

  if (args.variants[0] === args.variants[1]) {
    throw new UserVisibleError('Variants must be different')
  }

  if (args.dataset !== 'gnomad_r2_1') {
    throw new UserVisibleError(
      `Variant cooccurrence is not available for ${DATASET_LABELS[args.dataset]}`
    )
  }

  const cooccurrence = await fetchVariantCooccurrence(ctx.esClient, args.dataset, args.variants)

  if (!cooccurrence) {
    throw new UserVisibleError('No cooccurrence data available for these variants')
  }

  return cooccurrence
}

module.exports = {
  Query: {
    variant_cooccurrence: resolveVariantCooccurrence,
  },
}

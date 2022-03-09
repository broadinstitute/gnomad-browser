const { isVariantId, normalizeVariantId } = require('@gnomad/identifiers')

const { UserVisibleError } = require('../../errors')

const { fetchGenebassResultsByVariantId } = require('../../queries/genebass-queries')

const resolveGenebassVariant = async (_, args) => {
  if (!args.variantId) {
    throw new UserVisibleError('"variantId" is required')
  }

  let variantId
  if (args.variantId) {
    if (!isVariantId(args.variantId)) {
      throw new UserVisibleError('Invalid variant ID')
    }
    variantId = normalizeVariantId(args.variantId)
  }

  const results = await fetchGenebassResultsByVariantId(variantId)

  return results
}

module.exports = {
  Query: { genebass_variant: resolveGenebassVariant },
}

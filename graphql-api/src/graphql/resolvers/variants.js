const { isRsId, isVariantId, normalizeVariantId } = require('@gnomad/identifiers')

const { UserVisibleError } = require('../../errors')
const {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene,
  fetchVariantsByRegion,
  fetchVariantsByTranscript,
  fetchMatchingVariants,
} = require('../../queries/variant-queries')

const resolveVariant = (obj, args, ctx) => {
  if (!(args.rsid || args.variantId)) {
    throw new UserVisibleError('One of "rsid" or "variantId" is required')
  }
  if (args.rsid && args.variantId) {
    throw new UserVisibleError('Only one of "rsid" or "variantId" is allowed')
  }

  let variantId
  if (args.variantId) {
    if (!isVariantId(args.variantId)) {
      throw new UserVisibleError('Invalid variant ID')
    }

    variantId = normalizeVariantId(args.variantId)
  } else {
    if (!isRsId(args.rsid)) {
      throw new UserVisibleError('Invalid rsID')
    }

    variantId = args.rsid.toLowerCase()
  }

  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  return fetchVariantById(ctx.esClient, dataset, variantId)
}

const resolveVariantsInGene = (obj, args, ctx) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  return fetchVariantsByGene(ctx.esClient, dataset, obj)
}

const resolveVariantsInRegion = async (obj, args, ctx) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  if (obj.stop - obj.start >= 2.5e6) {
    throw new UserVisibleError('Select a smaller region to view variants')
  }

  const numVariantsInRegion = await countVariantsInRegion(ctx.esClient, dataset, obj)
  if (numVariantsInRegion > 30000) {
    throw new UserVisibleError(
      'This region has too many variants to display. Select a smaller region to view variants.'
    )
  }

  return fetchVariantsByRegion(ctx.esClient, dataset, obj)
}

const resolveVariantsInTranscript = (obj, args, ctx) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  return fetchVariantsByTranscript(ctx.esClient, dataset, obj)
}

const resolveVariantSearch = (obj, args, ctx) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  if (isVariantId(args.query)) {
    return fetchMatchingVariants(ctx.esClient, dataset, {
      variantId: normalizeVariantId(args.query),
    })
  }

  if (isRsId(args.query)) {
    return fetchMatchingVariants(ctx.esClient, dataset, {
      rsid: args.query,
    })
  }

  throw new UserVisibleError('Unrecognized query. Search by variant ID or rsID.')
}

module.exports = {
  Query: {
    variant: resolveVariant,
    variant_search: resolveVariantSearch,
  },
  Gene: {
    variants: resolveVariantsInGene,
  },
  Region: {
    variants: resolveVariantsInRegion,
  },
  Transcript: {
    variants: resolveVariantsInTranscript,
  },
}

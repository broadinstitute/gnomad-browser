const { UserVisibleError } = require('../../errors')
const {
  fetchStructuralVariantById,
  fetchStructuralVariantsByGene,
  fetchStructuralVariantsByRegion,
} = require('../../queries/structural-variant-queries')

const resolveStructuralVariant = async (_, args, ctx) => {
  const variant = await fetchStructuralVariantById(ctx.esClient, args.dataset, args.variantId)

  if (!variant) {
    throw new UserVisibleError('Variant not found')
  }

  return variant
}

const resolveStructuralVariantsInGene = (obj, args, ctx) => {
  return fetchStructuralVariantsByGene(ctx.esClient, args.dataset, obj)
}

const resolveStructuralVariantsInRegion = (obj, args, ctx) => {
  return fetchStructuralVariantsByRegion(ctx.esClient, args.dataset, obj)
}

module.exports = {
  Query: {
    structural_variant: resolveStructuralVariant,
  },
  Gene: {
    structural_variants: resolveStructuralVariantsInGene,
  },
  Region: {
    structural_variants: resolveStructuralVariantsInRegion,
  },
}

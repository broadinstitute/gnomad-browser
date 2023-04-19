import { UserVisibleError } from '../../errors'
import {
  fetchStructuralVariantById,
  fetchStructuralVariantsByGene,
  fetchStructuralVariantsByRegion,
} from '../../queries/structural-variant-queries'

const resolveStructuralVariant = async (_: any, args: any, ctx: any) => {
  const variant = await fetchStructuralVariantById(ctx.esClient, args.dataset, args.variantId)

  if (!variant) {
    throw new UserVisibleError('Variant not found')
  }

  return variant
}

const resolveStructuralVariantsInGene = (obj: any, args: any, ctx: any) => {
  return fetchStructuralVariantsByGene(ctx.esClient, args.dataset, obj)
}

const resolveStructuralVariantsInRegion = (obj: any, args: any, ctx: any) => {
  return fetchStructuralVariantsByRegion(ctx.esClient, args.dataset, obj)
}

const resolvers = {
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
export default resolvers

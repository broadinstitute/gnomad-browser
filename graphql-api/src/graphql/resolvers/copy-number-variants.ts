import { UserVisibleError } from '../../errors'
import {
  fetchCopyNumberVariantById,
  fetchCopyNumberVariantsByGene,
  fetchCopyNumberVariantsByRegion,
} from '../../queries/copy-number-variant-queries'

const resolveCopyNumberVariant = async (_: any, args: any, ctx: any) => {
  const variant = await fetchCopyNumberVariantById(ctx.esClient, args.dataset, args.variantId)
  if (!variant) {
    throw new UserVisibleError('Variant not found')
  }

  return variant
}

const resolveCopyNumberVariantsInGene = (obj: any, args: any, ctx: any) => {
  return fetchCopyNumberVariantsByGene(ctx.esClient, args.dataset, obj)
}

const resolveCopyNumberVariantsInRegion = (obj: any, args: any, ctx: any) => {
  return fetchCopyNumberVariantsByRegion(ctx.esClient, args.dataset, obj)
}

const resolvers = {
  Query: {
    copy_number_variant: resolveCopyNumberVariant,
  },
  Gene: {
    copy_number_variants: resolveCopyNumberVariantsInGene,
  },
  Region: {
    copy_number_variants: resolveCopyNumberVariantsInRegion,
  },
}
export default resolvers

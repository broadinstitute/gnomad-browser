import { UserVisibleError } from '../../errors'
import {
  fetchCopyNumberVariantsById,
  fetchCopyNumberVariantsByGene,
  fetchCopyNumberVariantsByRegion,
} from '../../queries/copy-number-variant-queries'

const resolveCopyNumberVariants = async (_: any, args: any, ctx: any) => {
  const variant = await fetchCopyNumberVariantsById(ctx.esClient, args.variantId)

  if (!variant) {
    throw new UserVisibleError('Variant not found')
  }

  return variant
}

const resolveCopyNumberVariantsInGene = (obj: any, ctx: any) => {
  return fetchCopyNumberVariantsByGene(ctx.esClient, obj)
}

const resolveCopyNumberVariantsInRegion = (obj: any, ctx: any) => {
  return fetchCopyNumberVariantsByRegion(ctx.esClient, obj)
}

const resolvers = {
  Query: {
    copy_number_variants: resolveCopyNumberVariants,
  },
  Gene: {
    copy_number_variants: resolveCopyNumberVariantsInGene,
  },
  Region: {
    copy_number_variants: resolveCopyNumberVariantsInRegion,
  },
}
export default resolvers

import { UserVisibleError } from '../../errors'
import {
  fetchMitochondrialVariantById,
  fetchMitochondrialVariantsByGene,
  fetchMitochondrialVariantsByRegion,
  fetchMitochondrialVariantsByTranscript,
} from '../../queries/mitochondrial-variant-queries'

const resolveMitochondrialVariant = async (_obj: any, args: any, ctx: any) => {
  const variant = await fetchMitochondrialVariantById(ctx.esClient, args.dataset, args.variant_id)

  if (!variant) {
    throw new UserVisibleError('Variant not found')
  }

  return variant
}

const resolveMitochondrialVariantsInGene = (obj: any, args: any, ctx: any) => {
  return fetchMitochondrialVariantsByGene(ctx.esClient, args.dataset, obj)
}

const resolveMitochondrialVariantsInRegion = (obj: any, args: any, ctx: any) => {
  return fetchMitochondrialVariantsByRegion(ctx.esClient, args.dataset, obj)
}

const resolveMitochondrialVariantsInTranscript = (obj: any, args: any, ctx: any) => {
  return fetchMitochondrialVariantsByTranscript(ctx.esClient, args.dataset, obj)
}

const resolvers = {
  Query: {
    mitochondrial_variant: resolveMitochondrialVariant,
  },
  Gene: {
    mitochondrial_variants: resolveMitochondrialVariantsInGene,
  },
  Region: {
    mitochondrial_variants: resolveMitochondrialVariantsInRegion,
  },
  Transcript: {
    mitochondrial_variants: resolveMitochondrialVariantsInTranscript,
  },
}

export default resolvers

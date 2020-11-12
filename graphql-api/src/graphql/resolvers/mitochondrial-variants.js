const { UserVisibleError } = require('../../errors')
const {
  fetchMitochondrialVariantById,
  fetchMitochondrialVariantsByGene,
  fetchMitochondrialVariantsByRegion,
  fetchMitochondrialVariantsByTranscript,
} = require('../../queries/mitochondrial-variant-queries')

const resolveMitochondrialVariant = async (obj, args, ctx) => {
  const variant = await fetchMitochondrialVariantById(ctx.esClient, args.dataset, args.variant_id)

  if (!variant) {
    throw new UserVisibleError('Variant not found')
  }

  return variant
}

const resolveMitochondrialVariantsInGene = (obj, args, ctx) => {
  return fetchMitochondrialVariantsByGene(ctx.esClient, args.dataset, obj)
}

const resolveMitochondrialVariantsInRegion = (obj, args, ctx) => {
  return fetchMitochondrialVariantsByRegion(ctx.esClient, args.dataset, obj)
}

const resolveMitochondrialVariantsInTranscript = (obj, args, ctx) => {
  return fetchMitochondrialVariantsByTranscript(ctx.esClient, args.dataset, obj)
}

module.exports = {
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

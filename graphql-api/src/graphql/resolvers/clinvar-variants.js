const { isVariantId, normalizeVariantId } = require('@gnomad/identifiers')

const {
  fetchClinvarReleaseDate,
  countClinvarVariantsInRegion,
  fetchClinvarVariantById,
  fetchClinvarVariantsByGene,
  fetchClinvarVariantsByRegion,
  fetchClinvarVariantsByTranscript,
} = require('../../queries/clinvar-variant-queries')

const { UserVisibleError } = require('../../errors')

const resolveClinvarReleaseDate = (_, args, ctx) => {
  return fetchClinvarReleaseDate(ctx.esClient)
}

const resolveClinVarVariant = async (_, args, ctx) => {
  if (!isVariantId(args.variant_id)) {
    throw new UserVisibleError('Invalid variant ID')
  }

  const variantId = normalizeVariantId(args.variant_id)

  const variant = await fetchClinvarVariantById(ctx.esClient, args.reference_genome, variantId)

  if (!variant) {
    throw new UserVisibleError('Variant not found')
  }

  return variant
}

const resolveClinVarVariantsInGene = (obj, args, ctx) => {
  return fetchClinvarVariantsByGene(ctx.esClient, obj.reference_genome, obj)
}

const resolveClinVarVariantsInRegion = async (obj, args, ctx) => {
  const numVariantsInRegion = await countClinvarVariantsInRegion(
    ctx.esClient,
    obj.reference_genome,
    obj
  )
  if (numVariantsInRegion > 30000) {
    throw new UserVisibleError(
      'This region has too many ClinVar variants to display. Select a smaller region to view ClinVar variants.'
    )
  }

  return fetchClinvarVariantsByRegion(ctx.esClient, obj.reference_genome, obj)
}

const resolveClinVarVariantsInTranscript = (obj, args, ctx) => {
  return fetchClinvarVariantsByTranscript(ctx.esClient, obj.reference_genome, obj)
}

module.exports = {
  BrowserMetadata: {
    clinvar_release_date: resolveClinvarReleaseDate,
  },
  Query: {
    clinvar_variant: resolveClinVarVariant,
  },
  Gene: {
    clinvar_variants: resolveClinVarVariantsInGene,
  },
  Region: {
    clinvar_variants: resolveClinVarVariantsInRegion,
  },
  Transcript: {
    clinvar_variants: resolveClinVarVariantsInTranscript,
  },
}

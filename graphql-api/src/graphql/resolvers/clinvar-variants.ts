import { isVariantId, normalizeVariantId } from '@gnomad/identifiers'

import {
  fetchClinvarReleaseDate,
  countClinvarVariantsInRegion,
  fetchClinvarVariantById,
  fetchClinvarVariantsByGene,
  fetchClinvarVariantsByRegion,
  fetchClinvarVariantsByTranscript,
} from '../../queries/clinvar-variant-queries'

import { UserVisibleError } from '../../errors'

const resolveClinvarReleaseDate = (_: any, _args: any, ctx: any) => {
  return fetchClinvarReleaseDate(ctx.esClient)
}

const resolveClinVarVariant = async (_: any, args: any, ctx: any) => {
  if (!isVariantId(args.variant_id)) {
    throw new UserVisibleError('Invalid variant ID')
  }

  const variantId = normalizeVariantId(args.variant_id)

  const variant = await fetchClinvarVariantById(ctx.esClient, args.reference_genome, variantId)

  // Previously, we would return an error from the API if a variant was not found in ClinVar
  //   This interefered with our nginx cache, as it uniformly does not cache responses that include
  //   an error. Now we instead return null.
  if (!variant) {
    return null
  }

  return variant
}

const resolveClinVarVariantsInGene = (obj: any, _args: any, ctx: any) => {
  return fetchClinvarVariantsByGene(ctx.esClient, obj.reference_genome, obj)
}

const resolveClinVarVariantsInRegion = async (obj: any, _args: any, ctx: any) => {
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

const resolveClinVarVariantsInTranscript = (obj: any, _args: any, ctx: any) => {
  return fetchClinvarVariantsByTranscript(ctx.esClient, obj.reference_genome, obj)
}

const resolvers = {
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

export default resolvers

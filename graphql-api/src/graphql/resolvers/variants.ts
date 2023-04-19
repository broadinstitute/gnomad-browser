import { isRsId, isVariantId, normalizeVariantId } from '@gnomad/identifiers'

import { DATASET_REFERENCE_GENOMES } from '../../datasets'
import { UserVisibleError } from '../../errors'
import { fetchClinvarVariantByClinvarVariationId } from '../../queries/clinvar-variant-queries'

import {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene,
  fetchVariantsByRegion,
  fetchVariantsByTranscript,
  fetchMatchingVariants,
} from '../../queries/variant-queries'

import { fetchNccConstraintRegionById } from '../../queries/genomic-constraint-queries'

const resolveVariant = async (_obj: any, args: any, ctx: any) => {
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

  const variant = await fetchVariantById(ctx.esClient, dataset, variantId)
  const posRounded = Math.floor(variant.pos / 1000) * 1000
  const variantNCCId = `chr${variant.chrom}-${posRounded}-${posRounded + 1000}`
  const variantNCC = await fetchNccConstraintRegionById(ctx.esClient, variantNCCId)
  variant.non_coding_constraint = variantNCC
  return variant
}

const resolveVariantsInGene = (obj: any, args: any, ctx: any) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  return fetchVariantsByGene(ctx.esClient, dataset, obj)
}

const resolveVariantsInRegion = async (obj: any, args: any, ctx: any) => {
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

const resolveVariantsInTranscript = (obj: any, args: any, ctx: any) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  return fetchVariantsByTranscript(ctx.esClient, dataset, obj)
}

const resolveVariantSearch = async (_obj: any, args: any, ctx: any) => {
  const { dataset, query } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  if (isVariantId(query)) {
    return fetchMatchingVariants(ctx.esClient, dataset, {
      variantId: normalizeVariantId(query),
    })
  }

  if (isRsId(query)) {
    return fetchMatchingVariants(ctx.esClient, dataset, {
      rsid: query,
    })
  }

  if (/^CA[0-9]+$/i.test(query)) {
    return fetchMatchingVariants(ctx.esClient, dataset, {
      caid: query.toUpperCase(),
    })
  }

  if (/^[0-9]+$/.test(query)) {
    const clinvarVariant = await fetchClinvarVariantByClinvarVariationId(
      ctx.esClient,
      DATASET_REFERENCE_GENOMES[dataset],
      query
    )
    if (!clinvarVariant) {
      return []
    }
    return fetchMatchingVariants(ctx.esClient, dataset, {
      variantId: clinvarVariant.variant_id,
    })
  }

  throw new UserVisibleError(
    'Unrecognized query. Search by variant ID, rsID, or ClinVar variation ID.'
  )
}

const resolvers = {
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
export default resolvers

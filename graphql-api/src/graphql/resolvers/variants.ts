import { isRsId, isVariantId, normalizeVariantId } from '@gnomad/identifiers'

import config from '../../config'
import { DATASET_REFERENCE_GENOMES } from '../../datasets'
import { UserVisibleError } from '../../errors'
import type { GraphQLContext } from '../../app'
import { assertDatasetAndReferenceGenomeMatch } from '../../queries/helpers/validation-helpers'
import gnomadV4VariantQueries from '../../queries/variant-datasets/gnomad-v4-variant-queries'
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

import { hasVRSData } from '../../../../dataset-metadata/metadata'

const resolveVariant = async (_obj: any, args: any, ctx: GraphQLContext) => {
  // These are all "variant IDs" of one kind or another but `variantId` here
  // specifically refers to the chrom-pos-ref-alt style ubiquitous in gnomAD
  const { rsid, variantId, vrsId, dataset } = args

  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  const nSpecifiedIds = [rsid, variantId, vrsId].filter((id) => id).length
  if (nSpecifiedIds !== 1) {
    throw new UserVisibleError('Exactly one of "rsid", "variantId", or "vrsId" is required')
  }

  let normalizedVariantId

  if (variantId) {
    if (!isVariantId(variantId)) {
      throw new UserVisibleError('Invalid variant ID')
    }

    normalizedVariantId = normalizeVariantId(variantId)
  }

  if (rsid) {
    if (!isRsId(rsid)) {
      throw new UserVisibleError('Invalid rsID')
    }

    normalizedVariantId = args.rsid.toLowerCase()
  }

  if (vrsId) {
    if (!hasVRSData(dataset)) {
      throw new UserVisibleError(`Dataset ${dataset} does not have VRS data`)
    }

    normalizedVariantId = /^ga4gh:/.test(vrsId) ? vrsId : `ga4gh:${vrsId}`
  }

  const gnomadVariantsV4 = ctx.parquetDataStore?.gnomadVariantsV4
  const isGnomadV4Dataset = dataset === 'gnomad_r4' || dataset === 'gnomad_r4_non_ukb'
  const variant =
    gnomadVariantsV4 && isGnomadV4Dataset
      ? await gnomadV4VariantQueries.fetchVariantById(
          ctx.esClient,
          normalizedVariantId,
          dataset === 'gnomad_r4' ? 'all' : 'non_ukb',
          { store: gnomadVariantsV4, isParquetOnly: config.PARQUET_ONLY }
        )
      : await fetchVariantById(ctx.esClient, dataset, normalizedVariantId)

  if (gnomadVariantsV4 && isGnomadV4Dataset && config.PARQUET_ONLY) {
    variant.non_coding_constraint = null
    return variant
  }

  const posRounded = Math.floor(variant.pos / 1000) * 1000
  const variantNCCId = `chr${variant.chrom}-${posRounded}-${posRounded + 1000}`
  const variantNCC = await fetchNccConstraintRegionById(ctx.esClient, variantNCCId)
  variant.non_coding_constraint = variantNCC
  return variant
}

const resolveVariantsInGene = (obj: any, args: any, ctx: GraphQLContext) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  const gnomadVariantsV4 = ctx.parquetDataStore?.gnomadVariantsV4
  if (gnomadVariantsV4 && (dataset === 'gnomad_r4' || dataset === 'gnomad_r4_non_ukb')) {
    assertDatasetAndReferenceGenomeMatch(dataset, obj.reference_genome)
    const subset = dataset === 'gnomad_r4' ? 'all' : 'non_ukb'
    return gnomadV4VariantQueries.fetchVariantsByGene(ctx.esClient, obj, subset, {
      store: gnomadVariantsV4,
      isParquetOnly: config.PARQUET_ONLY,
    })
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

  const gnomadVariantsV4 = ctx.parquetDataStore?.gnomadVariantsV4
  if (gnomadVariantsV4 && (dataset === 'gnomad_r4' || dataset === 'gnomad_r4_non_ukb')) {
    assertDatasetAndReferenceGenomeMatch(dataset, obj.reference_genome)
    // TK: Restore a fast native region-count guard before fetching variants.
    return gnomadV4VariantQueries.fetchVariantsByRegion(
      ctx.esClient,
      obj,
      dataset === 'gnomad_r4' ? 'all' : 'non_ukb',
      { store: gnomadVariantsV4, isParquetOnly: config.PARQUET_ONLY }
    )
  }

  const numVariantsInRegion = await countVariantsInRegion(ctx.esClient, dataset, obj)
  if (numVariantsInRegion > 30000) {
    throw new UserVisibleError(
      'This region has too many variants to display. Select a smaller region to view variants.'
    )
  }

  return fetchVariantsByRegion(ctx.esClient, dataset, obj)
}

const resolveVariantsInTranscript = (obj: any, args: any, ctx: GraphQLContext) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  const gnomadVariantsV4 = ctx.parquetDataStore?.gnomadVariantsV4
  if (gnomadVariantsV4 && (dataset === 'gnomad_r4' || dataset === 'gnomad_r4_non_ukb')) {
    assertDatasetAndReferenceGenomeMatch(dataset, obj.reference_genome)
    const subset = dataset === 'gnomad_r4' ? 'all' : 'non_ukb'
    return gnomadV4VariantQueries.fetchVariantsByTranscript(ctx.esClient, obj, subset, {
      store: gnomadVariantsV4,
      isParquetOnly: config.PARQUET_ONLY,
    })
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

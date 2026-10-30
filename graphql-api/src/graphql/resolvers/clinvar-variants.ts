import { isVariantId, normalizeVariantId } from '@gnomad/identifiers'
import type { GenomicIntervalBounds } from '@gnomad/data-store'

import {
  fetchClinvarReleaseDate,
  countClinvarVariantsInRegion,
  fetchClinvarVariantById,
  fetchClinvarVariantsByGene,
  fetchClinvarVariantsByRegion,
  fetchClinvarVariantsByTranscript,
} from '../../queries/clinvar-variant-queries'

import { UserVisibleError } from '../../errors'
import type { GraphQLContext } from '../context'
import {
  getFilteredRegions,
  type Exon,
} from '../../queries/variant-datasets/gnomad-v4-variant-queries'

const MAX_CLINVAR_VARIANTS_IN_REGION = 30_000
const TOO_MANY_CLINVAR_VARIANTS_IN_REGION_MESSAGE =
  'This region has too many ClinVar variants to display. Select a smaller region to view ClinVar variants.'

const selectExonIntervals = (exons: (Exon & GenomicIntervalBounds)[]): GenomicIntervalBounds[] =>
  getFilteredRegions(exons).map(({ start, stop }) => ({ start, stop }))

const resolveClinvarReleaseDate = (_: any, _args: any, ctx: any) => {
  return fetchClinvarReleaseDate(ctx.esClient)
}

const resolveClinVarVariant = async (_: any, args: any, ctx: GraphQLContext) => {
  if (!isVariantId(args.variant_id)) {
    throw new UserVisibleError('Invalid variant ID')
  }

  const variantId = normalizeVariantId(args.variant_id)

  const { parquetDataStore } = ctx
  if (args.reference_genome === 'GRCh38' && parquetDataStore) {
    return parquetDataStore.clinvarGrch38.fetchSingleVariant(variantId)
  }

  const variant = await fetchClinvarVariantById(ctx.esClient, args.reference_genome, variantId)

  // Previously, we would return an error from the API if a variant was not found in ClinVar
  //   This interefered with our nginx cache, as it uniformly does not cache responses that include
  //   an error. Now we instead return null.
  if (!variant) {
    return null
  }

  return variant
}

const resolveClinVarVariantsInGene = (obj: any, _args: any, ctx: GraphQLContext) => {
  const { parquetDataStore } = ctx
  if (obj.reference_genome === 'GRCh38' && parquetDataStore) {
    return parquetDataStore.clinvarGrch38.fetchVariantsInGene(
      obj.gene_id,
      obj.chrom,
      selectExonIntervals(obj.exons)
    )
  }

  return fetchClinvarVariantsByGene(ctx.esClient, obj.reference_genome, obj)
}

const resolveClinVarVariantsInRegion = async (obj: any, _args: any, ctx: GraphQLContext) => {
  const { parquetDataStore } = ctx
  if (obj.reference_genome === 'GRCh38' && parquetDataStore) {
    const numVariantsInRegion = await parquetDataStore.clinvarGrch38.countVariantsInRegion(
      obj.chrom,
      obj.start,
      obj.stop
    )
    if (numVariantsInRegion > MAX_CLINVAR_VARIANTS_IN_REGION) {
      throw new UserVisibleError(TOO_MANY_CLINVAR_VARIANTS_IN_REGION_MESSAGE)
    }
    return parquetDataStore.clinvarGrch38.fetchVariantsInRegion(
      obj.chrom,
      obj.start,
      obj.stop,
      MAX_CLINVAR_VARIANTS_IN_REGION
    )
  }

  const numVariantsInRegion = await countClinvarVariantsInRegion(
    ctx.esClient,
    obj.reference_genome,
    obj
  )
  if (numVariantsInRegion > MAX_CLINVAR_VARIANTS_IN_REGION) {
    throw new UserVisibleError(TOO_MANY_CLINVAR_VARIANTS_IN_REGION_MESSAGE)
  }

  return fetchClinvarVariantsByRegion(ctx.esClient, obj.reference_genome, obj)
}

const resolveClinVarVariantsInTranscript = (obj: any, _args: any, ctx: GraphQLContext) => {
  const { parquetDataStore } = ctx
  if (obj.reference_genome === 'GRCh38' && parquetDataStore) {
    return parquetDataStore.clinvarGrch38.fetchVariantsInTranscript(
      obj.transcript_id,
      obj.chrom,
      selectExonIntervals(obj.exons)
    )
  }

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

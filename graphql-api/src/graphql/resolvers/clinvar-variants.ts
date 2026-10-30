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
import type { GraphQLContext } from '../../app'
import {
  getFilteredRegions,
  type Exon,
} from '../../queries/variant-datasets/gnomad-v4-variant-queries'

const selectClinvarExonIntervals = (exons: Exon[]): GenomicIntervalBounds[] => {
  return getFilteredRegions(exons).map((exon) => {
    if (
      !('start' in exon) ||
      typeof exon.start !== 'number' ||
      !('stop' in exon) ||
      typeof exon.stop !== 'number'
    ) {
      throw new Error('ClinVar exon intervals require numeric start and stop coordinates')
    }

    return { start: exon.start, stop: exon.stop }
  })
}

const resolveClinvarReleaseDate = (_: any, _args: any, ctx: any) => {
  return fetchClinvarReleaseDate(ctx.esClient)
}

const resolveClinVarVariant = async (_: any, args: any, ctx: GraphQLContext) => {
  if (!isVariantId(args.variant_id)) {
    throw new UserVisibleError('Invalid variant ID')
  }

  const variantId = normalizeVariantId(args.variant_id)

  // ===

  const parquetDataStore = ctx.parquetDataStore

  if (args.reference_genome === 'GRCh38' && parquetDataStore !== null) {
    return parquetDataStore.clinvarGrch38.fetchSingleVariant(variantId)
  }

  // ===

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
  const parquetDataStore = ctx.parquetDataStore
  if (obj.reference_genome === 'GRCh38' && parquetDataStore !== null) {
    const intervals = selectClinvarExonIntervals(obj.exons)
    return parquetDataStore.clinvarGrch38.fetchVariantsInGene(obj.gene_id, obj.chrom, intervals)
  }

  return fetchClinvarVariantsByGene(ctx.esClient, obj.reference_genome, obj)
}

const resolveClinVarVariantsInRegion = async (obj: any, _args: any, ctx: GraphQLContext) => {
  const variantLimit = 30_000
  const tooManyVariantsError = new UserVisibleError(
    'This region has too many ClinVar variants to display. Select a smaller region to view ClinVar variants.'
  )

  const parquetDataStore = ctx.parquetDataStore

  if (obj.reference_genome === 'GRCh38' && parquetDataStore !== null) {
    const variants = await parquetDataStore.clinvarGrch38.fetchVariantsInRegion(
      obj.chrom,
      obj.start,
      obj.stop
    )

    if (variants.length > variantLimit) {
      throw tooManyVariantsError
    }

    return variants
  }

  const numVariantsInRegion = await countClinvarVariantsInRegion(
    ctx.esClient,
    obj.reference_genome,
    obj
  )

  if (numVariantsInRegion > variantLimit) {
    throw tooManyVariantsError
  }

  return fetchClinvarVariantsByRegion(ctx.esClient, obj.reference_genome, obj)
}

const resolveClinVarVariantsInTranscript = (obj: any, _args: any, ctx: GraphQLContext) => {
  const parquetDataStore = ctx.parquetDataStore
  if (obj.reference_genome === 'GRCh38' && parquetDataStore !== null) {
    const intervals = selectClinvarExonIntervals(obj.exons)
    return parquetDataStore.clinvarGrch38.fetchVariantsInTranscript(
      obj.transcript_id,
      obj.chrom,
      intervals
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

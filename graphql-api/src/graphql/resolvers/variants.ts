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
import { fetchVariantById as fetchLongReadVariantById } from '../../queries/long_read_variants'

import { hasVRSData } from '../../../../dataset-metadata/metadata'

const resolveVariant = async (_obj: any, args: any, ctx: any) => {
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
  let isLongReadOnlyId = false

  if (variantId) {
    if (isVariantId(variantId)) {
      normalizedVariantId = normalizeVariantId(variantId)
    } else if (/^\d{1,2}-\d+-[A-Za-z]+-\d+$/.test(variantId) || /^[XYxy]-\d+-[A-Za-z]+-\d+$/.test(variantId)) {
      // LR variant IDs like "22-20277853-TRV-14" don't pass standard validation
      normalizedVariantId = variantId
      isLongReadOnlyId = true
    } else {
      throw new UserVisibleError('Invalid variant ID')
    }
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

  let variant
  try {
    if (isLongReadOnlyId) {
      throw new UserVisibleError('Variant not found')
    }
    variant = await fetchVariantById(ctx.esClient, dataset, normalizedVariantId)
  } catch (error: any) {
    if (error instanceof UserVisibleError && error.message === 'Variant not found') {
      const lrVariant = await fetchLongReadVariantById(normalizedVariantId)
      if (!lrVariant) {
        throw error
      }

      variant = {
        variant_id: lrVariant.variant_id,
        variantId: lrVariant.variant_id,
        reference_genome: lrVariant.reference_genome,
        chrom: lrVariant.chrom,
        pos: lrVariant.pos,
        ref: lrVariant.ref,
        alt: lrVariant.alt,
        caid: null,
        rsids: lrVariant.rsids,
        rsid: null,
        colocated_variants: [],
        colocatedVariants: [],
        coverage: { exome: null, genome: null },
        lof_curations: null,
        multi_nucleotide_variants: null,
        multiNucleotideVariants: null,
        flags: [],

        exome: null,
        genome: null,
        joint: null,

        long_read: {
          ac: lrVariant.freq?.all?.ac || 0,
          an: lrVariant.freq?.all?.an || 0,
          af: lrVariant.freq?.all?.af || 0,
          homozygote_ref_count: lrVariant.freq?.all?.homozygote_ref_count ?? null,
          homozygote_alt_count: lrVariant.freq?.all?.homozygote_alt_count ?? null,
          heterozygote_count: lrVariant.freq?.all?.heterozygote_count ?? null,
          filters: lrVariant.filters || [],
          populations: lrVariant.freq?.populations || [],
        },

        long_read_details: {
          allele_type: lrVariant.allele_type,
          motifs: lrVariant.motifs,
          is_likely_tr: lrVariant.is_likely_tr,
          enveloping_tr_id: lrVariant.enveloping_tr_id,
          gnomad_str: lrVariant.gnomad_str,
          allele_size_distribution: lrVariant.allele_size_distribution,
          genotype_distribution: lrVariant.genotype_distribution,
          max_repunits: lrVariant.max_repunits,
          main_reference_region: lrVariant.main_reference_region,
        },

        transcript_consequences: lrVariant.transcript_consequences || [],
        sortedTranscriptConsequences: lrVariant.transcript_consequences || [],
        transcript_consequence: lrVariant.transcript_consequences?.[0] || null,
        in_silico_predictors: [],
        non_coding_constraint: null,

        // Deprecated fields mapped from transcript_consequences
        consequence: lrVariant.transcript_consequences?.[0]?.major_consequence || null,
        consequence_in_canonical_transcript:
          lrVariant.transcript_consequences?.[0]?.is_canonical || null,
        domains: lrVariant.transcript_consequences?.[0]?.domains || null,
        gene_id: lrVariant.transcript_consequences?.[0]?.gene_id || null,
        gene_symbol: lrVariant.transcript_consequences?.[0]?.gene_symbol || null,
        transcript_id: lrVariant.transcript_consequences?.[0]?.transcript_id || null,
        transcript_version: lrVariant.transcript_consequences?.[0]?.transcript_version || null,
        hgvsc: lrVariant.transcript_consequences?.[0]?.hgvsc || null,
        hgvsp: lrVariant.transcript_consequences?.[0]?.hgvsp || null,
        hgvs: lrVariant.transcript_consequences?.[0]?.hgvs || null,
        lof: lrVariant.transcript_consequences?.[0]?.lof || null,
        lof_filter: lrVariant.transcript_consequences?.[0]?.lof_filter || null,
        lof_flags: null,

        faf95_joint: null,
        faf99_joint: null,

        // GA4GH placeholders
        va: { exome: null, genome: null },
        vrs: null,
      }
    } else {
      throw error
    }
  }

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

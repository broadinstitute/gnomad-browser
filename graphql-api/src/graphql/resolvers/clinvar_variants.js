const { isVariantId, normalizeVariantId } = require('@gnomad/identifiers')

const { UserVisibleError } = require('../errors')

const resolveClinVarVariant = async (_, args, ctx) => {
  if (!isVariantId(args.variant_id)) {
    throw new UserVisibleError('Invalid variant ID')
  }

  const variantId = normalizeVariantId(args.variant_id)

  const variant = await ctx.queryInternalAPI(
    `/${args.reference_genome}/clinvar_variant/${variantId}/`
  )

  if (!variant) {
    throw new UserVisibleError('Variant not found')
  }

  return variant
}

const resolveClinVarVariantsInGene = (obj, args, ctx) => {
  const intervals = obj.exons
    .filter((exon) => exon.feature_type === 'CDS')
    .map((exon) => ({
      start: Math.max(1, exon.start - 75),
      stop: exon.stop + 75,
    }))
    .map(({ start, stop }) => `${obj.chrom}:${start}-${stop}`)
    .join(',')

  return ctx.queryInternalAPI(
    `/${obj.reference_genome}/gene/${obj.gene_id}/clinvar_variants/?intervals=${encodeURIComponent(
      intervals
    )}`,
    {
      cacheKey: `clinvar:gene:${obj.gene_id}:${obj.reference_genome}`,
      cacheExpiration: 604800,
    }
  )
}

const resolveClinVarVariantsInRegion = (obj, args, ctx) => {
  const regionId = `${obj.chrom}-${obj.start}-${obj.stop}`
  return ctx.queryInternalAPI(`/${obj.reference_genome}/region/${regionId}/clinvar_variants/`)
}

const resolveClinVarVariantsInTranscript = (obj, args, ctx) => {
  const intervals = obj.exons
    .filter((exon) => exon.feature_type === 'CDS')
    .map((exon) => ({
      start: Math.max(1, exon.start - 75),
      stop: exon.stop + 75,
    }))
    .map(({ start, stop }) => `${obj.chrom}:${start}-${stop}`)
    .join(',')

  return ctx.queryInternalAPI(
    `/${obj.reference_genome}/transcript/${
      obj.transcript_id
    }/clinvar_variants/?intervals=${encodeURIComponent(intervals)}`,
    {
      cacheKey: `clinvar:transcript:${obj.transcript_id}:${obj.reference_genome}`,
      cacheExpiration: 3600,
    }
  )
}

module.exports = {
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

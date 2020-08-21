const { isVariantId, normalizeVariantId } = require('@gnomad/identifiers')

const { UserVisibleError } = require('../errors')

const DATASET_REFERENCE_GENOMES = {
  gnomad_r3: 'GRCh38',
  gnomad_r2_1: 'GRCh37',
  gnomad_r2_1_controls: 'GRCh37',
  gnomad_r2_1_non_neuro: 'GRCh37',
  gnomad_r2_1_non_cancer: 'GRCh37',
  gnomad_r2_1_non_topmed: 'GRCh37',
  exac: 'GRCh37',
}

const DATASET_LABELS = {
  gnomad_r3: 'gnomAD v3',
  gnomad_r2_1: 'gnomAD v2',
  gnomad_r2_1_controls: 'gnomAD v2',
  gnomad_r2_1_non_neuro: 'gnomAD v2',
  gnomad_r2_1_non_cancer: 'gnomAD v2',
  gnomad_r2_1_non_topmed: 'gnomAD v2',
  exac: 'ExAC',
}

const resolveVariant = async (obj, args, ctx) => {
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
    const matchingVariants = await ctx.queryInternalAPI(`/rsid/${args.rsid}/`)
    if (matchingVariants.length === 0) {
      throw new UserVisibleError('Variant not found')
    }

    // Return first matching variant.
    // The most common case of an rsID matching multiple gnomAD variants is multi-allelic variants.
    // For those, the other variants will be listed on the variant page.
    // if (matchingVariants.length > 1) {
    //   throw new UserVisibleError('rsID matches multiple variants')
    // }

    variantId = matchingVariants[0] // eslint-disable-line prefer-destructuring
  }

  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  const referenceGenome = DATASET_REFERENCE_GENOMES[dataset]
  return ctx.queryInternalAPI(`/${referenceGenome}/variant/${variantId}/?dataset=${dataset}`)
}

const resolveVariantsInGene = (obj, args, ctx) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  const referenceGenome = obj.reference_genome
  if (referenceGenome !== DATASET_REFERENCE_GENOMES[dataset]) {
    throw new UserVisibleError(
      `${DATASET_LABELS[dataset]} variants are not available on ${referenceGenome}`
    )
  }

  const intervals = obj.exons
    .filter((exon) => exon.feature_type === 'CDS')
    .map((exon) => ({
      start: Math.max(1, exon.start - 75),
      stop: exon.stop + 75,
    }))
    .map(({ start, stop }) => `${obj.chrom}:${start}-${stop}`)
    .join(',')

  return ctx.queryInternalAPI(
    `/${referenceGenome}/gene/${
      obj.gene_id
    }/variants/?dataset=${dataset}&intervals=${encodeURIComponent(intervals)}`,
    {
      cacheKey: `variants:${dataset}:gene:${obj.gene_id}`,
      cacheExpiration: 604800,
    }
  )
}

const resolveVariantsInRegion = (obj, args, ctx) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  const referenceGenome = obj.reference_genome
  if (referenceGenome !== DATASET_REFERENCE_GENOMES[dataset]) {
    throw new UserVisibleError(
      `${DATASET_LABELS[dataset]} variants are not available on ${referenceGenome}`
    )
  }

  const regionId = `${obj.chrom}-${obj.start}-${obj.stop}`
  return ctx.queryInternalAPI(`/${referenceGenome}/region/${regionId}/variants/?dataset=${dataset}`)
}

const resolveVariantsInTranscript = (obj, args, ctx) => {
  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  const referenceGenome = obj.reference_genome
  if (referenceGenome !== DATASET_REFERENCE_GENOMES[dataset]) {
    throw new UserVisibleError(
      `${DATASET_LABELS[dataset]} variants are not available on ${referenceGenome}`
    )
  }

  const intervals = obj.exons
    .filter((exon) => exon.feature_type === 'CDS')
    .map((exon) => ({
      start: Math.max(1, exon.start - 75),
      stop: exon.stop + 75,
    }))
    .map(({ start, stop }) => `${obj.chrom}:${start}-${stop}`)
    .join(',')

  return ctx.queryInternalAPI(
    `/${referenceGenome}/transcript/${
      obj.transcript_id
    }/variants/?dataset=${dataset}&intervals=${encodeURIComponent(intervals)}`,
    {
      cacheKey: `variants:${dataset}:transcript:${obj.transcript_id}`,
      cacheExpiration: 3600,
    }
  )
}

module.exports = {
  Query: {
    variant: resolveVariant,
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

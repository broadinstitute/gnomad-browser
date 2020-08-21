const { UserVisibleError } = require('../errors')

const resolveStructuralVariant = (_, args, ctx) => {
  return ctx.queryInternalAPI(
    `/GRCh37/structural_variant/${args.variantId}/?dataset=${args.dataset}`
  )
}

const resolveStructuralVariantsInGene = (obj, args, ctx) => {
  const referenceGenome = obj.reference_genome
  if (referenceGenome !== 'GRCh37') {
    throw new UserVisibleError(
      `gnomAD v2 structural variants are not available on ${referenceGenome}`
    )
  }

  return ctx.queryInternalAPI(
    `/GRCh37/gene/${obj.symbol}/structural_variants/?dataset=${args.dataset}`,
    {
      cacheKey: `structural_variants:${args.dataset}:gene:${obj.symbol}`,
      cacheExpiration: 604800,
    }
  )
}

const resolveStructuralVariantsInRegion = (obj, args, ctx) => {
  const referenceGenome = obj.reference_genome
  if (referenceGenome !== 'GRCh37') {
    throw new UserVisibleError(
      `gnomAD v2 structural variants are not available on ${referenceGenome}`
    )
  }

  const regionId = `${obj.chrom}-${obj.start}-${obj.stop}`
  return ctx.queryInternalAPI(
    `/GRCh37/region/${regionId}/structural_variants/?dataset=${args.dataset}`
  )
}

module.exports = {
  Query: {
    structural_variant: resolveStructuralVariant,
  },
  Gene: {
    structural_variants: resolveStructuralVariantsInGene,
  },
  Region: {
    structural_variants: resolveStructuralVariantsInRegion,
  },
}

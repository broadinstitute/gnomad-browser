const { UserVisibleError } = require('../errors')

const DATASET_REFERENCE_GENOMES = {
  gnomad_r3: 'GRCh38',
  gnomad_r2_1: 'GRCh37',
  exac: 'GRCh37',
}

const DATASET_LABELS = {
  gnomad_r3: 'gnomAD v3',
  gnomad_r2_1: 'gnomAD v2',
  exac: 'ExAC',
}

const resolveExomeCoverageInRegion = (obj, _, ctx) => {
  // TODO: Remove this check after changing type of coverage's dataset argument
  if (obj.dataset.startsWith('gnomad_r2_1_')) {
    throw new UserVisibleError('Coverage is not available for gnomAD v2 subsets')
  }

  const referenceGenome = obj.reference_genome
  if (referenceGenome !== DATASET_REFERENCE_GENOMES[obj.dataset]) {
    throw new UserVisibleError(
      `${DATASET_LABELS[obj.dataset]} coverage is not available on ${referenceGenome}`
    )
  }

  const regionId = `${obj.chrom}-${obj.start}-${obj.stop}`
  return ctx.queryInternalAPI(
    `/${referenceGenome}/region/${regionId}/coverage/exome/?dataset=${obj.dataset}`
  )
}

const resolveGenomeCoverageInRegion = (obj, _, ctx) => {
  // TODO: Remove this check after changing type of coverage's dataset argument
  if (obj.dataset.startsWith('gnomad_r2_1_')) {
    throw new UserVisibleError('Coverage is not available for gnomAD v2 subsets')
  }

  const referenceGenome = obj.reference_genome
  if (referenceGenome !== DATASET_REFERENCE_GENOMES[obj.dataset]) {
    throw new UserVisibleError(
      `${DATASET_LABELS[obj.dataset]} coverage is not available on ${referenceGenome}`
    )
  }

  const regionId = `${obj.chrom}-${obj.start}-${obj.stop}`
  return ctx.queryInternalAPI(
    `/${referenceGenome}/region/${regionId}/coverage/genome/?dataset=${obj.dataset}`
  )
}

const resolveCoverageInGene = (obj, args, ctx) => {
  // TODO: Remove this check after changing type of coverage's dataset argument
  if (args.dataset.startsWith('gnomad_r2_1_')) {
    throw new UserVisibleError('Coverage is not available for gnomAD v2 subsets')
  }

  const referenceGenome = obj.reference_genome
  if (referenceGenome !== DATASET_REFERENCE_GENOMES[args.dataset]) {
    throw new UserVisibleError(
      `${DATASET_LABELS[args.dataset]} coverage is not available on ${referenceGenome}`
    )
  }

  return ctx.queryInternalAPI(
    `/${referenceGenome}/gene/${obj.gene_id}/coverage/?dataset=${args.dataset}`,
    {
      cacheKey: `coverage:${args.dataset}:gene:${obj.gene_id}`,
      cacheExpiration: 604800,
    }
  )
}

const resolveCoverageInTranscript = (obj, args, ctx) => {
  // TODO: Remove this check after changing type of coverage's dataset argument
  if (args.dataset.startsWith('gnomad_r2_1_')) {
    throw new UserVisibleError('Coverage is not available for gnomAD v2 subsets')
  }

  const referenceGenome = obj.reference_genome
  if (referenceGenome !== DATASET_REFERENCE_GENOMES[args.dataset]) {
    throw new UserVisibleError(
      `${DATASET_LABELS[args.dataset]} coverage is not available on ${referenceGenome}`
    )
  }

  return ctx.queryInternalAPI(
    `/${referenceGenome}/transcript/${obj.transcript_id}/coverage/?dataset=${args.dataset}`,
    {
      cacheKey: `coverage:${args.dataset}:transcript:${obj.transcript_id}`,
      cacheExpiration: 3600,
    }
  )
}

module.exports = {
  RegionCoverage: {
    exome: resolveExomeCoverageInRegion,
    genome: resolveGenomeCoverageInRegion,
  },
  Gene: {
    coverage: resolveCoverageInGene,
  },
  Transcript: {
    coverage: resolveCoverageInTranscript,
  },
}

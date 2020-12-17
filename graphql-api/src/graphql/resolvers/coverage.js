const { UserVisibleError } = require('../../errors')
const {
  fetchExomeCoverageForRegion,
  fetchGenomeCoverageForRegion,
  fetchCoverageForGene,
  fetchCoverageForTranscript,
} = require('../../queries/coverage-queries')

const formatCoverageBins = (bins) =>
  bins.map((bin) => ({
    pos: bin.pos,
    mean: bin.mean,
    median: bin.median,
    over_1: bin.over_x[0],
    over_5: bin.over_x[1],
    over_10: bin.over_x[2],
    over_15: bin.over_x[3],
    over_20: bin.over_x[4],
    over_25: bin.over_x[5],
    over_30: bin.over_x[6],
    over_50: bin.over_x[7],
    over_100: bin.over_x[8],
  }))

const resolveExomeCoverageInRegion = async (obj, args, ctx) => {
  const coverage = await fetchExomeCoverageForRegion(ctx.esClient, obj.dataset, obj)
  return formatCoverageBins(coverage)
}

const resolveGenomeCoverageInRegion = async (obj, args, ctx) => {
  const coverage = await fetchGenomeCoverageForRegion(ctx.esClient, obj.dataset, obj)
  return formatCoverageBins(coverage)
}

const resolveCoverageInGene = async (obj, args, ctx) => {
  const coverage = await fetchCoverageForGene(ctx.esClient, args.dataset, obj)

  return {
    exome: formatCoverageBins(coverage.exome),
    genome: formatCoverageBins(coverage.genome),
  }
}

const resolveCoverageInTranscript = async (obj, args, ctx) => {
  const coverage = await fetchCoverageForTranscript(ctx.esClient, args.dataset, obj)

  return {
    exome: formatCoverageBins(coverage.exome),
    genome: formatCoverageBins(coverage.genome),
  }
}

module.exports = {
  Region: {
    coverage: (obj, args) => {
      if (obj.stop - obj.start >= 2.5e6) {
        throw new UserVisibleError('Coverage is not available for a region this large')
      }

      // Forward region and dataset argument to exome/genome coverage resolvers.
      return { ...obj, dataset: args.dataset }
    },
  },
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

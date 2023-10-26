import { UserVisibleError } from '../../errors'
import {
  fetchTrackCallableCoverageForRegion,
  fetchTrackCallableCoverageForGene,
} from '../../queries/cnv-coverage-queries'

// const formatCoverageBins = (bins: any) =>
//   bins.map((bin: any) => ({
//     pos: bin.pos,
//     mean: bin.mean,
//     median: bin.median,
//     over_1: bin.over_x[0],
//     over_5: bin.over_x[1],
//     over_10: bin.over_x[2],
//     over_15: bin.over_x[3],
//     over_20: bin.over_x[4],
//     over_25: bin.over_x[5],
//     over_30: bin.over_x[6],
//     over_50: bin.over_x[7],
//     over_100: bin.over_x[8],
//   }))

const formatTrackCallableCoverageBins = (bins: any) =>
  bins.map((bin: any) => ({
    pos: bin.pos,
    percent_callable: bin[0],
  }))

const resolveTrackCallableCoverageInRegion = async (obj: any, _args: any, ctx: any) => {
  const coverage = await fetchTrackCallableCoverageForRegion(ctx.esClient, obj.dataset, obj)
  return formatTrackCallableCoverageBins(coverage)
}

const resolveTrackCallableCoverageInGene = async (obj: any, _args: any, ctx: any) => {
  try {
    console.log("fetchTrackCallableCoverageForGene In Resolver")
    const coverage = await fetchTrackCallableCoverageForGene(ctx.esClient, obj.dataset, obj)
    return formatTrackCallableCoverageBins(coverage)
  } catch (e) {
    console.error('Error resolver coverager:', e)
    throw e
  }
}

// const resolveGenomeCoverageInRegion = async (obj: any, _args: any, ctx: any) => {
//   const coverage = await fetchGenomeCoverageForRegion(ctx.esClient, obj.dataset, obj)
//   return formatCoverageBins(coverage)
// }

// const resolveCoverageInGene = async (obj: any, args: any, ctx: any) => {
//   const coverage = await fetchCoverageForGene(ctx.esClient, args.dataset, obj)

//   return {
//     exome: formatCoverageBins(coverage.exome),
//     genome: formatCoverageBins(coverage.genome),
//   }
// }

const resolvers = {
  Region: {
    coverage: (obj: any, args: any) => {
      if (obj.stop - obj.start >= 2.5e6) {
        throw new UserVisibleError('Coverage is not available for a region this large')
      }
      return { ...obj, dataset: args.dataset }
    },
  },
  RegionCoverage: {
    track_callable: resolveTrackCallableCoverageInRegion,
  },
  Gene: {
    track_callable: resolveTrackCallableCoverageInGene,
  },
}

export default resolvers
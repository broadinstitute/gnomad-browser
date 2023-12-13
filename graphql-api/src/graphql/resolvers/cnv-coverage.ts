import {
  fetchDelBurdenCoverageForGene,
  fetchDelBurdenCoverageForRegion,
  fetchDupBurdenCoverageForGene,
  fetchDupBurdenCoverageForRegion,
  fetchTrackCallableCoverageForGene,
  fetchTrackCallableCoverageForRegion,
} from '../../queries/cnv-coverage-queries'

const createResolver = (fetchCoverage: any) => async (obj: any, args: any, ctx: any) => {
  return fetchCoverage(ctx.esClient, args.dataset, obj)
}

const resolveTrackCallableCoverageInGene = createResolver(fetchTrackCallableCoverageForGene)
const resolveDelBurdenCoverageInGene = createResolver(fetchDelBurdenCoverageForGene)
const resolveDupBurdenCoverageInGene = createResolver(fetchDupBurdenCoverageForGene)
const resolveTrackCallableCoverageInRegion = createResolver(fetchTrackCallableCoverageForRegion)
const resolveDelBurdenCoverageInRegion = createResolver(fetchDelBurdenCoverageForRegion)
const resolveDupBurdenCoverageInRegion = createResolver(fetchDupBurdenCoverageForRegion)

const resolvers = {
  Gene: {
    cnv_track_callable_coverage: resolveTrackCallableCoverageInGene,
    cnv_del_burden_coverage: resolveDelBurdenCoverageInGene,
    cnv_dup_burden_coverage: resolveDupBurdenCoverageInGene,
  },
  Region: {
    cnv_track_callable_coverage: resolveTrackCallableCoverageInRegion,
    cnv_del_burden_coverage: resolveDelBurdenCoverageInRegion,
    cnv_dup_burden_coverage: resolveDupBurdenCoverageInRegion,
  },
}

export default resolvers

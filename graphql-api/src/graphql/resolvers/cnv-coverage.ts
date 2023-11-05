import { fetchTrackCallableCoverageForGene } from '../../queries/cnv-coverage-queries'

const resolveTrackCallableCoverageInGene = async (obj: any, args: any, ctx: any) => {
  return fetchTrackCallableCoverageForGene(ctx.esClient, args.dataset, obj)
}

const resolvers = {
  Gene: {
    cnv_track_callable_coverage: resolveTrackCallableCoverageInGene,
  },
}

export default resolvers

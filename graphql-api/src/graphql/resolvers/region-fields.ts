import { fetchGenesByRegion } from '../../queries/gene-queries'
import { fetchNccConstraintsByRegion } from '../../queries/genomic-constraint-queries'

const resolveGenesInRegion = (obj: any, _args: any, ctx: any) => {
  return fetchGenesByRegion(ctx.esClient, obj)
}

const resolveNCCsInRegion = (obj: any, _args: any, ctx: any) => {
  return fetchNccConstraintsByRegion(ctx.esClient, obj)
}

const resolvers = {
  Region: {
    genes: resolveGenesInRegion,
    non_coding_constraints: resolveNCCsInRegion,
  },
}
export default resolvers

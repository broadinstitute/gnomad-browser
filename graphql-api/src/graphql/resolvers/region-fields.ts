import type { GraphQLContext } from '../../app'
import { fetchGenesByRegion } from '../../queries/gene-queries'
import { fetchNccConstraintsByRegion } from '../../queries/genomic-constraint-queries'

const resolveGenesInRegion = (obj: any, _args: any, ctx: GraphQLContext) => {
  const geneModelsGrch38 = ctx.parquetDataStore?.geneModelsGrch38
  if (obj.reference_genome === 'GRCh38' && geneModelsGrch38 !== undefined) {
    return geneModelsGrch38.fetchGenesInRegion(obj.chrom, obj.start, obj.stop)
  }
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

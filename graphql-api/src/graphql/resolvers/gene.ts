import type { GraphQLContext } from '../context'

const { UserVisibleError } = require('../../errors')
const {
  fetchGeneById,
  fetchGeneBySymbol,
  fetchGenesMatchingText,
} = require('../../queries/gene-queries')

const addDefaultVariantCooccurrenceCounts = (gene: any) => {
  return {
    heterozygous_variant_cooccurrence_counts: [],
    homozygous_variant_cooccurrence_counts: [],
    ...gene,
  }
}

const fetchGeneByIdFromParquetOrElasticsearch = (args: any, ctx: GraphQLContext) => {
  const { parquetDataStore } = ctx
  if (args.reference_genome === 'GRCh38' && parquetDataStore !== null) {
    return parquetDataStore.geneModelsGrch38.fetchGeneById(args.gene_id)
  }

  return fetchGeneById(ctx.esClient, args.gene_id, args.reference_genome)
}

const resolveGene = async (_: any, args: any, ctx: GraphQLContext) => {
  if (args.gene_id) {
    const gene = await fetchGeneByIdFromParquetOrElasticsearch(args, ctx)
    if (!gene) {
      throw new UserVisibleError('Gene not found')
    }
    return addDefaultVariantCooccurrenceCounts(gene)
  }

  if (args.gene_symbol) {
    const gene = await fetchGeneBySymbol(ctx.esClient, args.gene_symbol, args.reference_genome)
    if (!gene) {
      throw new UserVisibleError('Gene not found')
    }
    return addDefaultVariantCooccurrenceCounts(gene)
  }

  throw new UserVisibleError("One of 'gene_id' or 'gene_symbol' is required")
}

const resolveGeneSearch = (_: any, args: any, ctx: any) => {
  return fetchGenesMatchingText(ctx.esClient, args.query, args.reference_genome)
}

const resolvers = {
  Query: {
    gene: resolveGene,
    gene_search: resolveGeneSearch,
  },
}

export default resolvers

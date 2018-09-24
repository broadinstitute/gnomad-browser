import { GraphQLInt, GraphQLFloat, GraphQLObjectType, GraphQLString } from 'graphql'

export const GeneResultType = new GraphQLObjectType({
  name: 'GeneResult',
  fields: {
    gene_name: { type: GraphQLString },
    description: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    case_lof: { type: GraphQLInt },
    ctrl_lof: { type: GraphQLInt },
    pval_lof: { type: GraphQLFloat },
    case_mpc: { type: GraphQLInt },
    ctrl_mpc: { type: GraphQLInt },
    pval_mpc: { type: GraphQLFloat },
    pval_meta: { type: GraphQLFloat },
  },
})

export const fetchGeneResultByGeneId = async (ctx, geneId) => {
  const response = await ctx.database.elastic.search({
    index: BROWSER_CONFIG.elasticsearch.geneResults.index,
    type: BROWSER_CONFIG.elasticsearch.geneResults.type,
    size: 1,
    body: {
      query: {
        match: {
          gene_id: geneId,
        },
      },
    },
  })
  return response.hits.hits[0]._source // eslint-disable-line no-underscore-dangle
}

export const fetchAllGeneResults = async ctx => {
  const response = await ctx.database.elastic.search({
    index: BROWSER_CONFIG.elasticsearch.geneResults.index,
    type: BROWSER_CONFIG.elasticsearch.geneResults.type,
    size: 4000,
    body: {
      query: {
        match_all: {},
      },
      sort: [{ pval_meta: { order: 'asc' } }],
    },
  })
  return response.hits.hits.map(hit => hit._source) // eslint-disable-line no-underscore-dangle
}

import { GraphQLObjectType, GraphQLString } from 'graphql'

export const SearchResultType = new GraphQLObjectType({
  name: 'SearchResult',
  fields: {
    label: { type: GraphQLString },
    url: { type: GraphQLString },
  },
})

export const fetchSearchResults = async (ctx, query) => {
  const response = await ctx.database.elastic.search({
    index: BROWSER_CONFIG.elasticsearch.geneResults.index,
    type: BROWSER_CONFIG.elasticsearch.geneResults.type,
    size: 5,
    _source: ['gene_id', 'gene_name'],
    body: {
      query: {
        bool: {
          must: {
            bool: {
              should: [
                { prefix: { gene_id: query.toUpperCase() } },
                { prefix: { gene_name: query.toUpperCase() } },
              ],
            },
          },
          filter: {
            term: { analysis_group: BROWSER_CONFIG.analysisGroups.overallGroup },
          },
        },
      },
    },
  })

  return response.hits.hits.map(hit => {
    const result = hit._source // eslint-disable-line no-underscore-dangle
    return {
      label: result.gene_name,
      url: `/gene/${result.gene_name}`,
    }
  })
}

import { GraphQLObjectType, GraphQLString } from 'graphql'

import browserConfig from '@browser/config'

export const SearchResultType = new GraphQLObjectType({
  name: 'SearchResult',
  fields: {
    label: { type: GraphQLString },
    url: { type: GraphQLString },
  },
})

export const fetchSearchResults = async (ctx, query) => {
  const response = await ctx.database.elastic.search({
    index: browserConfig.elasticsearch.geneResults.index,
    type: browserConfig.elasticsearch.geneResults.type,
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
            term: { analysis_group: browserConfig.geneResults.groups.options[0] },
          },
        },
      },
    },
  })

  return response.hits.hits.map(hit => {
    const result = hit._source // eslint-disable-line no-underscore-dangle
    return {
      label: result.gene_name,
      url: `/gene/${result.gene_id || result.gene_name}`,
    }
  })
}

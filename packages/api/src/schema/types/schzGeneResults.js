import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLFloat,
} from 'graphql'

const schzGeneResultsType = new GraphQLObjectType({
  name: 'SchizophreniaGeneResults',
  fields: () => ({
    geneName: { type: GraphQLString },
    dnmLof: { type: GraphQLInt },
    caseLof: { type: GraphQLInt },
    ctrlLof: { type: GraphQLInt },
    caseMis: { type: GraphQLInt },
    ctrlMis: { type: GraphQLInt },
    pCaco: { type: GraphQLFloat },
    pMeta: { type: GraphQLFloat },
  }),
})

export default schzGeneResultsType

export function lookUpSchzGeneResultsByGeneName (client, geneName) {
  return new Promise((resolve, reject) => {
    client.search({
      index: 'schizophrenia_gene_results',
      type: 'result',
      size: 1,
      // filter_path: 'filter_path‌​=hits.hits._source',
      body: {
        query: {
          match: {
            geneName,
          },
        },
      },
    }).then(response => {
      resolve(response.hits.hits[0]._source)
    })
  })
}

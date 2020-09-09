import { GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

export const LoFCurationInGeneType = new GraphQLObjectType({
  name: 'LoFCurationInGene',
  fields: {
    verdict: { type: new GraphQLNonNull(GraphQLString) },
    flags: { type: new GraphQLList(GraphQLString) },
  },
})

export const LoFCurationType = new GraphQLObjectType({
  name: 'LoFCuration',
  fields: {
    gene_id: { type: new GraphQLNonNull(GraphQLString) },
    gene_symbol: { type: GraphQLString },
    verdict: { type: new GraphQLNonNull(GraphQLString) },
    flags: { type: new GraphQLList(GraphQLString) },
  },
})

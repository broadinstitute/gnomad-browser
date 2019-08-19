import { GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql'

const exonType = new GraphQLObjectType({
  name: 'Exon',
  fields: () => ({
    _id: { type: GraphQLString },
    start: { type: GraphQLInt },
    transcript_id: { type: GraphQLString },
    feature_type: { type: GraphQLString },
    strand: { type: GraphQLString },
    stop: { type: GraphQLInt },
    chrom: { type: GraphQLString },
    gene_id: { type: GraphQLString },
  }),
})

export default exonType

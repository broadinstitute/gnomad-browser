import { GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql'

export const ExonType = new GraphQLObjectType({
  name: 'Exon',
  fields: {
    feature_type: { type: GraphQLString },
    start: { type: GraphQLInt },
    stop: { type: GraphQLInt },
  },
})

export const fetchExonsByTranscriptId = (ctx, transcriptId) =>
  ctx.database.mongo
    .collection('exons')
    .find({ transcript_id: transcriptId })
    .toArray()

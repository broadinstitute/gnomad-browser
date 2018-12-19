import { GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import { ExonType, fetchExonsByTranscriptId } from './exon'

export const TranscriptType = new GraphQLObjectType({
  name: 'Transcript',
  fields: {
    transcript_id: { type: GraphQLString },
    strand: { type: GraphQLString },
    exons: {
      type: new GraphQLList(ExonType),
      resolve: (obj, args, ctx) => fetchExonsByTranscriptId(ctx, obj.transcript_id),
    },
  },
})

export const fetchTranscriptById = (ctx, transcriptId) =>
  ctx.database.mongo.collection('transcripts').findOne({ transcript_id: transcriptId })

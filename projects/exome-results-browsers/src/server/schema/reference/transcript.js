import { GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import { ExonType, fetchExonsByTranscriptId } from './exon'
import { GtexTissueExpressionType, fetchGtexTissueExpressionByTranscriptId } from './gtex'

export const TranscriptType = new GraphQLObjectType({
  name: 'Transcript',
  fields: {
    transcript_id: { type: GraphQLString },
    exons: {
      type: new GraphQLList(ExonType),
      resolve: (obj, args, ctx) => fetchExonsByTranscriptId(ctx, obj.transcript_id),
    },
    gtex_tissue_expression: {
      type: GtexTissueExpressionType,
      resolve: (obj, args, ctx) => fetchGtexTissueExpressionByTranscriptId(ctx, obj.transcript_id),
    },
  },
})

export const fetchTranscriptById = (ctx, transcriptId) =>
  ctx.database.mongo.collection('transcripts').findOne({ transcript_id: transcriptId })

export const fetchTranscriptsByGeneId = (ctx, geneId) =>
  ctx.database.mongo
    .collection('transcripts')
    .find({ gene_id: geneId })
    .toArray()

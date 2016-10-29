/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql'

// import coverageType, { lookUpCoverageByStartStop } from './coverage'
// import variantType, { lookUpVariantsByGeneId } from './variant'
import exonType, { lookUpExonsByTranscriptId } from './exon'


const transcriptType = new GraphQLObjectType({
  name: 'Transcript',
  fields: () => ({
    _id: { type: GraphQLString },
    start: { type: GraphQLInt },
    transcript_id: { type: GraphQLString },
    strand: { type: GraphQLString },
    stop: { type: GraphQLInt },
    xstart: { type: GraphQLInt },
    chrom: { type: GraphQLInt },
    gene_id: { type: GraphQLInt },
    xstop: { type: GraphQLInt },
    exons: {
      type: new GraphQLList(exonType),
      resolve: (obj, args, ctx) => lookUpExonsByTranscriptId(ctx.db, obj.transcript_id),
    },
  }),
})

export default transcriptType

export const lookupTranscriptsByTranscriptId = (db, transcript_id) =>
  db.collection('transcripts').findOne({ transcript_id })

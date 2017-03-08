/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql'

// import coverageType, { lookupCoverageByStartStop } from './coverage'
import variantType, { lookupVariantsByTranscriptId } from './variant'
import exonType, { lookupExonsByTranscriptId } from './exon'


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
    gene_id: { type: GraphQLString },
    xstop: { type: GraphQLInt },
    exome_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) =>
          lookupVariantsByTranscriptId(ctx.database.gnomad, 'exome_variants', obj.transcript_id),
    },
    genome_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) =>
        lookupVariantsByTranscriptId(ctx.database.gnomad, 'genome_variants', obj.transcript_id),
    },
    exons: {
      type: new GraphQLList(exonType),
      resolve: (obj, args, ctx) => lookupExonsByTranscriptId(ctx.database.gnomad, obj.transcript_id),
    },
  }),
})

export default transcriptType

export const lookupTranscriptsByTranscriptId = (db, transcript_id) =>
  db.collection('transcripts').findOne({ transcript_id })

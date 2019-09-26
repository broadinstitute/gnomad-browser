import { GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import {
  ExacConstraintType,
  GnomadConstraintType,
  fetchExacConstraintByTranscript,
  fetchGnomadConstraintByTranscript,
} from './constraint'

const ExonType = new GraphQLObjectType({
  name: 'Exon',
  fields: {
    feature_type: { type: GraphQLString },
    start: { type: GraphQLInt },
    stop: { type: GraphQLInt },
  },
})

export const TranscriptType = new GraphQLObjectType({
  name: 'Transcript',
  fields: {
    transcript_id: { type: GraphQLString },
    strand: { type: GraphQLString },
    exons: { type: new GraphQLList(ExonType) },
    exac_constraint: {
      type: ExacConstraintType,
      resolve: (obj, args, ctx) => fetchExacConstraintByTranscript(ctx, obj.transcript_id),
    },
    gnomad_constraint: {
      type: GnomadConstraintType,
      resolve: (obj, args, ctx) => fetchGnomadConstraintByTranscript(ctx, obj.transcript_id),
    },
  },
})

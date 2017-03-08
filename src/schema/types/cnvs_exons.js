/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
} from 'graphql'

const cnvsExons = new GraphQLObjectType({
  name: 'CNVsExons',
  fields: () => ({
    'dup0': { type: GraphQLInt },
    'duppop60': { type: GraphQLString },
    'del60': { type: GraphQLInt },
    'stop': { type: GraphQLInt },
    'del0': { type: GraphQLInt },
    'delpop60': { type: GraphQLString },
    'chrom': { type: GraphQLInt },
    'dup60': { type: GraphQLInt },
    'transcript': { type: GraphQLString },
    'duppop0': { type: GraphQLString },
    'start': { type: GraphQLInt },
    'xstop': { type: GraphQLInt },
    'delpop0': { type: GraphQLString },
    'xstart': { type: GraphQLInt },
    'gene': { type: GraphQLString },
  }),
})

export default cnvsExons

export const lookUpCnvsExonsByTranscriptId = (db, transcript_id) =>
  db.collection('cnvs').find({ transcript: transcript_id }).toArray()

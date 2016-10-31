/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
} from 'graphql'


const exonType = new GraphQLObjectType({
  name: 'Exon',
  fields: () => ({
    _id: { type: GraphQLString },
    start: { type: GraphQLInt },
    transcript_id: { type: GraphQLString },
    feature_type: { type: GraphQLString },
    strand: { type: GraphQLString },
    stop: { type: GraphQLInt },
    xstart: { type: GraphQLInt },
    chrom: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    xstop: { type: GraphQLInt },
  }),
})

export default exonType

export const lookUpExonsByTranscriptId = (db, transcript_id) =>
  db.collection('exons').find({ transcript_id }).toArray()

export const lookUpExonsByStartStop = (db, start, stop) =>
  db.collection('exons').find({ start: { '$gte': Number(start), '$lte': Number(stop) } }).toArray()

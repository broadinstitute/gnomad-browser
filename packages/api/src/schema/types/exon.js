/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
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
    chrom: { type: GraphQLString },
    gene_id: { type: GraphQLString },
  }),
})

export default exonType


export const lookupExonsByTranscriptId = (db, transcript_id) =>
  db.collection('exons').find({ transcript_id }).toArray()

export const lookupExonsByStartStop = (db, start, stop) =>
  db.collection('exons').find({ start: { '$gte': Number(start), '$lte': Number(stop) } }).toArray()

export const lookupExonsByGeneId = (db, gene_id) =>
  db.collection('exons').find({ gene_id }).toArray()

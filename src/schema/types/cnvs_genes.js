/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
} from 'graphql'

const cnvsGene = new GraphQLObjectType({
  name: 'CNVsGene',
  fields: () => ({
    'dup0': { type: GraphQLInt },
    'symbol': { type: GraphQLString },
    'del60': { type: GraphQLInt },
    'rank': { type: GraphQLInt },
    'del0': { type: GraphQLInt },
    'cnv0': { type: GraphQLInt },
    'dup60': { type: GraphQLInt },
    'cnv_score': { type: GraphQLFloat },
    'cnv60': { type: GraphQLInt },
    'dup_score': { type: GraphQLFloat },
    'del_score': { type: GraphQLFloat },
    'gene': { type: GraphQLString },
  }),
})

export default cnvsGene

export const lookUpCnvsGeneByGeneName = (db, gene_id) =>
  db.collection('cnvgenes').find({ 'gene': gene_id }).toArray()

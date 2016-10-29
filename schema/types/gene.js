/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql'

import coverageType, { lookUpCoverageByStartStop } from './coverage'
import variantType, { lookUpVariantsByGeneId } from './variant'
import transcriptType, { lookupTranscriptsByTranscriptId } from './transcript'

const geneType = new GraphQLObjectType({
  name: 'Gene',
  fields: () => ({
    _id: { type: GraphQLString },
    omim_description: { type: GraphQLString },
    stop: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    omim_accession: { type: GraphQLString },
    chrom: { type: GraphQLString },
    strand: { type: GraphQLString },
    full_gene_name: { type: GraphQLString },
    gene_name_upper: { type: GraphQLString },
    other_names: { type: new GraphQLList(GraphQLString) },
    canonical_transcript: { type: GraphQLString },
    start: { type: GraphQLInt },
    xstop: { type: GraphQLInt },
    xstart: { type: GraphQLString },
    gene_name: { type: GraphQLString },
    exac_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) =>
        lookUpCoverageByStartStop(ctx.db, 'exome_coverage', obj.xstart, obj.xstop),
    },
    variants_in_gene: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) =>
        lookUpVariantsByGeneId(ctx.db, obj.gene_id),
    },
    transcript: {
      type: transcriptType,
      resolve: (obj, args, ctx) =>
        lookupTranscriptsByTranscriptId(ctx.db, obj.canonical_transcript),
    },
  }),
})


export default geneType

export const lookUpGeneByGeneId = (db, gene_id) =>
  db.collection('genes').findOne({ gene_id })

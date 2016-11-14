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
import exonType, { lookUpExonsByStartStop } from './exon'

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
    exome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) =>
        lookUpCoverageByStartStop(ctx.db, 'exome_coverage', obj.xstart, obj.xstop),
    },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) =>
        lookUpCoverageByStartStop(ctx.db, 'genome_coverage', obj.xstart, obj.xstop),
    },
    exome_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) =>
        lookUpVariantsByGeneId(ctx.db, 'variants', obj.gene_id),
    },
    genome_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) =>
        lookUpVariantsByGeneId(ctx.db, 'gnomadVariants2', obj.gene_id),
    },
    transcript: {
      type: transcriptType,
      resolve: (obj, args, ctx) =>
        lookupTranscriptsByTranscriptId(ctx.db, obj.canonical_transcript),
    },
    exons: {
      type: new GraphQLList(exonType),
      resolve: (obj, args, ctx) => lookUpExonsByStartStop(ctx.db, obj.start, obj.stop),
    },
  }),
})

export default geneType

export const lookUpGeneByGeneId = (db, gene_id) =>
  db.collection('genes').findOne({ gene_id })

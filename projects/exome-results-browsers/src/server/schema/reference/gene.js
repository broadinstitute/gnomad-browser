import { GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import { GeneResultType, fetchGeneResultByGeneId } from '../analysis/geneResult'
import { VariantType, fetchVariantsByGeneId } from '../analysis/variant'
import { TranscriptType, fetchTranscriptById, fetchTranscriptsByGeneId } from './transcript'

export const GeneType = new GraphQLObjectType({
  name: 'Gene',
  fields: {
    _id: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    gene_name: { type: GraphQLString },
    full_gene_name: { type: GraphQLString },
    other_names: { type: new GraphQLList(GraphQLString) },
    chrom: { type: GraphQLString },
    canonical_transcript: { type: GraphQLString },
    strand: { type: GraphQLString },
    transcript: {
      type: TranscriptType,
      resolve: (obj, args, ctx) => fetchTranscriptById(ctx, obj.canonical_transcript),
    },
    transcripts: {
      type: new GraphQLList(TranscriptType),
      resolve: (obj, args, ctx) => fetchTranscriptsByGeneId(ctx, obj.gene_id),
    },
    geneResult: {
      type: GeneResultType,
      resolve: (obj, args, ctx) => fetchGeneResultByGeneId(ctx, obj.gene_id),
    },
    variants: {
      type: new GraphQLList(VariantType),
      resolve: (obj, args, ctx) => fetchVariantsByGeneId(ctx, obj.gene_id),
    },
  },
})

export const fetchGeneById = (ctx, geneId) =>
  ctx.database.mongo.collection('genes').findOne({ gene_id: geneId })

export const fetchGeneByName = (ctx, geneName) =>
  ctx.database.mongo.collection('genes').findOne({ gene_name: geneName })

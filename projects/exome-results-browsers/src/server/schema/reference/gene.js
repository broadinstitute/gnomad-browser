import { GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { AnalysisGroupArgumentType } from '../analysis/analysisGroup'
import {
  GeneResultType,
  fetchOverallGeneResultByGeneId,
  fetchGroupGeneResultsByGeneId,
} from '../analysis/geneResult'
import { VariantType, fetchVariantsByGeneId } from '../analysis/variant'
import { TranscriptType, fetchTranscriptById, fetchTranscriptsByGeneId } from './transcript'

export const GeneType = new GraphQLObjectType({
  name: 'Gene',
  fields: {
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
    overallGeneResult: {
      type: GeneResultType,
      resolve: (obj, args, ctx) => fetchOverallGeneResultByGeneId(ctx, obj.gene_id),
    },
    groupGeneResults: {
      type: new GraphQLList(GeneResultType),
      resolve: (obj, args, ctx) => fetchGroupGeneResultsByGeneId(ctx, obj.gene_id),
    },
    variants: {
      type: new GraphQLList(VariantType),
      args: {
        analysis_group: { type: new GraphQLNonNull(AnalysisGroupArgumentType) },
      },
      resolve: (obj, args, ctx) => fetchVariantsByGeneId(ctx, obj.gene_id, args.analysis_group),
    },
  },
})

export const fetchGeneById = (ctx, geneId) =>
  ctx.database.mongo.collection('genes').findOne({ gene_id: geneId })

export const fetchGeneByName = (ctx, geneName) =>
  ctx.database.mongo.collection('genes').findOne({ gene_name: geneName })

import { GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { UserVisibleError } from '../utilities/errors'
import { AnalysisGroupArgumentType } from './analysisGroup'
import { GeneResultType, fetchGeneResultsByGeneId } from './geneResult'
import { VariantType, fetchVariantsByGeneId } from './variant'
import { TranscriptType, fetchTranscriptById } from './transcript'

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
    results: {
      type: new GraphQLList(GeneResultType),
      resolve: (obj, args, ctx) => fetchGeneResultsByGeneId(ctx, obj.gene_id),
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

const fetchGene = async (ctx, query) => {
  const gene = await ctx.database.mongo.collection('genes').findOne(query)
  if (!gene) {
    throw new UserVisibleError('Gene not found')
  }
  return gene
}

export const fetchGeneById = (ctx, geneId) => fetchGene(ctx, { gene_id: geneId })

export const fetchGeneByName = (ctx, geneName) => fetchGene(ctx, { gene_name: geneName })

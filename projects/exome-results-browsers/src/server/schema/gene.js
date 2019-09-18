import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { UserVisibleError } from '../utilities/errors'
import { GeneResultType, fetchGeneResultsForGene } from './geneResult'
import { VariantType, VariantResultGroupIdType, fetchVariantsByGeneId } from './variant'
import { TranscriptType } from './transcript'

export const GeneType = new GraphQLObjectType({
  name: 'Gene',
  fields: {
    gene_id: { type: new GraphQLNonNull(GraphQLString) },
    symbol: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: GraphQLString },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
    omim_id: { type: GraphQLString },
    canonical_transcript: { type: TranscriptType },
    results: {
      type: new GraphQLList(GeneResultType),
      resolve: (obj, args, ctx) => fetchGeneResultsForGene(ctx, obj),
    },
    variants: {
      type: new GraphQLList(VariantType),
      args: {
        analysis_group: { type: new GraphQLNonNull(VariantResultGroupIdType) },
      },
      resolve: (obj, args, ctx) => fetchVariantsByGeneId(ctx, obj.gene_id, args.analysis_group),
    },
  },
})

export const fetchGeneById = async (ctx, geneId) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'exome_results_genes',
      type: 'documents',
      id: geneId,
    })

    return response._source // eslint-disable-line no-underscore-dangle
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError('Gene not found')
    }
    throw err
  }
}

export const fetchGeneBySymbol = async (ctx, geneSymbol) => {
  const response = await ctx.database.elastic.search({
    index: 'exome_results_genes',
    type: 'documents',
    body: {
      query: {
        bool: {
          filter: { term: { symbol_upper_case: geneSymbol.toUpperCase() } },
        },
      },
    },
    size: 1,
  })

  if (response.hits.total === 0) {
    throw new UserVisibleError('Gene not found')
  }

  return response.hits.hits[0]._source // eslint-disable-line no-underscore-dangle
}

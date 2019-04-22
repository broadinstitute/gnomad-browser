import { GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import {
  AnalysisGroupArgumentType,
  AnalysisGroupType,
  fetchAnalysisGroupsForVariant,
} from './analysisGroup'
import { GeneResultType, fetchAllGeneResultsForAnalysisGroup } from './geneResult'
import { SearchResultType, fetchSearchResults } from './search'
import { GeneType, fetchGeneById, fetchGeneByName } from './gene'

export const RootType = new GraphQLObjectType({
  name: 'Root',
  fields: {
    gene: {
      type: GeneType,
      args: {
        gene_name: { type: GraphQLString },
        gene_id: { type: GraphQLString },
        filter: { type: GraphQLString },
      },
      resolve: (obj, args, ctx) => {
        if (args.gene_id) {
          return fetchGeneById(ctx, args.gene_id)
        }
        if (args.gene_name) {
          return fetchGeneByName(ctx, args.gene_name)
        }
        throw Error('One of "gene_id" or "gene_name" required')
      },
    },
    geneResults: {
      type: new GraphQLList(GeneResultType),
      args: {
        analysis_group: { type: new GraphQLNonNull(AnalysisGroupArgumentType) },
      },
      resolve: (obj, args, ctx) => fetchAllGeneResultsForAnalysisGroup(ctx, args.analysis_group),
    },
    analysisGroups: {
      type: new GraphQLList(AnalysisGroupType),
      args: {
        variant_id: { type: GraphQLString },
      },
      resolve: (obj, args, ctx) => fetchAnalysisGroupsForVariant(ctx, args.variant_id),
    },
    search: {
      type: new GraphQLList(SearchResultType),
      args: {
        query: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => fetchSearchResults(ctx, args.query),
    },
  },
})

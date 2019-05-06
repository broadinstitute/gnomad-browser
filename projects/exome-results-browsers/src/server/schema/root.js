import { GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { UserVisibleError } from '../utilities/errors'
import { GeneType, fetchGeneById, fetchGeneByName } from './gene'
import {
  GeneResultType,
  GeneResultGroupIdType,
  fetchAllGeneResultsForAnalysisGroup,
} from './geneResult'
import { SearchResultType, fetchSearchResults } from './search'
import { VariantDetailsType, fetchVariantDetails } from './variant'

export const RootType = new GraphQLObjectType({
  name: 'Root',
  fields: {
    gene: {
      type: GeneType,
      args: {
        gene_name: { type: GraphQLString },
        gene_id: { type: GraphQLString },
      },
      resolve: (obj, args, ctx) => {
        if (args.gene_id) {
          return fetchGeneById(ctx, args.gene_id)
        }
        if (args.gene_name) {
          return fetchGeneByName(ctx, args.gene_name)
        }
        throw new UserVisibleError('One of "gene_id" or "gene_name" is required')
      },
    },
    geneResults: {
      type: new GraphQLList(GeneResultType),
      args: {
        analysis_group: { type: new GraphQLNonNull(GeneResultGroupIdType) },
      },
      resolve: (obj, args, ctx) => fetchAllGeneResultsForAnalysisGroup(ctx, args.analysis_group),
    },
    search: {
      type: new GraphQLList(SearchResultType),
      args: {
        query: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => fetchSearchResults(ctx, args.query),
    },
    variant: {
      type: VariantDetailsType,
      args: {
        variant_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => fetchVariantDetails(ctx, args.variant_id),
    },
  },
})

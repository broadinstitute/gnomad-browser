import { GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import { AnalysisGroupType, fetchAnalysisGroupsForVariant } from './analysis/analysisGroup'
import { GeneResultType, fetchAllGeneResults } from './analysis/geneResult'
import { GeneType, fetchGeneById, fetchGeneByName } from './reference/gene'

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
      resolve: (obj, args, ctx) => fetchAllGeneResults(ctx),
    },
    analysisGroups: {
      type: new GraphQLList(AnalysisGroupType),
      args: {
        variant_id: { type: GraphQLString },
      },
      resolve: (obj, args, ctx) => fetchAnalysisGroupsForVariant(ctx, args.variant_id),
    },
  },
})

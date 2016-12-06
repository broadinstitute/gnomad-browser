import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  // GraphQLList,
  GraphQLNonNull,
} from 'graphql'

import geneType, {
  lookupGeneByGeneId,
  lookupGeneByName,
} from './types/gene'

import transcriptType, { lookupTranscriptById } from './types/transcript'
import regionType from './types/region'
// import variantsType from './types/variant'
// import coverageType from './types/coverage'

const rootType = new GraphQLObjectType({
  name: 'Root',
  description: `
The fields below allow for different ways to look up gnomAD data. Click on the the Gene, Variant, or Region types to see more information.
  `,
  fields: () => ({
    lookup_by_gene_id: {
      description: 'Look up variant data by gene ID. Example: ENSG00000169174.',
      type: geneType,
      args: {
        gene_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => {
        console.log(ctx)
        return lookupGeneByGeneId(ctx.db, args.gene_id)
      },
    },
    lookup_by_gene_name: {
      description: 'Look up variant data by gene name. Example: PCSK9.',
      type: geneType,
      args: {
        gene_name: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) =>
        lookupGeneByName(ctx.db, args.gene_name),
    },
    lookup_by_transcript_id: {
      description: 'Look up variant data by transcript ID. Example: ENST00000407236.',
      type: transcriptType,
      args: {
        transcript_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => {
        console.log(ctx)
        return lookupTranscriptById(ctx.db, args.transcript_id)
      },
    },
    lookup_by_region_bounds: {
      description: 'Look up variant data by start/stop. Example: (xstart: 1055530526, xstop: 1055505222).',
      type: regionType,
      args: {
        xstart: { type: new GraphQLNonNull(GraphQLInt) },
        xstop: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (obj, args) => ({ xstart: args.xstart, xstop: args.xstop }),
    },
  }),
})

const Schema = new GraphQLSchema({ query: rootType })

export default Schema

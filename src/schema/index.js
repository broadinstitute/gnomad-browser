import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLNonNull,
} from 'graphql'

import geneType, {
  lookupGeneByGeneId,
  lookupGeneByName,
} from './types/gene'

import transcriptType, {
  lookupTranscriptsByTranscriptId,
} from './types/transcript'

import variantType, {
  variantResolver,
} from './types/variant'

import regionType from './types/region'

const rootType = new GraphQLObjectType({
  name: 'Root',
  description: `
The fields below allow for different ways to look up gnomAD data. Click on the the Gene, Variant, or Region types to see more information.
  `,
  fields: () => ({
    gene: {
      description: 'Look up variant data by gene name. Example: PCSK9.',
      type: geneType,
      args: {
        gene_name: { type: GraphQLString },
        gene_id: { type: GraphQLString },
      },
      resolve: (obj, args, ctx) => {
        if (args.gene_name) {
          return lookupGeneByName(ctx.database.gnomad, args.gene_name)
        }
        if (args.gene_id) {
          return lookupGeneByGeneId(ctx.database.gnomad, args.gene_id)
        }
        return 'No lookup found'
      },
    },
    transcript: {
      description: 'Look up variant data by transcript ID. Example: ENST00000407236.',
      type: transcriptType,
      args: {
        transcript_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => {
        console.log(ctx)
        return lookupTranscriptsByTranscriptId(ctx.database.gnomad, args.transcript_id)
      },
    },
    region: {
      description: 'Look up variant data by start/stop. Example: (xstart: 1055530526, xstop: 1055505222).',
      type: regionType,
      args: {
        xstart: { type: new GraphQLNonNull(GraphQLInt) },
        xstop: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (obj, args) => ({ xstart: args.xstart, xstop: args.xstop }),
    },
    variant: {
      description: 'Look up a single variant or rsid. Example: 1-55516888-G-GA.',
      type: variantType,
      args: {
        id: { type: GraphQLString },
        rsid: { type: GraphQLString },
        source: {
          type: GraphQLString,
          description: 'Please specify genome, exome, or exacv1',
        },
      },
      resolve: variantResolver,
    },
  }),
})

const Schema = new GraphQLSchema({ query: rootType })

export default Schema

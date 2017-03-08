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

import transcriptType, {
  lookupTranscriptsByTranscriptId,
} from './types/transcript'

import variantType, {
  lookupVariant,
  lookupVariantRsid,
} from './types/variant'

import regionType from './types/region'

const rootType = new GraphQLObjectType({
  name: 'Root',
  description: `
The fields below allow for different ways to look up gnomAD data. Click on the the Gene, Variant, or Region types to see more information.
  `,
  fields: () => ({
    gene_id: {
      description: 'Look up variant data by gene ID. Example: ENSG00000169174.',
      type: geneType,
      args: {
        gene_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => {
        console.log(ctx)
        return lookupGeneByGeneId(ctx.database.gnomad, args.gene_id)
      },
    },
    gene_name: {
      description: 'Look up variant data by gene name. Example: PCSK9.',
      type: geneType,
      args: {
        gene_name: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) =>
        lookupGeneByName(ctx.database.gnomad, args.gene_name),
    },
    transcript_id: {
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
    region_bounds: {
      description: 'Look up variant data by start/stop. Example: (xstart: 1055530526, xstop: 1055505222).',
      type: regionType,
      args: {
        xstart: { type: new GraphQLNonNull(GraphQLInt) },
        xstop: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (obj, args) => ({ xstart: args.xstart, xstop: args.xstop }),
    },
    variant_id: {
      description: 'Look up a single variant by variant ID. Example: 1-55516888-G-GA.',
      type: variantType,
      args: {
        variant_id: { type: new GraphQLNonNull(GraphQLString) },
        data: {
          type: new GraphQLNonNull(GraphQLString),
          description: 'exac or gnomad',
        },
      },
      resolve: (obj, args, ctx) => {
        return lookupVariant(ctx.database.gnomad, args.data, args.variant_id)
      },
    },
    variant_rsid: {
      description: 'Look up a single variant by RSID. Example: rs185392267.',
      type: variantType,
      args: {
        rsid: { type: new GraphQLNonNull(GraphQLString) },
        data: {
          type: new GraphQLNonNull(GraphQLString),
          description: 'exac or gnomad',
        },
      },
      resolve: (obj, args, ctx) => {
        return lookupVariantRsid(ctx.database.gnomad, args.data, args.rsid)
      },
    },
  }),
})

const Schema = new GraphQLSchema({ query: rootType })

export default Schema

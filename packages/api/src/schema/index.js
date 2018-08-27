import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLString,
  GraphQLNonNull,
} from 'graphql'

import { getXpos } from '../utilities/variant'

import {
  AggregateQualityMetricsType,
  resolveAggregateQualityMetrics,
} from './datasets/aggregateQualityMetrics'

import geneType, {
  lookupGeneByGeneId,
  lookupGeneByName,
} from './types/gene'

import transcriptType, {
  lookupTranscriptsByTranscriptId,
} from './types/transcript'

import regionType from './types/region'

import {
  variants,
 } from './types/gnomadVariants'

import { gnomadVariants } from './types/elasticVariant'

import {
 schzGeneResults,
 schzGroups,
} from './types/schzvariant'

import help from './types/help'

import { VariantInterface } from './types/variant'

import { ExacVariantType, fetchExacVariant } from './datasets/exac'
import { GnomadVariantType, fetchGnomadVariant } from './datasets/gnomad'


const rootType = new GraphQLObjectType({
  name: 'Root',
  description: `
The fields below allow for different ways to look up gnomAD data. Click on the the Gene, Variant, or Region types to see more information.
  `,
  fields: () => ({
    aggregateQualityMetrics: {
      type: AggregateQualityMetricsType,
      args: {
        dataset: {
          type: new GraphQLEnumType({
            name: 'AggregateQualityMetricsDataset',
            values: { gnomadExomes: {}, gnomadGenomes: {} },
          }),
        },
      },
      resolve: (obj, args, ctx) => {
        return resolveAggregateQualityMetrics(ctx, {
          gnomadExomes: 'exome_metrics',
          gnomadGenomes: 'genome_metrics',
        }[args.dataset])
      },
    },
    gene: {
      description: 'Look up variant data by gene name. Example: PCSK9.',
      type: geneType,
      args: {
        gene_name: { type: GraphQLString },
        gene_id: { type: GraphQLString },
        filter: { type: GraphQLString },
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
      description: 'Look up data by start/stop. Example: (start: 55505222, stop: 55505300, chrom: 1).',
      type: regionType,
      args: {
        start: { type: new GraphQLNonNull(GraphQLFloat) },
        stop: { type: new GraphQLNonNull(GraphQLFloat) },
        chrom: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args) => ({
        start: args.start,
        stop: args.stop,
        chrom: args.chrom,
        xstart: getXpos(args.chrom, args.start),
        xstop: getXpos(args.chrom, args.stop),
        regionSize: args.stop - args.start,
      }),
    },
    variant: {
      description: 'Look up a single variant or rsid. Example: 1-55516888-G-GA.',
      type: VariantInterface,
      args: {
        dataset: {
          type: new GraphQLEnumType({ values: { exac: {}, gnomad: {} } })
        },
        variantId: { type: GraphQLString },
      },
      resolve: async (obj, args, ctx) => {
        const { dataset, variantId } = args
        const variantData = (dataset === 'exac')
          ? await fetchExacVariant(variantId, ctx)
          : await fetchGnomadVariant(variantId, ctx)
        variantData.dataset = dataset
        return variantData
      },
    },
    variants,
    // gnomadGenomeVariants,
    // gnomadCombinedVariants,
    gnomadVariants,
    schzGeneResults,
    schzGroups,
    help,
  }),
})

const Schema = new GraphQLSchema({
  query: rootType,
  types: [ExacVariantType, GnomadVariantType],
})

export default Schema

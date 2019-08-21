import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql'

import { getXpos } from '../utilities/variant'

import DatasetArgumentType from './datasets/DatasetArgumentType'
import datasetsConfig, { datasetSpecificTypes } from './datasets/datasetsConfig'

import {
  MultiNucleotideVariantDetailsType,
  fetchGnomadMNVDetails,
} from './datasets/gnomad_r2_1/gnomadMultiNucleotideVariants'
import fetchGnomadStructuralVariantDetails from './datasets/gnomad_sv_r2/fetchGnomadStructuralVariantDetails'
import GnomadStructuralVariantDetailsType from './datasets/gnomad_sv_r2/GnomadStructuralVariantDetailsType'

import { UserVisibleError } from './errors'

import { fetchGeneById, fetchGeneByName } from './gene-models/gene'
import { fetchTranscriptById } from './gene-models/transcript'

import geneType from './types/gene'

import transcriptType from './types/transcript'

import regionType from './types/region'

import { SearchResultType, resolveSearchResults } from './types/search'
import { VariantInterface } from './types/variant'

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
        if (args.gene_id) {
          return fetchGeneById(ctx, args.gene_id)
        }
        if (args.gene_name) {
          return fetchGeneByName(ctx, args.gene_name)
        }
        throw new UserVisibleError('One of "gene_id" or "gene_name" is required')
      },
    },
    transcript: {
      description: 'Look up variant data by transcript ID. Example: ENST00000407236.',
      type: transcriptType,
      args: {
        transcript_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => fetchTranscriptById(ctx, args.transcript_id),
    },
    multiNucleotideVariant: {
      type: MultiNucleotideVariantDetailsType,
      args: {
        variantId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => fetchGnomadMNVDetails(ctx, args.variantId),
    },
    region: {
      description: 'Look up data by start/stop. Example: (start: 55505222, stop: 55505300, chrom: 1).',
      type: regionType,
      args: {
        start: { type: new GraphQLNonNull(GraphQLInt) },
        stop: { type: new GraphQLNonNull(GraphQLInt) },
        chrom: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args) => ({
        start: args.start,
        stop: args.stop,
        chrom: args.chrom,
        xstart: getXpos(args.chrom, args.start),
        xstop: getXpos(args.chrom, args.stop),
      }),
    },
    searchResults: {
      type: new GraphQLList(SearchResultType),
      args: {
        query: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => resolveSearchResults(ctx, args.query),
    },
    structural_variant: {
      type: GnomadStructuralVariantDetailsType,
      args: {
        variantId: { type: GraphQLString },
      },
      resolve: (obj, args, ctx) => fetchGnomadStructuralVariantDetails(ctx, args.variantId),
    },
    variant: {
      description: 'Look up a single variant or rsid. Example: 1-55516888-G-GA.',
      type: VariantInterface,
      args: {
        dataset: { type: DatasetArgumentType },
        variantId: { type: GraphQLString },
      },
      resolve: (obj, args, ctx) => {
        const { dataset, variantId } = args
        const { fetchVariantDetails } = datasetsConfig[dataset]
        if (!fetchVariantDetails) {
          throw new UserVisibleError(`Querying variants is not supported for dataset "${dataset}"`)
        }
        return fetchVariantDetails(ctx, variantId)
      },
    },
  }),
})

const Schema = new GraphQLSchema({
  query: rootType,
  types: datasetSpecificTypes,
})

export default Schema

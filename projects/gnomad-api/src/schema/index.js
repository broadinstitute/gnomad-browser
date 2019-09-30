import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql'

import { extendObjectType } from '../utilities/graphql'

import DatasetArgumentType from './datasets/DatasetArgumentType'
import datasetsConfig, { datasetSpecificTypes } from './datasets/datasetsConfig'

import ClinvarVariantDetailsType from './datasets/clinvar/ClinvarVariantDetailsType'
import fetchClinvarVariantDetails from './datasets/clinvar/fetchClinvarVariantDetails'

import {
  MultiNucleotideVariantDetailsType,
  fetchGnomadMNVDetails,
} from './datasets/gnomad_r2_1/gnomadMultiNucleotideVariants'
import fetchGnomadStructuralVariantDetails from './datasets/gnomad_sv_r2/fetchGnomadStructuralVariantDetails'
import GnomadStructuralVariantDetailsType from './datasets/gnomad_sv_r2/GnomadStructuralVariantDetailsType'

import { UserVisibleError } from './errors'

import { fetchGeneById, fetchGeneBySymbol } from './gene-models/gene'
import { resolveRegion } from './gene-models/region'
import { fetchTranscriptById } from './gene-models/transcript'

import GeneType from './types/gene'
import regionType from './types/region'
import { SearchResultType, resolveSearchResults } from './types/search'
import TranscriptType from './types/transcript'
import { VariantInterface } from './types/variant'

const rootType = new GraphQLObjectType({
  name: 'Root',
  description: `
The fields below allow for different ways to look up gnomAD data. Click on the the Gene, Variant, or Region types to see more information.
  `,
  fields: () => ({
    gene: {
      description: 'Look up variant data by gene name. Example: PCSK9.',
      type: GeneType,
      args: {
        gene_id: { type: GraphQLString },
        gene_symbol: { type: GraphQLString },
        gene_name: { type: GraphQLString }, // Deprecated. TODO: Remove this
      },
      resolve: (obj, args, ctx) => {
        if (args.gene_id) {
          return fetchGeneById(ctx, args.gene_id, 'GRCh37')
        }
        if (args.gene_symbol || args.gene_name) {
          return fetchGeneBySymbol(ctx, args.gene_symbol || args.gene_name, 'GRCh37')
        }
        throw new UserVisibleError('One of "gene_id" or "gene_symbol" is required')
      },
    },
    transcript: {
      description: 'Look up variant data by transcript ID. Example: ENST00000407236.',
      type: extendObjectType(TranscriptType, {
        fields: {
          gene: { type: new GraphQLNonNull(GeneType) },
        },
      }),
      args: {
        transcript_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => fetchTranscriptById(ctx, args.transcript_id, 'GRCh37'),
    },
    multiNucleotideVariant: {
      type: MultiNucleotideVariantDetailsType,
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
        variant_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => {
        if (args.dataset !== 'gnomad_r2_1') {
          throw new UserVisibleError(
            `Multi-nucleotide variants are not available for ${datasetsConfig[args.dataset].label}`
          )
        }
        return fetchGnomadMNVDetails(ctx, args.variant_id)
      },
    },
    region: {
      description: 'Look up data by start/stop. Example: (start: 55505222, stop: 55505300, chrom: 1).',
      type: regionType,
      args: {
        start: { type: new GraphQLNonNull(GraphQLInt) },
        stop: { type: new GraphQLNonNull(GraphQLInt) },
        chrom: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => resolveRegion(ctx, args, 'GRCh37'),
    },
    searchResults: {
      type: new GraphQLList(SearchResultType),
      args: {
        query: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => resolveSearchResults(ctx, args.query),
    },
    clinvar_variant: {
      type: ClinvarVariantDetailsType,
      args: {
        variant_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => fetchClinvarVariantDetails(ctx, args.variant_id, 'GRCh37'),
    },
    structural_variant: {
      type: GnomadStructuralVariantDetailsType,
      args: {
        variantId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) => fetchGnomadStructuralVariantDetails(ctx, args.variantId),
    },
    variant: {
      description: 'Look up a single variant or rsid. Example: 1-55516888-G-GA.',
      type: VariantInterface,
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
        variantId: { type: new GraphQLNonNull(GraphQLString) },
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

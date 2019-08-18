import { GraphQLFloat, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import { withCache } from '../../utilities/redis'

import DatasetArgumentType from '../datasets/DatasetArgumentType'
import datasetsConfig from '../datasets/datasetsConfig'

import ClinvarVariantSummaryType from '../datasets/clinvar/ClinvarVariantSummaryType'
import fetchClinvarVariantsByGene from '../datasets/clinvar/fetchClinvarVariantsByGene'

import fetchGnomadStructuralVariantsByGene from '../datasets/gnomad_sv_r2/fetchGnomadStructuralVariantsByGene'

import { UserVisibleError } from '../errors'

import { fetchTranscriptById, fetchTranscriptsByGene } from '../gene-models/transcript'

import transcriptType from './transcript'
import exonType from './exon'
import constraintType, { lookUpConstraintByTranscriptId } from './constraint'
import coverageType, { fetchCoverageByTranscript } from './coverage'
import { PextRegionType, fetchPextRegionsByGene } from './pext'
import {
  RegionalMissenseConstraintRegionType,
  fetchExacRegionalMissenseConstraintRegions,
} from './regionalConstraint'
import { StructuralVariantSummaryType } from './structuralVariant'

import { VariantSummaryType } from './variant'

const geneType = new GraphQLObjectType({
  name: 'Gene',
  fields: () => ({
    _id: { type: GraphQLString },
    omim_description: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    omim_accession: { type: GraphQLString },
    chrom: { type: GraphQLString },
    strand: { type: GraphQLString },
    full_gene_name: { type: GraphQLString },
    gene_name_upper: { type: GraphQLString },
    other_names: { type: new GraphQLList(GraphQLString) },
    canonical_transcript: { type: GraphQLString },
    start: { type: GraphQLInt },
    stop: { type: GraphQLInt },
    xstop: { type: GraphQLFloat },
    xstart: { type: GraphQLFloat },
    gene_name: { type: GraphQLString },
    exons: { type: new GraphQLList(exonType) },
    composite_transcript: {
      type: new GraphQLObjectType({
        name: 'CompositeTranscript',
        fields: {
          exons: { type: new GraphQLList(exonType) },
        },
      }),
      resolve: obj => ({ exons: obj.exons }),
    },
    exome_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: DatasetArgumentType },
      },
      resolve: (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].exomeCoverageIndex
        if (!index) {
          return []
        }
        return withCache(ctx, `coverage:gene:${index}:${obj.gene_id}`, () =>
          fetchCoverageByTranscript(ctx, {
            index,
            type,
            chrom: obj.chrom,
            exons: obj.exons,
          })
        )
      },
    },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: DatasetArgumentType },
      },
      resolve: (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].genomeCoverageIndex
        if (!index) {
          return []
        }
        return withCache(ctx, `coverage:gene:${index}:${obj.gene_id}`, () =>
          fetchCoverageByTranscript(ctx, {
            index,
            type,
            chrom: obj.chrom,
            exons: obj.exons,
          })
        )
      },
    },
    clinvar_variants: {
      type: new GraphQLList(ClinvarVariantSummaryType),
      resolve: (obj, args, ctx) => fetchClinvarVariantsByGene(ctx, obj),
    },
    pext: {
      type: new GraphQLList(PextRegionType),
      resolve: (obj, args, ctx) => fetchPextRegionsByGene(ctx, obj.gene_id),
    },
    transcript: {
      type: transcriptType,
      resolve: (obj, args, ctx) => fetchTranscriptById(ctx, obj.canonical_transcript),
    },
    transcripts: {
      type: new GraphQLList(transcriptType),
      resolve: (obj, args, ctx) => fetchTranscriptsByGene(ctx, obj),
    },
    exacv1_constraint: {
      type: constraintType,
      resolve: (obj, args, ctx) =>
        lookUpConstraintByTranscriptId(ctx.database.gnomad, obj.canonical_transcript),
    },
    exac_regional_missense_constraint_regions: {
      type: new GraphQLList(RegionalMissenseConstraintRegionType),
      resolve: (obj, args, ctx) => fetchExacRegionalMissenseConstraintRegions(ctx, obj.gene_name),
    },
    structural_variants: {
      type: new GraphQLList(StructuralVariantSummaryType),
      resolve: async (obj, args, ctx) => fetchGnomadStructuralVariantsByGene(ctx, obj),
    },
    variants: {
      type: new GraphQLList(VariantSummaryType),
      args: {
        dataset: { type: DatasetArgumentType },
      },
      resolve: (obj, args, ctx) => {
        const { fetchVariantsByGene } = datasetsConfig[args.dataset]
        if (!fetchVariantsByGene) {
          throw new UserVisibleError(
            `Querying variants by gene is not supported for dataset "${args.dataset}"`
          )
        }
        return fetchVariantsByGene(ctx, obj)
      },
    },
  }),
})

export default geneType

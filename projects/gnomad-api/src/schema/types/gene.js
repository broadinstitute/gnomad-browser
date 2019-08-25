import { GraphQLList, GraphQLObjectType } from 'graphql'

import { extendObjectType } from '../../utilities/graphql'
import { withCache } from '../../utilities/redis'

import DatasetArgumentType from '../datasets/DatasetArgumentType'
import datasetsConfig from '../datasets/datasetsConfig'

import ClinvarVariantSummaryType from '../datasets/clinvar/ClinvarVariantSummaryType'
import fetchClinvarVariantsByGene from '../datasets/clinvar/fetchClinvarVariantsByGene'

import {
  ExacGeneConstraintType,
  fetchExacGeneConstraintByTranscriptId,
} from '../datasets/exac/exacGeneConstraint'
import {
  ExacRegionalMissenseConstraintRegionType,
  fetchExacRegionalMissenseConstraintRegions,
} from '../datasets/exac/exacRegionalMissenseConstraint'

import fetchGnomadStructuralVariantsByGene from '../datasets/gnomad_sv_r2/fetchGnomadStructuralVariantsByGene'

import { UserVisibleError } from '../errors'

import { ExonType } from '../gene-models/exon'
import { GeneType as BaseGeneType } from '../gene-models/gene'
import { fetchTranscriptById, fetchTranscriptsByGene } from '../gene-models/transcript'

import coverageType, { fetchCoverageByTranscript } from './coverage'
import { PextRegionType, fetchPextRegionsByGene } from './pext'
import { StructuralVariantSummaryType } from './structuralVariant'
import TranscriptType from './transcript'
import { VariantSummaryType } from './variant'

const GeneTranscriptType = extendObjectType(TranscriptType, {
  name: 'GeneTranscript',
})

const GeneType = extendObjectType(BaseGeneType, {
  fields: {
    composite_transcript: {
      type: new GraphQLObjectType({
        name: 'CompositeTranscript',
        fields: {
          exons: { type: new GraphQLList(ExonType) },
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
      type: GeneTranscriptType,
      resolve: (obj, args, ctx) => fetchTranscriptById(ctx, obj.canonical_transcript),
    },
    transcripts: {
      type: new GraphQLList(GeneTranscriptType),
      resolve: (obj, args, ctx) => fetchTranscriptsByGene(ctx, obj),
    },
    exac_constraint: {
      type: ExacGeneConstraintType,
      resolve: (obj, args, ctx) =>
        fetchExacGeneConstraintByTranscriptId(ctx, obj.canonical_transcript),
    },
    exac_regional_missense_constraint_regions: {
      type: new GraphQLList(ExacRegionalMissenseConstraintRegionType),
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
  },
})

export default GeneType

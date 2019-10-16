import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from 'graphql'

import { extendObjectType } from '../../utilities/graphql'
import { withCache } from '../../utilities/redis'

import DatasetArgumentType from '../datasets/DatasetArgumentType'
import datasetsConfig from '../datasets/datasetsConfig'
import { assertDatasetAndReferenceGenomeMatch } from '../datasets/validation'

import ClinvarVariantSummaryType from '../datasets/clinvar/ClinvarVariantSummaryType'
import fetchClinvarVariantsByGene from '../datasets/clinvar/fetchClinvarVariantsByGene'

import {
  ExacConstraintType,
  fetchExacConstraintByTranscriptId,
} from '../datasets/exac/exacConstraint'
import {
  ExacRegionalMissenseConstraintRegionType,
  fetchExacRegionalMissenseConstraintRegions,
} from '../datasets/exac/exacRegionalMissenseConstraint'

import fetchGnomadStructuralVariantsByGene from '../datasets/gnomad_sv_r2/fetchGnomadStructuralVariantsByGene'

import { UserVisibleError } from '../errors'

import { ExonType } from '../gene-models/exon'
import { GeneType as BaseGeneType } from '../gene-models/gene'

import {
  CoverageBinType,
  fetchCoverageByTranscript,
  formatCoverageForCache,
  formatCachedCoverage,
} from './coverage'
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
      type: new GraphQLList(CoverageBinType),
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
      },
      resolve: async (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].exomeCoverageIndex || {}
        if (!index) {
          throw new UserVisibleError(
            `Coverage is not available for ${datasetsConfig[args.dataset].label}`
          )
        }

        assertDatasetAndReferenceGenomeMatch(args.dataset, obj.reference_genome)

        const cachedCoverage = await withCache(
          ctx,
          `coverage:gene:${index}:${obj.gene_id}`,
          async () => {
            const coverage = await fetchCoverageByTranscript(ctx, {
              index,
              type,
              chrom: obj.chrom,
              exons: obj.exons,
            })

            return formatCoverageForCache(coverage)
          }
        )

        return formatCachedCoverage(cachedCoverage)
      },
    },
    genome_coverage: {
      type: new GraphQLList(CoverageBinType),
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
      },
      resolve: async (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].genomeCoverageIndex || {}
        if (!index) {
          if (args.dataset === 'exac') {
            return []
          }
          throw new UserVisibleError(
            `Coverage is not available for ${datasetsConfig[args.dataset].label}`
          )
        }

        assertDatasetAndReferenceGenomeMatch(args.dataset, obj.reference_genome)

        const cachedCoverage = await withCache(
          ctx,
          `coverage:gene:${index}:${obj.gene_id}`,
          async () => {
            const coverage = await fetchCoverageByTranscript(ctx, {
              index,
              type,
              chrom: obj.chrom,
              exons: obj.exons,
            })

            return formatCoverageForCache(coverage)
          }
        )

        return formatCachedCoverage(cachedCoverage)
      },
    },
    clinvar_variants: {
      type: new GraphQLList(ClinvarVariantSummaryType),
      resolve: async (obj, args, ctx) => {
        const cachedVariants = await withCache(
          ctx,
          `clinvar:${obj.reference_genome}:gene:${obj.gene_id}`,
          async () => {
            const variants = await fetchClinvarVariantsByGene(ctx, obj)
            return JSON.stringify(variants)
          }
        )

        return JSON.parse(cachedVariants)
      },
    },
    pext: {
      type: new GraphQLList(PextRegionType),
      resolve: (obj, args, ctx) => {
        if (obj.reference_genome !== 'GRCh37') {
          throw new UserVisibleError(
            `pext scores are not available on reference genome ${obj.reference_genome}`
          )
        }
        return fetchPextRegionsByGene(ctx, obj.gene_id)
      },
    },
    transcript: {
      type: GeneTranscriptType,
      resolve: obj =>
        (obj.transcripts || []).find(
          transcript => transcript.transcript_id === obj.canonical_transcript_id
        ),
    },
    transcripts: { type: new GraphQLList(GeneTranscriptType) },
    exac_constraint: {
      type: ExacConstraintType,
      resolve: (obj, args, ctx) => {
        if (!obj.canonical_transcript_id) {
          throw new UserVisibleError(
            `Unable to query ExAC constraint for gene "${obj.gene_id}", no canonical transcript`
          )
        }
        assertDatasetAndReferenceGenomeMatch('exac', obj.reference_genome)
        return fetchExacConstraintByTranscriptId(ctx, obj.canonical_transcript_id)
      },
    },
    exac_regional_missense_constraint_regions: {
      type: new GraphQLList(ExacRegionalMissenseConstraintRegionType),
      resolve: (obj, args, ctx) => {
        if (!obj.canonical_transcript_id) {
          throw new UserVisibleError(
            `Unable to query ExAC regional missense constraint for gene "${
              obj.gene_id
            }", no canonical transcript`
          )
        }
        assertDatasetAndReferenceGenomeMatch('exac', obj.reference_genome)
        return fetchExacRegionalMissenseConstraintRegions(ctx, obj.canonical_transcript_id)
      },
    },
    structural_variants: {
      type: new GraphQLList(StructuralVariantSummaryType),
      resolve: (obj, args, ctx) => {
        if (obj.reference_genome !== 'GRCh37') {
          throw new UserVisibleError(
            `gnomAD SV data is not available on reference genome ${obj.reference_genome}`
          )
        }
        return fetchGnomadStructuralVariantsByGene(ctx, obj)
      },
    },
    variants: {
      type: new GraphQLList(VariantSummaryType),
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
      },
      resolve: async (obj, args, ctx) => {
        const { fetchVariantsByGene } = datasetsConfig[args.dataset]
        if (!fetchVariantsByGene) {
          throw new UserVisibleError(
            `Querying variants by gene is not supported for dataset "${args.dataset}"`
          )
        }

        assertDatasetAndReferenceGenomeMatch(args.dataset, obj.reference_genome)

        const cachedVariants = await withCache(
          ctx,
          `variants:${args.dataset}:gene:${obj.gene_id}`,
          async () => {
            const variants = await fetchVariantsByGene(ctx, obj)
            return JSON.stringify(variants)
          }
        )

        return JSON.parse(cachedVariants)
      },
    },
  },
})

export default GeneType

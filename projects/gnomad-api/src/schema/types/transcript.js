import { GraphQLList, GraphQLNonNull } from 'graphql'

import { extendObjectType } from '../../utilities/graphql'
import { withCache } from '../../utilities/redis'

import DatasetArgumentType from '../datasets/DatasetArgumentType'
import datasetsConfig from '../datasets/datasetsConfig'
import { assertDatasetAndReferenceGenomeMatch } from '../datasets/validation'

import ClinvarVariantSummaryType from '../datasets/clinvar/ClinvarVariantSummaryType'
import fetchClinvarVariantsByTranscript from '../datasets/clinvar/fetchClinvarVariantsByTranscript'

import {
  ExacConstraintType,
  fetchExacConstraintByTranscriptId,
} from '../datasets/exac/exacConstraint'

import {
  GnomadConstraintType,
  fetchGnomadConstraintByTranscript,
} from '../datasets/gnomad_r2_1/gnomadV2Constraint'

import { UserVisibleError } from '../errors'

import { TranscriptType as BaseTranscriptType } from '../gene-models/transcript'

import {
  CoverageBinType,
  fetchCoverageByTranscript,
  formatCoverageForCache,
  formatCachedCoverage,
} from './coverage'
import { GtexTissueExpressionsType, fetchGtexTissueExpressionsByTranscript } from './gtex'
import { VariantSummaryType } from './variant'

const TranscriptType = extendObjectType(BaseTranscriptType, {
  fields: {
    clinvar_variants: {
      type: new GraphQLList(ClinvarVariantSummaryType),
      resolve: async (obj, args, ctx) => {
        const cachedVariants = await withCache(
          ctx,
          `clinvar:${obj.reference_genome}:transcript:${obj.transcript_id}`,
          async () => {
            const variants = await fetchClinvarVariantsByTranscript(ctx, obj)
            return JSON.stringify(variants)
          }
        )

        return JSON.parse(cachedVariants)
      },
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
          `coverage:${args.dataset}:exome:transcript:${obj.transcript_id}`,
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
          `coverage:${args.dataset}:genome:transcript:${obj.transcript_id}`,
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
    gnomad_constraint: {
      type: GnomadConstraintType,
      resolve: (obj, args, ctx) => {
        assertDatasetAndReferenceGenomeMatch('gnomad_r2_1', obj.reference_genome)
        return fetchGnomadConstraintByTranscript(ctx, obj.transcript_id)
      },
    },
    exac_constraint: {
      type: ExacConstraintType,
      resolve: (obj, args, ctx) => {
        assertDatasetAndReferenceGenomeMatch('exac', obj.reference_genome)
        return fetchExacConstraintByTranscriptId(ctx, obj.transcript_id)
      },
    },
    gtex_tissue_tpms_by_transcript: {
      type: GtexTissueExpressionsType,
      resolve: (obj, args, ctx) => {
        if (obj.reference_genome !== 'GRCh37') {
          throw new UserVisibleError(
            `Tissue expression is not available on reference genome ${obj.reference_genome}`
          )
        }
        return fetchGtexTissueExpressionsByTranscript(ctx, obj.transcript_id)
      },
    },
    variants: {
      type: new GraphQLList(VariantSummaryType),
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
      },
      resolve: async (obj, args, ctx) => {
        const { fetchVariantsByTranscript } = datasetsConfig[args.dataset]
        if (!fetchClinvarVariantsByTranscript) {
          throw new UserVisibleError(
            `Querying variants by transcript is not supported for dataset "${args.dataset}"`
          )
        }

        assertDatasetAndReferenceGenomeMatch(args.dataset, obj.reference_genome)

        const cachedVariants = await withCache(
          ctx,
          `variants:${args.dataset}:transcript:${obj.transcript_id}`,
          async () => {
            const variants = await fetchVariantsByTranscript(ctx, obj)
            return JSON.stringify(variants)
          }
        )

        return JSON.parse(cachedVariants)
      },
    },
  },
})

export default TranscriptType

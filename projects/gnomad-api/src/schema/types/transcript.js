import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from 'graphql'

import { extendObjectType } from '../../utilities/graphql'
import { withCache } from '../../utilities/redis'

import DatasetArgumentType from '../datasets/DatasetArgumentType'
import datasetsConfig from '../datasets/datasetsConfig'
import { assertDatasetAndReferenceGenomeMatch } from '../datasets/validation'

import ClinvarVariantType from '../datasets/clinvar/ClinvarVariantType'
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
import { GtexTissueExpressionType, fetchGtexTissueExpressionByTranscript } from './gtex'
import { VariantSummaryType } from './variant'

const TranscriptType = extendObjectType(BaseTranscriptType, {
  fields: {
    clinvar_variants: {
      type: new GraphQLList(ClinvarVariantType),
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
    coverage: {
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
      },
      type: new GraphQLObjectType({
        name: 'TranscriptCoverage',
        fields: {
          exome: {
            type: new GraphQLList(CoverageBinType),
            resolve: async ([transcript, dataset], args, ctx) => {
              const { index, type } = datasetsConfig[dataset].exomeCoverageIndex || {}
              if (!index) {
                throw new UserVisibleError(
                  `Coverage is not available for ${datasetsConfig[dataset].label}`
                )
              }

              assertDatasetAndReferenceGenomeMatch(dataset, transcript.reference_genome)

              const cachedCoverage = await withCache(
                ctx,
                `coverage:${dataset}:exome:transcript:${transcript.transcript_id}`,
                async () => {
                  const coverage = await fetchCoverageByTranscript(ctx, {
                    index,
                    type,
                    chrom: transcript.chrom,
                    exons: transcript.exons,
                  })

                  return formatCoverageForCache(coverage)
                }
              )

              return formatCachedCoverage(cachedCoverage)
            },
          },
          genome: {
            type: new GraphQLList(CoverageBinType),
            resolve: async ([transcript, dataset], args, ctx) => {
              const { index, type } = datasetsConfig[dataset].genomeCoverageIndex || {}
              if (!index) {
                if (dataset === 'exac') {
                  return []
                }
                throw new UserVisibleError(
                  `Coverage is not available for ${datasetsConfig[dataset].label}`
                )
              }

              assertDatasetAndReferenceGenomeMatch(dataset, transcript.reference_genome)

              const cachedCoverage = await withCache(
                ctx,
                `coverage:${dataset}:genome:transcript:${transcript.transcript_id}`,
                async () => {
                  const coverage = await fetchCoverageByTranscript(ctx, {
                    index,
                    type,
                    chrom: transcript.chrom,
                    exons: transcript.exons,
                  })

                  return formatCoverageForCache(coverage)
                }
              )

              return formatCachedCoverage(cachedCoverage)
            },
          },
        },
      }),
      // Pass transcript and dataset argument down to exome/genome field resolvers
      resolve: (obj, args) => [obj, args.dataset],
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
    gtex_tissue_expression: {
      type: GtexTissueExpressionType,
      resolve: (obj, args, ctx) => fetchGtexTissueExpressionByTranscript(ctx, obj),
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

import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from 'graphql'

import { extendObjectType } from '../../utilities/graphql'
import { withCache } from '../../utilities/redis'

import DatasetArgumentType from '../datasets/DatasetArgumentType'
import datasetsConfig from '../datasets/datasetsConfig'
import StructuralVariantDatasetArgumentType from '../datasets/StructuralVariantDatasetArgumentType'
import svDatasets from '../datasets/svDatasets'
import { assertDatasetAndReferenceGenomeMatch } from '../datasets/validation'

import ClinvarVariantType from '../datasets/clinvar/ClinvarVariantType'
import fetchClinvarVariantsByGene from '../datasets/clinvar/fetchClinvarVariantsByGene'

import {
  ExacConstraintType,
  fetchExacConstraintByTranscriptId,
} from '../datasets/exac/exacConstraint'
import {
  ExacRegionalMissenseConstraintRegionType,
  fetchExacRegionalMissenseConstraintRegions,
} from '../datasets/exac/exacRegionalMissenseConstraint'

import {
  GnomadConstraintType,
  fetchGnomadConstraintByTranscript,
} from '../datasets/gnomad_r2_1/gnomadV2Constraint'

import { UserVisibleError } from '../errors'

import { GeneType as BaseGeneType } from '../gene-models/gene'

import {
  CoverageBinType,
  fetchCoverageByTranscript,
  formatCoverageForCache,
  formatCachedCoverage,
} from './coverage'
import { PextType, fetchPextByGene } from './pext'
import { StructuralVariantSummaryType } from './structuralVariant'
import TranscriptType from './transcript'
import { VariantSummaryType } from './variant'

// There are two transcript types in the schema: the list of transcripts in a gene and the top-level transcript field.
// GraphQL does not allow multiple types with the same name, so rename this one.
const GeneTranscriptType = extendObjectType(TranscriptType, {
  name: 'GeneTranscript',
})

const GeneType = extendObjectType(BaseGeneType, {
  fields: {
    coverage: {
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
      },
      type: new GraphQLObjectType({
        name: 'GeneCoverage',
        fields: {
          exome: {
            type: new GraphQLList(CoverageBinType),
            resolve: async ([gene, dataset], args, ctx) => {
              const { index, type } = datasetsConfig[dataset].exomeCoverageIndex || {}
              if (!index) {
                throw new UserVisibleError(
                  `Coverage is not available for ${datasetsConfig[dataset].label}`
                )
              }

              assertDatasetAndReferenceGenomeMatch(dataset, gene.reference_genome)

              const cachedCoverage = await withCache(
                ctx,
                `coverage:${dataset}:exome:gene:${gene.gene_id}`,
                async () => {
                  const coverage = await fetchCoverageByTranscript(ctx, {
                    index,
                    type,
                    chrom: gene.chrom,
                    exons: gene.exons,
                  })

                  return formatCoverageForCache(coverage)
                }
              )

              return formatCachedCoverage(cachedCoverage)
            },
          },
          genome: {
            type: new GraphQLList(CoverageBinType),
            resolve: async ([gene, dataset], args, ctx) => {
              const { index, type } = datasetsConfig[dataset].genomeCoverageIndex || {}
              if (!index) {
                if (dataset === 'exac') {
                  return []
                }
                throw new UserVisibleError(
                  `Coverage is not available for ${datasetsConfig[dataset].label}`
                )
              }

              assertDatasetAndReferenceGenomeMatch(dataset, gene.reference_genome)

              const cachedCoverage = await withCache(
                ctx,
                `coverage:${dataset}:genome:gene:${gene.gene_id}`,
                async () => {
                  const coverage = await fetchCoverageByTranscript(ctx, {
                    index,
                    type,
                    chrom: gene.chrom,
                    exons: gene.exons,
                  })

                  return formatCoverageForCache(coverage)
                }
              )

              return formatCachedCoverage(cachedCoverage)
            },
          },
        },
      }),
      // Pass gene and dataset argument down to exome/genome field resolvers
      resolve: (obj, args) => [obj, args.dataset],
    },
    clinvar_variants: {
      type: new GraphQLList(ClinvarVariantType),
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
      type: PextType,
      resolve: (obj, args, ctx) => {
        if (obj.reference_genome !== 'GRCh37') {
          throw new UserVisibleError(
            `pext is not available for reference genome ${obj.reference_genome}`
          )
        }
        return fetchPextByGene(ctx, obj.gene_id)
      },
    },
    transcripts: { type: new GraphQLList(GeneTranscriptType) },
    gnomad_constraint: {
      type: GnomadConstraintType,
      resolve: (obj, args, ctx) => {
        if (!obj.canonical_transcript_id) {
          throw new UserVisibleError(
            `Unable to query gnomAD constraint for gene "${obj.gene_id}", no canonical transcript`
          )
        }
        assertDatasetAndReferenceGenomeMatch('gnomad_r2_1', obj.reference_genome)
        return fetchGnomadConstraintByTranscript(ctx, obj.canonical_transcript_id)
      },
    },
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
            `Unable to query ExAC regional missense constraint for gene "${obj.gene_id}", no canonical transcript`
          )
        }
        assertDatasetAndReferenceGenomeMatch('exac', obj.reference_genome)
        return fetchExacRegionalMissenseConstraintRegions(ctx, obj.canonical_transcript_id)
      },
    },
    structural_variants: {
      type: new GraphQLList(StructuralVariantSummaryType),
      args: {
        dataset: { type: new GraphQLNonNull(StructuralVariantDatasetArgumentType) },
      },
      resolve: (obj, args, ctx) => {
        const { fetchVariantsByGene } = svDatasets[args.dataset]
        if (!fetchVariantsByGene) {
          throw new UserVisibleError(
            `Querying variants by gene is not supported for dataset "${args.dataset}"`
          )
        }

        if (obj.reference_genome !== 'GRCh37') {
          throw new UserVisibleError(
            `gnomAD SV data is not available on reference genome ${obj.reference_genome}`
          )
        }

        return fetchVariantsByGene(ctx, obj)
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

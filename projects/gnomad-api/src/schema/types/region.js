import { GraphQLList, GraphQLNonNull } from 'graphql'

import { extendObjectType } from '../../utilities/graphql'

import DatasetArgumentType from '../datasets/DatasetArgumentType'
import datasetsConfig from '../datasets/datasetsConfig'
import StructuralVariantDatasetArgumentType from '../datasets/StructuralVariantDatasetArgumentType'
import svDatasets from '../datasets/svDatasets'
import { assertDatasetAndReferenceGenomeMatch } from '../datasets/validation'

import { UserVisibleError } from '../errors'

import { fetchGenesByRegion } from '../gene-models/gene'
import { RegionType as BaseRegionType } from '../gene-models/region'

import { CoverageBinType, fetchCoverageByRegion } from './coverage'
import geneType from './gene'
import { StructuralVariantSummaryType } from './structuralVariant'

import { VariantSummaryType } from './variant'

// Individual variants will only be returned if a region has fewer than this many variants
const FETCH_INDIVIDUAL_VARIANTS_LIMIT = 30000

const regionType = extendObjectType(BaseRegionType, {
  fields: {
    genes: {
      type: new GraphQLList(geneType),
      resolve: (obj, args, ctx) => fetchGenesByRegion(ctx, obj),
    },
    exome_coverage: {
      type: new GraphQLList(CoverageBinType),
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
      },
      resolve: (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].exomeCoverageIndex || {}
        if (!index) {
          throw new UserVisibleError(
            `Coverage is not available for ${datasetsConfig[args.dataset].label}`
          )
        }

        assertDatasetAndReferenceGenomeMatch(args.dataset, obj.reference_genome)

        return fetchCoverageByRegion(ctx, {
          index,
          type,
          region: obj,
        })
      },
    },
    genome_coverage: {
      type: new GraphQLList(CoverageBinType),
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
      },
      resolve: (obj, args, ctx) => {
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

        return fetchCoverageByRegion(ctx, {
          index,
          type,
          region: obj,
        })
      },
    },
    structural_variants: {
      type: new GraphQLList(StructuralVariantSummaryType),
      args: {
        dataset: { type: new GraphQLNonNull(StructuralVariantDatasetArgumentType) },
      },
      resolve: (obj, args, ctx) => {
        const { fetchVariantsByRegion } = svDatasets[args.dataset]
        if (!fetchVariantsByRegion) {
          throw new UserVisibleError(
            `Querying variants by region is not supported for dataset "${args.dataset}"`
          )
        }

        if (obj.reference_genome !== 'GRCh37') {
          throw new UserVisibleError(
            `gnomAD SV data is not available on reference genome ${obj.reference_genome}`
          )
        }

        return fetchVariantsByRegion(ctx, obj)
      },
    },
    variants: {
      type: new GraphQLList(VariantSummaryType),
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
      },
      resolve: async (obj, args, ctx) => {
        const { countVariantsInRegion, fetchVariantsByRegion } = datasetsConfig[args.dataset]
        if (!countVariantsInRegion || !fetchVariantsByRegion) {
          throw new UserVisibleError(
            `Querying variants by region is not supported for dataset "${args.dataset}"`
          )
        }

        assertDatasetAndReferenceGenomeMatch(args.dataset, obj.reference_genome)

        const numVariantsInRegion = await countVariantsInRegion(ctx, obj)
        if (numVariantsInRegion > FETCH_INDIVIDUAL_VARIANTS_LIMIT) {
          throw new UserVisibleError(
            `Individual variants can only be returned for regions with fewer than ${FETCH_INDIVIDUAL_VARIANTS_LIMIT} variants`
          )
        }

        return fetchVariantsByRegion(ctx, obj)
      },
    },
  },
})

export default regionType

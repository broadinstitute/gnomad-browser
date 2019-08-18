import { GraphQLList, GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql'

import DatasetArgumentType from '../datasets/DatasetArgumentType'
import datasetsConfig from '../datasets/datasetsConfig'
import fetchGnomadStructuralVariantsByRegion from '../datasets/gnomad_sv_r2/fetchGnomadStructuralVariantsByRegion'

import { UserVisibleError } from '../errors'

import { fetchGenesByRegion } from '../gene-models/gene'

import coverageType, { fetchCoverageByRegion } from './coverage'
import geneType from './gene'
import { StructuralVariantSummaryType } from './structuralVariant'

import { VariantSummaryType } from './variant'

// Individual variants will only be returned if a region has fewer than this many variants
const FETCH_INDIVIDUAL_VARIANTS_LIMIT = 30000

const regionType = new GraphQLObjectType({
  name: 'Region',
  fields: () => ({
    start: { type: GraphQLInt },
    stop: { type: GraphQLInt },
    xstart: { type: GraphQLInt },
    xstop: { type: GraphQLInt },
    chrom: { type: GraphQLString },
    genes: {
      type: new GraphQLList(geneType),
      resolve: (obj, args, ctx) => fetchGenesByRegion(ctx, obj),
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
        return fetchCoverageByRegion(ctx, {
          index,
          type,
          region: obj,
        })
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
        return fetchCoverageByRegion(ctx, {
          index,
          type,
          region: obj,
        })
      },
    },
    structural_variants: {
      type: new GraphQLList(StructuralVariantSummaryType),
      resolve: async (obj, args, ctx) => fetchGnomadStructuralVariantsByRegion(ctx, obj),
    },
    variants: {
      type: new GraphQLList(VariantSummaryType),
      args: {
        dataset: { type: DatasetArgumentType },
      },
      resolve: async (obj, args, ctx) => {
        const { countVariantsInRegion, fetchVariantsByRegion } = datasetsConfig[args.dataset]
        if (!countVariantsInRegion || !fetchVariantsByRegion) {
          throw new UserVisibleError(
            `Querying variants by region is not supported for dataset "${args.dataset}"`
          )
        }

        const numVariantsInRegion = await countVariantsInRegion(ctx, obj)
        if (numVariantsInRegion > FETCH_INDIVIDUAL_VARIANTS_LIMIT) {
          throw new UserVisibleError(
            `Individual variants can only be returned for regions with fewer than ${FETCH_INDIVIDUAL_VARIANTS_LIMIT} variants`
          )
        }
        return fetchVariantsByRegion(ctx, obj)
      },
    },
  }),
})

export default regionType

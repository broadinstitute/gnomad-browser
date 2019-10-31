import {
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql'

import datasets from './datasets'
import { UserVisibleError } from './errors'
import logger from './logging'
import resolveReads from './resolveReads'

const DatasetArgumentType = new GraphQLEnumType({
  name: 'DatasetId',
  values: Object.keys(datasets)
    .filter(datasetId => {
      const isExomesConfigured =
        datasets[datasetId].exomes &&
        datasets[datasetId].exomes.readsDirectory &&
        datasets[datasetId].exomes.publicPath

      const isGenomesConfigured =
        datasets[datasetId].genomes &&
        datasets[datasetId].genomes.readsDirectory &&
        datasets[datasetId].genomes.publicPath

      return isExomesConfigured || isGenomesConfigured
    })
    .reduce((values, datasetId) => ({ ...values, [datasetId]: {} }), {}),
})

const ReadType = new GraphQLObjectType({
  name: 'Read',
  fields: {
    bamPath: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    indexPath: { type: new GraphQLNonNull(GraphQLString) },
    readGroup: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const VariantReadsType = new GraphQLObjectType({
  name: 'VariantReads',
  fields: {
    exome: {
      type: new GraphQLList(ReadType),
      resolve: async obj => {
        const { dataset } = obj
        const { readsDirectory, publicPath } = datasets[dataset].exomes || {}
        if (!(readsDirectory && publicPath)) {
          return null
        }

        try {
          return await resolveReads(readsDirectory, publicPath, obj)
        } catch (err) {
          logger.warn(err)
          throw new UserVisibleError('Unable to load reads data')
        }
      },
    },
    genome: {
      type: new GraphQLList(ReadType),
      resolve: async obj => {
        const { dataset } = obj
        const { readsDirectory, publicPath } = datasets[dataset].genomes || {}
        if (!(readsDirectory && publicPath)) {
          return null
        }

        try {
          return await resolveReads(readsDirectory, publicPath, obj)
        } catch (err) {
          logger.warn(err)
          throw new UserVisibleError('Unable to load reads data')
        }
      },
    },
  },
})

const VARIANT_ID_REGEX = /^(\d+|X|Y)-([1-9][0-9]*)-([ACGT]+)-([ACGT]+)$/

export const isVariantId = str => {
  const match = VARIANT_ID_REGEX.exec(str)
  if (!match) {
    return false
  }

  const chrom = match[1]
  const chromNumber = Number(chrom)
  if (!Number.isNaN(chromNumber) && (chromNumber < 1 || chromNumber > 22)) {
    return false
  }

  const position = Number(match[2])
  if (position > 1e9) {
    return false
  }

  return true
}

const RootType = new GraphQLObjectType({
  name: 'Root',
  fields: {
    variantReads: {
      type: VariantReadsType,
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
        variantId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args) => {
        const { dataset, variantId } = args
        if (!isVariantId(variantId)) {
          throw new UserVisibleError(`Invalid variant ID: "${variantId}"`)
        }

        const [chrom, pos, ref, alt] = variantId.split('-')
        return {
          dataset,
          variantId,
          chrom,
          pos: Number(pos),
          ref,
          alt,
        }
      },
    },
  },
})

const Schema = new GraphQLSchema({
  query: RootType,
})

export default Schema

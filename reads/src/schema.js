const {
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} = require('graphql')

const datasets = require('./datasets')
const { UserVisibleError } = require('./errors')
const logger = require('./logging')
const resolveReadsLegacy = require('./resolveReadsLegacy')
const resolveReads = require('./resolveReads')

const DatasetArgumentType = new GraphQLEnumType({
  name: 'DatasetId',
  values: Object.keys(datasets).reduce((values, datasetId) => ({ ...values, [datasetId]: {} }), {}),
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
        const { dataset, variantId } = obj
        const config = datasets[dataset].exomes
        if (!config) {
          return null
        }

        const resolve = config.legacyResolver ? resolveReadsLegacy : resolveReads
        try {
          return await resolve(config, obj)
        } catch (err) {
          logger.warn(err)
          throw new UserVisibleError(`Unable to load exome reads for ${variantId}`)
        }
      },
    },
    genome: {
      type: new GraphQLList(ReadType),
      resolve: async obj => {
        const { dataset, variantId } = obj
        const config = datasets[dataset].genomes
        if (!config) {
          return null
        }

        const resolve = config.legacyResolver ? resolveReadsLegacy : resolveReads
        try {
          return await resolve(config, obj)
        } catch (err) {
          logger.warn(err)
          throw new UserVisibleError(`Unable to load genome reads for ${variantId}`)
        }
      },
    },
  },
})

const VARIANT_ID_REGEX = /^(\d+|X|Y)-([1-9][0-9]*)-([ACGT]+)-([ACGT]+)$/

const isVariantId = str => {
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

module.exports = Schema

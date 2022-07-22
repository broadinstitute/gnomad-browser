const {
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLInt,
  GraphQLInputObjectType,
} = require('graphql')

const { variantDatasets, shortTandemRepeatDatasets } = require('./datasets')
const { UserVisibleError } = require('./errors')
const logger = require('./logging')
const resolveReadsLegacy = require('./resolveReadsLegacy')
const resolveReads = require('./resolveReads')
const {
  resolveShortTandemRepeatNumReads,
  resolveShortTandemRepeatReads,
} = require('./resolveShortTandemRepeatReads')

const allDatasetIds = Array.from(
  new Set([...Object.keys(variantDatasets), ...Object.keys(shortTandemRepeatDatasets)])
)

const DatasetArgumentType = new GraphQLEnumType({
  name: 'DatasetId',
  values: allDatasetIds.reduce((values, datasetId) => ({ ...values, [datasetId]: {} }), {}),
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
      resolve: async (obj) => {
        const { dataset, variantId } = obj
        const config = variantDatasets[dataset].exomes
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
      resolve: async (obj) => {
        const { dataset, variantId } = obj
        const config = variantDatasets[dataset].genomes
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

const ShortTandemRepeatReadRepeatSizeConfidenceIntervalType = new GraphQLObjectType({
  name: 'ShortTandemRepeatReadRepeatSizeConfidenceInterval',
  fields: {
    upper: { type: new GraphQLNonNull(GraphQLInt) },
    lower: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

const ShortTandemRepeatReadAlleleType = new GraphQLObjectType({
  name: 'ShortTandemRepeatReadAllele',
  fields: {
    repeat_unit: { type: new GraphQLNonNull(GraphQLString) },
    repeats: { type: new GraphQLNonNull(GraphQLInt) },
    repeats_confidence_interval: {
      type: new GraphQLNonNull(ShortTandemRepeatReadRepeatSizeConfidenceIntervalType),
    },
  },
})

const ShortTandemRepeatReadType = new GraphQLObjectType({
  name: 'ShortTandemRepeatRead',
  fields: {
    alleles: { type: new GraphQLNonNull(new GraphQLList(ShortTandemRepeatReadAlleleType)) },
    population: { type: new GraphQLNonNull(GraphQLString) },
    sex: { type: new GraphQLNonNull(GraphQLString) },
    age: { type: GraphQLString },
    pcr_protocol: { type: new GraphQLNonNull(GraphQLString) },
    path: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const ShortTandemRepeatReadsType = new GraphQLObjectType({
  name: 'ShortTandemRepeatReads',
  fields: {
    num_reads: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (obj) => {
        const { dataset } = obj
        const config = shortTandemRepeatDatasets[dataset]
        return resolveShortTandemRepeatNumReads(config, obj)
      },
    },
    reads: {
      type: new GraphQLNonNull(new GraphQLList(ShortTandemRepeatReadType)),
      args: {
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      resolve: (obj, args) => {
        const { dataset } = obj
        const config = shortTandemRepeatDatasets[dataset]
        return resolveShortTandemRepeatReads(config, obj, args)
      },
    },
  },
})

const ShortTandemRepeatReadsAlleleFilterType = new GraphQLInputObjectType({
  name: 'ShortTandemRepeatReadsAlleleFilterType',
  fields: {
    repeat_unit: { type: GraphQLString },
    min_repeats: { type: GraphQLInt },
    max_repeats: { type: GraphQLInt },
  },
})

const ShortTandemRepeatReadsFilterType = new GraphQLInputObjectType({
  name: 'ShortTandemRepeatReadsFilter',
  fields: {
    population: { type: GraphQLString },
    sex: { type: GraphQLString },
    alleles: { type: new GraphQLList(new GraphQLNonNull(ShortTandemRepeatReadsAlleleFilterType)) },
  },
})

const VARIANT_ID_REGEX = /^(\d+|X|Y)-([1-9][0-9]*)-([ACGT]+)-([ACGT]+)$/

const isVariantId = (str) => {
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

        if (!variantDatasets[dataset]) {
          throw new UserVisibleError(`Reads are not available for "${dataset}" dataset`)
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
    short_tandem_repeat_reads: {
      type: new GraphQLNonNull(ShortTandemRepeatReadsType),
      args: {
        dataset: { type: new GraphQLNonNull(DatasetArgumentType) },
        id: { type: new GraphQLNonNull(GraphQLString) },
        filter: { type: ShortTandemRepeatReadsFilterType },
      },
      resolve: (obj, args) => {
        const { dataset } = args
        if (!shortTandemRepeatDatasets[dataset]) {
          throw new UserVisibleError(
            `Short tandem repeat reads are not available for "${dataset}" dataset`
          )
        }

        return args
      },
    },
  },
})

const Schema = new GraphQLSchema({
  query: RootType,
})

module.exports = Schema

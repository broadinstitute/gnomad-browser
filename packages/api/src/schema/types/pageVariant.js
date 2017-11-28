/* eslint-disable no-underscore-dangle */
import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLString,
  GraphQLList,
} from 'graphql'

import { fromJS, List, Map } from 'immutable'
import camelCase from 'lodash.camelcase'
import snakeCase from 'lodash.snakecase'

import elasticMappings from '../../elastic-mappings/mappings.json'

const graphqlToElastic = {
  keyword: GraphQLString,
  half_float: GraphQLFloat,
  integer: GraphQLInt,
  boolean: GraphQLBoolean,
  long: GraphQLFloat,
}

export const getPopulationPath = (
  populationDictionary,
  populationDataFields
) => (key, path) => {
  const populationMap = fromJS(populationDictionary)
  const populationKeys = populationMap.keySeq()
  // const populationNames = populationMap.valueSeq()

  const populationFields = fromJS(populationDataFields)
    .reduce((acc, value) => acc.concat(populationKeys.map(pop => `${value}_${pop}`)), new List())

  if (populationFields.contains(key)) {
    const [populationDataField, pop] = key.split('_')
    return path
      .push('populations')
      .push(populationMap.get(pop))
      .push(key)
  }
  return path
}

const getPathByGroup = (groupName, fields) => (key, path) => {
  if (fromJS(fields).contains(key)) {
    return path
      .push(groupName)
      .push(key)
  }
  return path
}

function getPath(key, revivers) {
  return revivers.reduce((acc, fn) => {
    return fn(key, acc)
  }, new List())
}

function getPaths(elasticMappings, revivers, index, type) {
  return fromJS(elasticMappings)
    .getIn([index, 'mappings', type, 'properties'])
    .map((value, key) => {
      return value.set('path', getPath(key, fromJS(revivers)))
    })
}

function convertToNested (elasticTypesWithPaths) {
  return elasticTypesWithPaths
    .reduce((acc, value, key) => {
      const path = value.get('path')
      if (!path.isEmpty()) {
        return acc.setIn(path, value.delete('path'))
      }
      return acc.set(key, value.delete('path'))
    }, new Map())
}

function convertToGraphQLSchema (object) {
  return object.reduce((acc, value, key) => {
    const elasticType = value.get('type') || 'integer'
    if (!value.get('type')) {
      return {
        ...acc,
        [key]: {
          type: new GraphQLObjectType({
            name: key,
            fields: () => convertToGraphQLSchema(value)
          })
        }
      }
    }
    return {
      ...acc,
      [key]: {
        type: graphqlToElastic[elasticType]
      }
    }
  }, {})
}

export function elasticToGraphQLObject (
  elasticMappings: Object,
  revivers: Array,
  index: String,
  type: String,
) {
  const elasticMappingsWithPaths = getPaths(elasticMappings, revivers, index, type)
  const nested = convertToNested(elasticMappingsWithPaths)
  return convertToGraphQLSchema(nested)
}

const gnomadPopDict = {
  NFE: 'europeanNonFinnish',
  EAS: 'eastAsian',
  OTH: 'other',
  AFR: 'african',
  AMR: 'latino',
  SAS: 'southAsian',
  FIN: 'europeanFinnish',
  ASJ: 'ashkenaziJewish',
}

const gnomadPopDataFields = ['AC', 'AN', 'Hom', 'Hemi']

const qualityMetricFields = [
  'FS',
  'MQRankSum',
  'InbreedingCoeff',
  'VQSLOD',
  'BaseQRankSum',
  'MQ',
  'ClippingRankSum',
  'ReadPosRankSum',
  'DP',
  'QD',
  'AS_RF',
  'DREF_MEDIAN',
  'DP_MEDIAN',
  'GQ_MEDIAN',
  'AB_MEDIAN',
  'GQ_HIST_ALT',
  'DP_HIST_ALT',
  'AB_HIST_ALT',
  'GQ_HIST_ALL',
  'DP_HIST_ALL',
  'AB_HIST_ALL',
]

const popmax = [
  'POPMAX',
  'AC_POPMAX',
  'AN_POPMAX',
  'AF_POPMAX',
]

const totals = [
  'AC',
  'AN',
  'AF',
  'Hemi',
]

const flags = [
  'lcr',
  'segdup',
]

const gnomadRevivers = [
  getPopulationPath(gnomadPopDict, gnomadPopDataFields),
  getPathByGroup('qualityMetrics', qualityMetricFields),
  getPathByGroup('popmax', popmax),
  getPathByGroup('totals', totals),
  getPathByGroup('flags', flags),
]

const variantGraphQLFields = elasticToGraphQLObject(
  elasticMappings,
  gnomadRevivers,
  'gnomad_exomes',
  'variant'
)

const pageVariantType = new GraphQLObjectType({
  name: 'PageVariant',
  fields: () => variantGraphQLFields
})

export const pageVariants = {
  description: 'Variants!',
  args: {
    index: { type: GraphQLString },
    geneId: { type: GraphQLString },
    cursor: { type: GraphQLString },
  },
  type: new GraphQLObjectType({
    name: 'PageVariants',
    fields: () => ({
      variantCount: { type: GraphQLInt },
      cursor: { type: GraphQLString },
      variants: { type: new GraphQLList(pageVariantType) },
    })
  }),
  resolve: (obj, args, ctx) => {
    return lookup({
      elasticClient: ctx.database.elastic,
      index: args.index,
      cursor: args.cursor,
      geneId: args.geneId,
    })
  }
}

function formatVariants (response) {
  const variants = response.hits.hits.map(v => ({
    id: v._source.variantId,
    alleleCount: v._source.AC,
  }))
  return {
    variants,
    variantCount: response.hits.total,
    cursor: response._scroll_id,
  }
}

function lookup ({
  elasticClient,
  index,
  geneId,
  cursor
}) {
  if (cursor) {
    return elasticClient.scroll({
      scrollId: cursor,
      scroll: '30m',
    }).then(formatVariants)
  }
  return elasticClient.search({
    index,
    type: 'variant',
    size: 1000,
    scroll: '30m',
    _source: ['variantId', 'AC'],
    body: {
      query: {
        bool: {
          must: [
            { term: { geneId } }
          ],
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  }).then(formatVariants)
}

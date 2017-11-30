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

export const getPopulationPath = (
  populationDictionary,
  populationDataFields
) => (key, path) => {
  if (!path.isEmpty) {
    return path
  }
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

export const getPathByGroup = (groupName, fields) => (key, path) => {
  if (!path.isEmpty) {
    return path
  }
  if (fromJS(fields).contains(key)) {
    return path
      .push(groupName)
      .push(key)
  }
  return path
}

export const getPathFromSchemaConfig = config => (key, oldPath) => {
  if (!oldPath.isEmpty) {
    return oldPath
  }
  const configMap = fromJS(config)
  if (!configMap.get(key)) {
    return oldPath
  }
  const pathString = configMap.get(key)
  const path = new List(pathString.split('.'))
  return path
}

export const transformCase = transformer => (key, path) => {
  return path.map(node => transformer(node))
}

export const transformSnakeCase = transformCase(snakeCase)
export const transformCamelCase = transformCase(camelCase)

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

function convertToNestedValues (elasticTypesWithPaths) {
  return elasticTypesWithPaths
    .reduce((acc, value, key) => {
      const path = value.get('path')
      if (!path.isEmpty()) {
        return acc.setIn(path, value.get('value'))
      }
      return acc.set(key, value.get('value'))
    }, new Map())
}

const elasticToGraphQL = {
  keyword: {
    type: GraphQLString,
    args: {
      string: {
        type: GraphQLString,
      }
    }
  },
  half_float: {
    type: GraphQLFloat,
    args: {
      lte: {
        type: GraphQLFloat,
      },
      gte: {
        type: GraphQLFloat,
      },
      lt: {
        type: GraphQLFloat,
      },
      gt: {
        type: GraphQLFloat,
      }
    }
  },
  integer: {
    type: GraphQLInt,
    args: {
      lte: {
        type: GraphQLInt,
      },
      gte: {
        type: GraphQLInt,
      },
      lt: {
        type: GraphQLInt,
      },
      gt: {
        type: GraphQLInt,
      }
    }
  },
  boolean: {
    type: GraphQLBoolean,
    args: {
      is: {
        type: GraphQLBoolean,
      }
    }
  },
  long: {
    type: GraphQLFloat,
    args: {
      lte: {
        type: GraphQLFloat,
      },
      gte: {
        type: GraphQLFloat,
      },
      lt: {
        type: GraphQLFloat,
      },
      gt: {
        type: GraphQLFloat,
      }
    }
  },
}

function convertToGraphQLSchema (object) {
  return object.reduce((acc, value, key) => {
    const elasticType = value.get('type')
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
      [key]: elasticToGraphQL[elasticType]
    }
  }, {})
}

export function elasticToGraphQLObject (
  elasticMappings: Object,
  revivers: Array,
  index: String,
  type: String
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

const gnomadSchemaConfig = {
  variantId: 'variantId',
  // MQRankSum: 'qualityMetrics.MQRankSum',
  AC: 'totals.AC',
  AN: 'totals.AN',
  AF: 'totals.AF',
  Hom: 'totals.Hom',
  Hemi: 'totals.Hemi',

  POPMAX: 'popmax.POPMAX',
  AC_POPMAX: 'popmax.AC_POPMAX',
  AN_POPMAX: 'popmax.AN_POPMAX',
  AF_POPMAX: 'popmax.AF_POPMAX',

  MPC: 'mpc.MPC',
  fitted_score: 'mpc.fitted_score',
  mis_badness: 'mpc.mis_badness',
  obs_exp: 'mpc.obs_exp',

  lcr: 'flags.lcr',
  consequence: 'consequence',

  FS: 'qualityMetrics.FS',
  MQRankSum: 'qualityMetrics.MQRankSum',
  InbreedingCoeff: 'qualityMetrics.InbreedingCoeff',
  VQSLOD: 'qualityMetrics.VQSLOD',
  BaseQRankSum: 'qualityMetrics.BaseQRankSum',
  MQ: 'qualityMetrics.MQ',
  ClippingRankSum: 'qualityMetrics.ClippingRankSum',
  ReadPosRankSum: 'qualityMetrics.ReadPosRankSum',
  DP: 'qualityMetrics.DP',
  QD: 'qualityMetrics.QD',
  AS_RF: 'qualityMetrics.AS_RF',
  DREF_MEDIAN: 'qualityMetrics.DREF_MEDIAN',
  DP_MEDIAN: 'qualityMetrics.DP_MEDIAN',
  GQ_MEDIAN: 'qualityMetrics.GQ_MEDIAN',
  AB_MEDIAN: 'qualityMetrics.AB_MEDIAN',
  GQ_HIST_ALT: 'qualityMetrics.GQ_HIST_ALT',
  DP_HIST_ALT: 'qualityMetrics.DP_HIST_ALT',
  AB_HIST_ALT: 'qualityMetrics.AB_HIST_ALT',
  GQ_HIST_ALL: 'qualityMetrics.GQ_HIST_ALL',
  DP_HIST_ALL: 'qualityMetrics.DP_HIST_ALL',
  AB_HIST_ALL: 'qualityMetrics.AB_HIST_ALL',
}

const gnomadRevivers = [
  getPathFromSchemaConfig(gnomadSchemaConfig, camelCase),
  getPopulationPath(gnomadPopDict, gnomadPopDataFields),
  // getPathByGroup('qualityMetrics', qualityMetricFields),
  // transformCamelCase,
]

const variantGraphQLFields = elasticToGraphQLObject(
  elasticMappings,
  gnomadRevivers,
  'gnomad',
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
    // geneId: { type: GraphQLString },
    cursor: { type: GraphQLString },
    size: { type: GraphQLInt },
  },
  type: new GraphQLObjectType({
    name: 'PageVariants',
    fields: () => ({
      variantCount: { type: GraphQLInt },
      cursor: { type: GraphQLString },
      variants: { type: new GraphQLList(pageVariantType) },
    })
  }),
  resolve: (obj, args, ctx, info) => {
    return lookup({
      elasticClient: ctx.database.elastic,
      index: args.index,
      cursor: args.cursor,
      geneId: args.geneId,
      info,
      size: args.size,
    })
  }
}

function formatVariants (response) {
  const elasticMappingsWithPaths = getPaths(
    elasticMappings,
    gnomadRevivers,
    'gnomad',
    'variant'
  )
  const variants = response.hits.hits
    .map(hit => new Map(hit._source).map(v => new Map({ value: v })))
    .map(hit => hit.mergeDeep(elasticMappingsWithPaths))
    .map(hit => convertToNestedValues(hit).toJS())
  return {
    variants,
    variantCount: response.hits.total,
    cursor: response._scroll_id,
  }
}
function report(argument) {
  console.log(JSON.stringify(argument, null, 2))
}

function getVariableValue (arg, kind, variableValues) {
  switch (kind) {
    case 'Variable':
      return variableValues[arg.getIn(['value', 'name', 'value'])]
    case 'IntValue':
      return Number(arg.getIn(['value', 'value']))
    case 'FloatValue':
      return Number(arg.getIn(['value', 'value']))
    case 'StringValue':
      return arg.getIn(['value', 'value'])
    case 'BooleanValue':
      return Boolean(arg.getIn(['value', 'value']))
    default:
      return null
  }
}

function getSelectionNames(fields, variableValues) {
  const names = []
  const args = []
  function getNames (fields) {
    return fields.forEach((field) => {
      if (field.get('kind') === 'Field') {
        names.push(field.get('name').get('value'))
        const fieldArgs = field.get('arguments')
        if (!fieldArgs.isEmpty()) {
          const argsFormatted = { name: field.get('name').get('value') }
          fieldArgs.forEach((arg) => {
            const argKey = arg.getIn(['name', 'value'])
            const kind = arg.getIn(['value', 'kind'])
            console.log(kind)
            argsFormatted.type = kind
            argsFormatted[argKey] = getVariableValue(arg, kind, variableValues)
          })
          args.push(argsFormatted)
        }
        if (field.get('selectionSet')) {
          getNames(field.get('selectionSet').get('selections'))
        }
      }
    })
  }
  getNames(fields)
  return { names, args }
}

function getElasticsearchConditions (arg) {
  switch (arg.type) {
    case 'StringValue':
      return { bool: { should: { term: { [arg.name]: arg.string } } } }
    case 'BooleanValue':
      return { bool: { should: { term: { [arg.name]: arg.is } } } }
    case 'IntValue':
    case 'FloatValue':
      return { range: { [arg.name]: { gte: arg.gte, lte: arg.lte } } }
    default:
      return {}
  }
}

function lookup ({
  elasticClient,
  index,
  geneId,
  cursor,
  size,
  info,
}) {
  // if (cursor) {
  //   return elasticClient.scroll({
  //     scrollId: cursor,
  //     scroll: '30m',
  //   }).then(formatVariants)
  // }
  const fields = fromJS(info.fieldASTs)
  const astValues = getSelectionNames(fields, info.variableValues)
  console.log(astValues)
  const elasticConditions = astValues.args.map(getElasticsearchConditions)
  return elasticClient.search({
    index,
    type: 'variant',
    size: size || 1000,
    scroll: '30m',
    _source: astValues.names,
    body: {
      query: {
        bool: {
          // must: [
          //   { term: { geneId } }
          // ],
          filter: {
            bool: {
              must: elasticConditions
            }
          }
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  }).then(formatVariants)
}

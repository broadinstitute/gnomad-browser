/* eslint-disable no-underscore-dangle */
import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLString,
  GraphQLList,
  isAbstractType,
  isInputType,
  isOutputType,
  isLeafType,
  isCompositeType,
} from 'graphql'

import { fromJS, List, Map } from 'immutable'
import camelCase from 'lodash.camelcase'
import snakeCase from 'lodash.snakecase'

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

function getPaths({ elasticMappings, pathMappers, elasticIndex, elasticType }) {
  return fromJS(elasticMappings)
    .getIn([elasticIndex, 'mappings', elasticType, 'properties'])
    .map((value, key) => {
      return value
        .set('path', getPath(key, fromJS(pathMappers)))
    }).filter(mapping => !mapping.get('path').isEmpty())
}

function convertToNested (elasticTypesWithPaths, index, type) {
  return elasticTypesWithPaths
    .reduce((acc, value, key) => {
      const path = value.get('path')
      if (!path.isEmpty()) {
        return acc.setIn(path, value
          .delete('path')
        )

      }
      return acc.set(key, value
        .delete('path')
      )
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

function convertToGraphQLSchema ({ object, elasticIndex, elasticType, customTypes }) {
  const customTypesMap = fromJS(customTypes)
  return object.reduce((acc, value, key) => {
    if (customTypesMap.has(key)) {
      const type = customTypesMap.get(key).get('type')
      if (isOutputType(type)) {
        return {
          ...acc,
          [key]: customTypesMap.get(key).toJS()
        }
      }
    }
    const type = value.get('type')
    if (!value.get('type')) {
      return {
        ...acc,
        [key]: {
          type: new GraphQLObjectType({
            name: key,
            fields: () => convertToGraphQLSchema({ object: value, elasticIndex, elasticType, customTypes })
          })
        }
      }
    }
    return {
      ...acc,
      [key]: elasticToGraphQL[type]
    }
  }, {})
}

const createElasticFormatter = ({ fieldName, elasticMappingsWithPaths }) => (response) => {
  const hits = response.hits.hits
    .map(hit => new Map(hit._source).map(v => new Map({ value: v })))
    .map(hit => hit.mergeDeep(elasticMappingsWithPaths))
    .map(hit => convertToNestedValues(hit).toJS())
  return {
    [fieldName]: hits,
    count: response.hits.total,
    cursor: response._scroll_id,
  }
}
export function report(argument) {
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

const createResolver = ({
  fieldName,
  elasticIndex,
  elasticType,
  elasticMappingsWithPaths,
}) => ({
  elasticClient,
  geneId,
  cursor,
  size,
  info,
}) => {
  const formatter = createElasticFormatter({
    fieldName,
    elasticMappingsWithPaths,
  })
  if (cursor) {
    return elasticClient.scroll({
      scrollId: cursor,
      scroll: '30m',
    }).then(formatter)
  }
  const fields = fromJS(info.fieldASTs)
  const astValues = getSelectionNames(fields, info.variableValues)
  const elasticConditions = astValues.args.map(getElasticsearchConditions)
  return elasticClient.search({
    index: elasticIndex,
    type: elasticType,
    size: size || 1000,
    scroll: '30m',
    _source: astValues.names,
    body: {
      query: {
        bool: {
          must: [
            { term: { geneId } }
          ],
          filter: {
            bool: {
              must: elasticConditions
            }
          }
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  }).then(formatter)
}


export const createGraphQLObjectWithElasticCursor = ({
  name,
  description,
  fieldName,
  listItemObjectName,
  elasticMappings,
  pathMappers,
  customTypes,
  elasticIndex,
  elasticType,
}) => {
  const elasticMappingsWithPaths = getPaths({ elasticMappings, pathMappers, elasticIndex, elasticType })
  const nested = convertToNested(elasticMappingsWithPaths)
  const listItemObjectType = convertToGraphQLSchema({ object: nested, elasticIndex, elasticType, customTypes })
  const resolver = createResolver({ fieldName, elasticIndex, elasticMappingsWithPaths })
  return {
    description,
    args: {
      geneId: { type: GraphQLString },
      cursor: { type: GraphQLString },
      size: { type: GraphQLInt },
    },
    type: new GraphQLObjectType({
      name,
      fields: () => ({
        count: { type: GraphQLInt },
        cursor: { type: GraphQLString },
        [fieldName]: { type: new GraphQLList(new GraphQLObjectType({
          name: listItemObjectName,
          fields: () => listItemObjectType
        })) },
      })
    }),
    resolve: (obj, args, ctx, info) => {
      return resolver({
        elasticClient: ctx.database.elastic,
        cursor: args.cursor,
        geneId: args.geneId,
        info,
        size: args.size,
      })
    }
  }
}

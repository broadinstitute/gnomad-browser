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

import mappingsJson from '../../elastic-mappings/mappings.json'

const graphqlToElastic = {
  keyword: GraphQLString,
  half_float: GraphQLFloat,
  integer: GraphQLInt,
  boolean: GraphQLBoolean,
  long: GraphQLFloat,
}

const populationsDictionary = fromJS({
  NFE: 'europeanNonFinnish',
  EAS: 'eastAsian',
  OTH: 'other',
  AFR: 'african',
  AMR: 'latino',
  SAS: 'southAsian',
  FIN: 'europeanFinnish',
  ASJ: 'ashkenaziJewish',
})

// const populationType = new GraphQLObjectType({
//   name: 'Population',
//   fields: () => ({
//
//   }),
// })
//
// const populationsType = new GraphQLObjectType({
//   name: 'Populations',
//   fields: () => ({
//
//   })
// })

const populationKeys = populationsDictionary.keySeq()
const populationNames = populationsDictionary.valueSeq()

const populationFields = new List(['AC', 'AN', 'Hom', 'Hemi'])
  .reduce((acc, value) => acc.concat(populationKeys.map(pop => `${value}_${pop}`)), new List())

function getPath (key) {
  const path = new List([])
  if (populationFields.contains(key)) {
    const [populationDataType, pop] = key.split('_')
    return path
      .push('populations')
      .push(populationsDictionary.get(pop))
      .push(key)
  }
  return path
}

const mappings = fromJS(mappingsJson)

const gnomadVariantTypes = mappings
  .getIn(['gnomad_exomes', 'mappings', 'variant', 'properties'])
  .map((value, key) => {
    return value.set('path', getPath(key))
  })
function convertToObject (gnomadVariantTypes) {
  const object = gnomadVariantTypes
    .reduce((acc, value, key) => {
      const path = value.get('path')
      if (!path.isEmpty()) {
        return acc.setIn(path, value.delete('path'))
      }
      return acc.set(key, value.delete('path'))
    }, new Map())
  return object
}

const reshaped = convertToObject(gnomadVariantTypes)

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

const variantGraphQLFields = convertToGraphQLSchema(reshaped)

console.log(variantGraphQLFields)

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

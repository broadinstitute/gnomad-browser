/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql'

const metaVariantPopulationType = new GraphQLObjectType({
  name: 'MetaVariantPopulation',
  fields: () => ({
    'population_name': {
      type: GraphQLString,
      description: '',
    },
    'study_name': {
      type: GraphQLString,
      description: '',
    },
    'phe_hom_ref': {
      type: GraphQLInt,
      description: '',
    },
    'phe_het': {
      type: GraphQLInt,
      description: '',
    },
    'phe_hom_alt': {
      type: GraphQLInt,
      description: '',
    },
    'phe_allele_frequency': {
      type: GraphQLFloat,
      description: '',
    },
    'hc_hom_ref': {
      type: GraphQLInt,
      description: '',
    },
    'hc_het': {
      type: GraphQLInt,
      description: '',
    },
    'hc_hom_alt': {
      type: GraphQLInt,
      description: '',
    },
    'hc_allele_frequency': {
      type: GraphQLFloat,
      description: '',
    },
    'odds_ratio': {
      type: GraphQLFloat,
      description: '',
    },
    'se': {
      type: GraphQLFloat,
      description: '',
    },
    'p_value': {
      type: GraphQLFloat,
      description: '',
    },
    'info': {
      type: GraphQLInt,
      description: '',
    },
    'n_denovo': {
      type: GraphQLInt,
      description: '',
    },
  }),
})

export default metaVariantPopulationType

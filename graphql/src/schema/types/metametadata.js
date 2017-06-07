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

const metaMetaDataType = new GraphQLObjectType({
  name: 'metaMetaData',
  fields: () => ({
    meta_file_format_version: {
      type: GraphQLString,
      description: '',
    },
    analytic_pipeline: {
      type: GraphQLString,
      description: '',
    },
    analytic_pipeline_version: {
      type: GraphQLString,
      description: '',
    },
    sharing: {
      type: GraphQLString,
      description: '',
    },
    title: {
      type: GraphQLString,
      description: '',
    },
    date: {
      type: GraphQLString,
      description: '',
    },
    analysts: {
      type: new GraphQLList(GraphQLString),
      description: '',
    },
    contact: {
      type: GraphQLString,
      description: '',
    },
    genome_build: {
      type: GraphQLString,
      description: '',
    },
    imputation_reference: {
      type: GraphQLString,
      description: '',
    },
    chromosomes: {
      type: new GraphQLList(GraphQLString),
      description: '',
    },
    case_definition: {
      type: GraphQLString,
      description: '',
    },
    control_definition: {
      type: GraphQLString,
      description: '',
    },
    diagnosis_definition: {
      type: GraphQLString,
      description: '',
    },
    number_of_cohorts: {
      type: GraphQLString,
      description: '',
    },
    study_cohort_ids: {
      type: new GraphQLList(GraphQLString),
      description: '',
    },
    // population_definitions: {
    //   type: new GraphQLObjectType({
    //     name: 'population_definitions',
    //     fields: {
    //       european_non_finnish: { type: GraphQLString }
    //       east_asian: 'east_asian',
    //     }
    //   })
    //   description: '',
    // },
    final_number_of_cases: {
      type: GraphQLInt,
      description: '',
    },
    final_number_of_controls: {
      type: GraphQLInt,
      description: '',
    },
  }),
})

export default metaMetaDataType

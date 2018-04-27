/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
} from 'graphql'

export const regionalConstraintRegion = new GraphQLObjectType({
  name: 'RegionalConstraintMissense',
  fields: () => ({
    transcript: { type: GraphQLString },
    gene: { type: GraphQLString },
    chr: { type: GraphQLString },
    amino_acids: { type: GraphQLString },
    genomic_start: { type: GraphQLInt },
    genomic_end: { type: GraphQLInt },
    obs_mis: { type: GraphQLInt },
    exp_mis: { type: GraphQLFloat },
    obs_exp: { type: GraphQLFloat },
    chisq_diff_null: { type: GraphQLFloat },
    region_name: { type: GraphQLString },
  }),
})

export const lookUpRegionalConstraintRegions = ({ elasticClient, geneName }) => {
  return new Promise((resolve, _) => {
    elasticClient.search({
      index: 'regional_missense',
      type: 'region',
      size: 100,
      body: {
        query: {
          match: {
            gene: geneName,
          },
        },
      }
    }).then((response) => {
      resolve(response.hits.hits.map((v) => {
        const ConstraintRegions = v._source
        return ConstraintRegions
      }))
    })
  })
}

export const regionalConstraintGeneStatsType = new GraphQLObjectType({
  name: 'RegionalConstraintGeneStats',
  fields: () => ({
    transcript: { type: GraphQLString },
    gene: { type: GraphQLString },
    chr: { type: GraphQLInt },
    n_coding_exons: { type: GraphQLInt },
    cds_start: { type: GraphQLInt },
    cds_end: { type: GraphQLInt },
    bp: { type: GraphQLInt },
    amino_acids: { type: GraphQLInt },
    low_depth_exons: {
      type: GraphQLInt,
      resolve: (obj) => {
        if (obj.low_depth_exons === '.') {
          return 0
        }
        return obj.low_depth_exons
      }
    },
    obs_mis: { type: GraphQLInt },
    exp_mis: { type: GraphQLFloat },
    obs_exp: { type: GraphQLFloat },
    overall_chisq: { type: GraphQLFloat },
    n_regions: { type: GraphQLInt },
  }),
})

export const lookUpRegionalConstraintGeneStats = ({ elasticClient, geneName }) => {
  return new Promise((resolve, reject) => {
    elasticClient.search({
      index: 'regional_constraint_full_gene',
      type: 'gene',
      size: 1,
      body: {
        query: {
          match: {
            gene: geneName,
          },
        },
      },
    }).then((response) => {
      if (response.hits.hits.length === 0) {
        reject('Could not find gene')
      } else {
        resolve(response.hits.hits[0]._source)
      }
    })
  })
}

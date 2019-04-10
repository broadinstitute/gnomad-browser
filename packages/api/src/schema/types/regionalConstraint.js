import { GraphQLFloat, GraphQLInt, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

export const RegionalMissenseConstraintRegionType = new GraphQLObjectType({
  name: 'RegionalMissenseConstraintRegion',
  fields: {
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
    obs_mis: { type: GraphQLFloat },
    exp_mis: { type: GraphQLFloat },
    obs_exp: { type: GraphQLFloat },
    chisq_diff_null: { type: GraphQLFloat },
  },
})

export const fetchExacRegionalMissenseConstraintRegions = async (ctx, geneName) => {
  const response = await ctx.database.elastic.search({
    index: 'exac_regional_missense_constraint_regions',
    type: 'region',
    size: 100,
    body: {
      query: {
        bool: {
          filter: {
            term: { gene_name: geneName },
          },
        },
      },
    },
  })

  return response.hits.hits.map(hit => hit._source) // eslint-disable-line no-underscore-dangle
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

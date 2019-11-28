import { GraphQLFloat, GraphQLInt, GraphQLList, GraphQLObjectType } from 'graphql'

export const HistogramType = new GraphQLObjectType({
  name: 'Histogram',
  fields: {
    bin_edges: { type: new GraphQLList(GraphQLFloat) },
    bin_freq: { type: new GraphQLList(GraphQLFloat) },
    n_larger: { type: GraphQLInt },
    n_smaller: { type: GraphQLInt },
  },
})

export const formatHistogram = histogramData => ({
  bin_edges: histogramData.bin_edges.split('|').map(s => Number(s)),
  bin_freq: histogramData.bin_freq.split('|').map(s => Number(s)),
  n_larger: histogramData.n_larger,
  n_smaller: histogramData.n_smaller,
})

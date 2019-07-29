import { GraphQLFloat, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

const QualityMetricHistogramType = new GraphQLObjectType({
  name: 'AggregateQualityMetricHistogram',
  fields: {
    bin_edges: { type: new GraphQLList(GraphQLFloat) },
    bin_freq: { type: new GraphQLList(GraphQLFloat) },
    n_smaller: { type: GraphQLInt },
    n_larger: { type: GraphQLInt },
  },
})

const AggregateQualityMetricType = new GraphQLObjectType({
  name: 'AggregateQualityMetric',
  fields: {
    metric: { type: GraphQLString },
    histogram: { type: QualityMetricHistogramType },
  },
})

const SiteQualityAlleleFrequencyBinType = new GraphQLObjectType({
  name: 'AggregateSiteQualityAlleleFrequencyBin',
  fields: {
    min_af: { type: GraphQLFloat },
    max_af: { type: GraphQLFloat },
    histogram: { type: QualityMetricHistogramType },
  },
})

const SiteQualityMetricType = new GraphQLObjectType({
  name: 'AggregateSiteQualityMetric',
  fields: {
    singleton: { type: QualityMetricHistogramType },
    doubleton: { type: QualityMetricHistogramType },
    af_bins: { type: new GraphQLList(SiteQualityAlleleFrequencyBinType) },
  },
})

export const AggregateQualityMetricsType = new GraphQLObjectType({
  name: 'AggregateQualityMetrics',
  fields: {
    exome: {
      type: new GraphQLObjectType({
        name: 'AggregateQualityMetricsExome',
        fields: {
          siteQuality: { type: SiteQualityMetricType },
          otherMetrics: { type: new GraphQLList(AggregateQualityMetricType) },
        },
      }),
    },
    genome: {
      type: new GraphQLObjectType({
        name: 'AggregateQualityMetricsGenome',
        fields: {
          siteQuality: { type: SiteQualityMetricType },
          otherMetrics: { type: new GraphQLList(AggregateQualityMetricType) },
        },
      }),
    },
  },
})

const SITE_QUALITY_ALLELE_FREQUENCY_BINS = [
  [0, 0.00005],
  [0.00005, 0.0001],
  [0.0001, 0.0002],
  [0.0002, 0.0005],
  [0.0005, 0.001],
  [0.001, 0.002],
  [0.002, 0.005],
  [0.005, 0.01],
  [0.01, 0.02],
  [0.02, 0.05],
  [0.05, 0.1],
  [0.1, 0.2],
  [0.2, 0.5],
  [0.5, 1],
]

const scaleBins = histogram => ({
  ...histogram,
  bin_edges: histogram.bin_edges.map(n => 10 ** n),
})

const metricsToScale = ['DP']

const metricAlias = {
  rf_tp_probability: 'RF',
}

export const formatAggregateQualityMetrics = metricsList => {
  const siteQualityMetrics = metricsList.filter(m => m.metric.startsWith('binned_'))
  const otherMetrics = metricsList.filter(m => !m.metric.startsWith('binned_'))

  const siteQualityByMetric = siteQualityMetrics.reduce((acc, m) => ({ ...acc, [m.metric]: m }), {})

  const emptySiteQualityHistogram = scaleBins({
    bin_edges: [...Array(37)].map((_, i) => 1 + i * 0.25),
    bin_freq: [...Array(36)].map(() => 0),
    n_smaller: 0,
    n_larger: 0,
  })

  return {
    siteQuality: {
      singleton: scaleBins(siteQualityByMetric.binned_singleton),
      doubleton: scaleBins(siteQualityByMetric.binned_doubleton),
      af_bins: SITE_QUALITY_ALLELE_FREQUENCY_BINS.map(afBin => ({
        min_af: afBin[0],
        max_af: afBin[1],
        histogram: siteQualityByMetric[`binned_${afBin[1]}`]
          ? scaleBins(siteQualityByMetric[`binned_${afBin[1]}`])
          : emptySiteQualityHistogram,
      })),
    },
    otherMetrics: otherMetrics.map(m => ({
      metric: metricAlias[m.metric] || m.metric,
      histogram: metricsToScale.includes(m.metric) ? scaleBins(m) : m,
    })),
  }
}

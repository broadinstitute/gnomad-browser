import {
  GraphQLFloat,
  GraphQLList,
  GraphQLObjectType,
} from 'graphql'


const QualityMetricHistogramBinType = new GraphQLObjectType({
  name: 'AggregateQualityMetricHistogramBin',
  fields: {
    x0: { type: GraphQLFloat },
    x1: { type: GraphQLFloat },
    n: { type: GraphQLFloat },
  },
})


const QualityMetricHistogramType = new GraphQLObjectType({
  name: 'AggregateQualityMetricHistogram',
  fields: {
    bins: { type: new GraphQLList(QualityMetricHistogramBinType) },
  },
})


const SiteQualityAlleleFrequencyBinType = new GraphQLObjectType({
  name: 'AggregateSiteQualityAlleleFrequencyBin',
  fields: {
    min_af: { type: GraphQLFloat },
    max_af: { type: GraphQLFloat },
    bins: { type: new GraphQLList(QualityMetricHistogramBinType) },
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
    AB_MEDIAN: { type: QualityMetricHistogramType },
    AS_RF: { type: QualityMetricHistogramType },
    BaseQRankSum: { type: QualityMetricHistogramType },
    ClippingRankSum: { type: QualityMetricHistogramType },
    DP: { type: QualityMetricHistogramType },
    DP_MEDIAN: { type: QualityMetricHistogramType },
    DREF_MEDIAN: { type: QualityMetricHistogramType },
    FS: { type: QualityMetricHistogramType },
    GQ_MEDIAN: { type: QualityMetricHistogramType },
    InbreedingCoeff: { type: QualityMetricHistogramType },
    MQ: { type: QualityMetricHistogramType },
    MQRankSum: { type: QualityMetricHistogramType },
    QD: { type: QualityMetricHistogramType },
    ReadPosRankSum: { type: QualityMetricHistogramType },
    SiteQuality: { type: SiteQualityMetricType },
    VQSLOD: { type: QualityMetricHistogramType },
  },
})


const formatMetricBins = metric => metric.hist.map((n, i) => ({
  x0: metric.mids[i],
  x1: metric.mids[i + 1],
  n,
}))


const scaleBins = bins => bins.map(bin => ({
  x0: Math.exp(bin.x0),
  x1: Math.exp(bin.x1),
  n: bin.n,
}))


const SITE_QUALITY_AF_BINS = [
  [0, 0.0005],
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


export const resolveAggregateQualityMetrics = async (ctx, collectionName) => {
  const allMetrics = await ctx.database.gnomad.collection(collectionName).find().toArray()

  const metricsByName = allMetrics.reduce((acc, m) => ({ ...acc, [m.metric]: m }), {})

  return ({
    AB_MEDIAN: { bins: formatMetricBins(metricsByName.AB_MEDIAN) },
    AS_RF: { bins: formatMetricBins(metricsByName.AS_RF) },
    BaseQRankSum: { bins: formatMetricBins(metricsByName.BaseQRankSum) },
    ClippingRankSum: { bins: formatMetricBins(metricsByName.ClippingRankSum) },
    DP: { bins: scaleBins(formatMetricBins(metricsByName.DP)) },
    DP_MEDIAN: { bins: formatMetricBins(metricsByName.DP_MEDIAN) },
    DREF_MEDIAN: { bins: formatMetricBins(metricsByName.DREF_MEDIAN) },
    FS: { bins: formatMetricBins(metricsByName.FS) },
    GQ_MEDIAN: { bins: formatMetricBins(metricsByName.GQ_MEDIAN) },
    InbreedingCoeff: { bins: formatMetricBins(metricsByName.InbreedingCoeff) },
    MQ: { bins: formatMetricBins(metricsByName.MQ) },
    MQRankSum: { bins: formatMetricBins(metricsByName.MQRankSum) },
    QD: { bins: formatMetricBins(metricsByName.QD) },
    ReadPosRankSum: { bins: formatMetricBins(metricsByName.ReadPosRankSum) },
    SiteQuality: {
      singleton: { bins: scaleBins(formatMetricBins(metricsByName.binned_singleton)) },
      doubleton: { bins: scaleBins(formatMetricBins(metricsByName.binned_doubleton)) },
      af_bins: SITE_QUALITY_AF_BINS.map(afBin => ({
        min_af: afBin[0],
        max_af: afBin[1],
        bins: scaleBins(formatMetricBins(metricsByName[`binned_${afBin[1]}`])),
      })),
    },
    VQSLOD: { bins: formatMetricBins(metricsByName.VQSLOD) },
  })
}

import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { SegmentedControl, Select } from '@broad/ui'

import ControlSection from '../ControlSection'
import { AggregateQualityMetricsQuery } from './AggregateQualityMetricsQuery'
import { BarGraph } from './BarGraph'

const allMetrics = [
  'SiteQuality',
  'FS',
  'MQRankSum',
  'InbreedingCoeff',
  'ReadPosRankSum',
  'VQSLOD',
  'QD',
  'DP',
  'BaseQRankSum',
  'MQ',
  'ClippingRankSum',
  'RF',
  'pab_max',
]

export class GnomadSiteQualityMetrics extends Component {
  constructor(props) {
    super(props)

    this.state = {
      selectedDataset: props.variant.exome ? 'exome' : 'genome',
      selectedMetric: 'SiteQuality',
    }
  }

  render() {
    const { datasetId, variant } = this.props
    const { selectedDataset, selectedMetric } = this.state

    return (
      <AggregateQualityMetricsQuery datasetId={datasetId}>
        {({ data, error, loading }) => {
          if (loading) {
            return <p>Loading...</p>
          }
          if (error) {
            return <p>Unable to load metrics</p>
          }

          const variantData = variant[selectedDataset]
          const metricData = data.aggregateQualityMetrics[selectedDataset]

          let selectedMetricBins
          let selectedSiteQualityBinDescription
          if (selectedMetric === 'SiteQuality') {
            if (variantData.ac === 1) {
              selectedMetricBins = metricData.siteQuality.singleton.bin_freq.map((n, i) => ({
                x0: metricData.siteQuality.singleton.bin_edges[i],
                x1: metricData.siteQuality.singleton.bin_edges[i + 1],
                n,
              }))
              selectedSiteQualityBinDescription = 'singleton variants'
            } else if (variantData.ac === 2) {
              selectedMetricBins = metricData.siteQuality.doubleton.bin_freq.map((n, i) => ({
                x0: metricData.siteQuality.doubleton.bin_edges[i],
                x1: metricData.siteQuality.doubleton.bin_edges[i + 1],
                n,
              }))
              selectedSiteQualityBinDescription = 'doubleton variants'
            } else {
              const variantAlleleFreq = variantData.an === 0 ? 0 : variantData.ac / variantData.an
              const selectedAlleleFreqBin = metricData.siteQuality.af_bins.find(
                bin =>
                  bin.min_af <= variantAlleleFreq &&
                  (variantAlleleFreq < bin.max_af ||
                    (variantAlleleFreq === 1 && variantAlleleFreq <= bin.max_af))
              )
              selectedMetricBins = selectedAlleleFreqBin.histogram.bin_freq.map((n, i) => ({
                x0: selectedAlleleFreqBin.histogram.bin_edges[i],
                x1: selectedAlleleFreqBin.histogram.bin_edges[i + 1],
                n,
              }))
              selectedSiteQualityBinDescription = `variants with ${
                selectedAlleleFreqBin.min_af
              } <= AF ${selectedAlleleFreqBin.max_af === 1 ? '<=' : '<'} ${
                selectedAlleleFreqBin.max_af
              }`
            }
          } else {
            const { histogram } = metricData.otherMetrics.find(m => m.metric === selectedMetric)

            selectedMetricBins = histogram.bin_freq.map((n, i) => ({
              x0: histogram.bin_edges[i],
              x1: histogram.bin_edges[i + 1],
              n,
            }))
          }

          const graphColor = selectedDataset === 'exome' ? '#428bca' : '#73ab3d'

          const availableMetrics = allMetrics.filter(
            metric => variantData.qualityMetrics.siteQualityMetrics[metric] !== null
          )

          return (
            <div>
              <BarGraph
                barColor={graphColor}
                bins={selectedMetricBins}
                highlightValue={variantData.qualityMetrics.siteQualityMetrics[selectedMetric]}
                logScale={selectedMetric === 'SiteQuality' || selectedMetric === 'DP'}
                xLabel={selectedMetric}
                yLabel="Variants"
              />

              <ControlSection>
                <Select
                  onChange={e => {
                    this.setState({ selectedMetric: e.target.value })
                  }}
                  value={selectedMetric}
                >
                  {availableMetrics.map(metric => {
                    const metricValue = variantData.qualityMetrics.siteQualityMetrics[metric]
                    return (
                      <option key={metric} value={metric}>
                        {metric} ({metricValue.toPrecision(4).replace(/\.0+$/, '')})
                      </option>
                    )
                  })}
                </Select>

                <SegmentedControl
                  id="site-quality-metrics-dataset"
                  onChange={dataset => {
                    this.setState({ selectedDataset: dataset })
                  }}
                  options={[
                    { disabled: !variant.exome, label: 'Exomes', value: 'exome' },
                    {
                      disabled: !variant.genome,
                      label: 'Genomes',
                      value: 'genome',
                    },
                  ]}
                  value={selectedDataset}
                />
              </ControlSection>

              <p>
                Note: These are site-level quality metrics, they may be unpredictable for
                multi-allelic sites.
              </p>
              {selectedMetric === 'SiteQuality' && (
                <p>
                  This is the site quality distribution for all {selectedSiteQualityBinDescription}.
                </p>
              )}
            </div>
          )
        }}
      </AggregateQualityMetricsQuery>
    )
  }
}

const variantSiteQualityMetricsPropType = PropTypes.shape({
  AB_MEDIAN: PropTypes.number,
  AS_RF: PropTypes.number,
  BaseQRankSum: PropTypes.number,
  ClippingRankSum: PropTypes.number,
  DP: PropTypes.number,
  DP_MEDIAN: PropTypes.number,
  DREF_MEDIAN: PropTypes.number,
  FS: PropTypes.number,
  GQ_MEDIAN: PropTypes.number,
  InbreedingCoeff: PropTypes.number,
  MQ: PropTypes.number,
  MQRankSum: PropTypes.number,
  QD: PropTypes.number,
  ReadPosRankSum: PropTypes.number,
  RF: PropTypes.number,
  SiteQuality: PropTypes.number,
  VQSLOD: PropTypes.number,
})

GnomadSiteQualityMetrics.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    exome: PropTypes.shape({
      qualityMetrics: PropTypes.shape({
        siteQualityMetrics: variantSiteQualityMetricsPropType.isRequired,
      }).isRequired,
    }),
    genome: PropTypes.shape({
      qualityMetrics: PropTypes.shape({
        siteQualityMetrics: variantSiteQualityMetricsPropType.isRequired,
      }).isRequired,
    }),
  }).isRequired,
}

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { SegmentedControl } from '@broad/ui'

import { AggregateQualityMetricsQuery } from './AggregateQualityMetricsQuery'
import { BarGraph } from './BarGraph'

const ControlSection = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

const availableMetrics = [
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
    return (
      <AggregateQualityMetricsQuery datasetId={this.props.datasetId}>
        {({ data, error, loading }) => {
          if (loading) {
            return <p>Loading...</p>
          }
          if (error) {
            return <p>Unable to load metrics</p>
          }

          const variantData = this.props.variant[this.state.selectedDataset]
          const metricData = data.aggregateQualityMetrics[this.state.selectedDataset]

          let selectedMetricBins
          let selectedSiteQualityBinDescription
          if (this.state.selectedMetric === 'SiteQuality') {
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
              const variantAlleleFreq = variantData.ac / variantData.an
              const selectedAlleleFreqBin = metricData.siteQuality.af_bins.find(
                bin => bin.min_af <= variantAlleleFreq && variantAlleleFreq < bin.max_af
              )
              selectedMetricBins = selectedAlleleFreqBin.histogram.bin_freq.map((n, i) => ({
                x0: selectedAlleleFreqBin.histogram.bin_edges[i],
                x1: selectedAlleleFreqBin.histogram.bin_edges[i + 1],
                n,
              }))
              selectedSiteQualityBinDescription = `variants with ${
                selectedAlleleFreqBin.min_af
              } < AF < ${selectedAlleleFreqBin.max_af}`
            }
          } else {
            const histogram = metricData.otherMetrics.find(
              m => m.metric === this.state.selectedMetric
            ).histogram

            selectedMetricBins = histogram.bin_freq.map((n, i) => ({
              x0: histogram.bin_edges[i],
              x1: histogram.bin_edges[i + 1],
              n,
            }))
          }

          const graphColor = this.state.selectedDataset === 'exome' ? '#428bca' : '#73ab3d'

          return (
            <div>
              <BarGraph
                barColor={graphColor}
                bins={selectedMetricBins}
                highlightValue={
                  variantData.qualityMetrics.siteQualityMetrics[this.state.selectedMetric]
                }
                logScale={
                  this.state.selectedMetric === 'SiteQuality' || this.state.selectedMetric === 'DP'
                }
                xLabel={this.state.selectedMetric}
                yLabel="Variants"
              />

              <ControlSection>
                <select
                  onChange={e => {
                    this.setState({ selectedMetric: e.target.value })
                  }}
                  value={this.state.selectedMetric}
                >
                  {availableMetrics.map(metric => (
                    <option key={metric} value={metric}>
                      {metric} ({variantData.qualityMetrics.siteQualityMetrics[metric]})
                    </option>
                  ))}
                </select>

                <SegmentedControl
                  id="site-quality-metrics-dataset"
                  onChange={selectedDataset => {
                    this.setState({ selectedDataset })
                  }}
                  options={[
                    { disabled: !this.props.variant.exome, label: 'Exomes', value: 'exome' },
                    {
                      disabled: !this.props.variant.genome,
                      label: 'Genomes',
                      value: 'genome',
                    },
                  ]}
                  value={this.state.selectedDataset}
                />
              </ControlSection>

              <p>
                Note: These are site-level quality metrics, they may be unpredictable for
                multi-allelic sites.
              </p>
              {this.state.selectedMetric === 'SiteQuality' && (
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
  SiteQuality: PropTypes.number,
  GQ_MEDIAN: PropTypes.number,
  FS: PropTypes.number,
  MQRankSum: PropTypes.number,
  InbreedingCoeff: PropTypes.number,
  ReadPosRankSum: PropTypes.number,
  VQSLOD: PropTypes.number,
  QD: PropTypes.number,
  DP: PropTypes.number,
  BaseQRankSum: PropTypes.number,
  MQ: PropTypes.number,
  AS_RF: PropTypes.number,
  DP_MEDIAN: PropTypes.number,
  AB_MEDIAN: PropTypes.number,
  ClippingRankSum: PropTypes.number,
  DREF_MEDIAN: PropTypes.number,
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

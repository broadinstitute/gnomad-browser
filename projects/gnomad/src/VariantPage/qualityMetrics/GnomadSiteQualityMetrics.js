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
  'GQ_MEDIAN',
  'FS',
  'MQRankSum',
  'InbreedingCoeff',
  'ReadPosRankSum',
  'VQSLOD',
  'QD',
  'DP',
  'BaseQRankSum',
  'MQ',
  'AS_RF',
  'DP_MEDIAN',
  'AB_MEDIAN',
  'ClippingRankSum',
  'DREF_MEDIAN',
]

export class GnomadSiteQualityMetrics extends Component {
  constructor(props) {
    super(props)

    this.state = {
      selectedDataset: props.variant.exome ? 'gnomadExomes' : 'gnomadGenomes',
      selectedMetric: 'SiteQuality',
    }
  }

  render() {
    return (
      <AggregateQualityMetricsQuery dataset={this.state.selectedDataset}>
        {({ data, error, loading }) => {
          if (loading) {
            return <p>Loading...</p>
          }
          if (error) {
            return <p>Unable to load metrics</p>
          }

          const variantData =
            this.state.selectedDataset === 'gnomadExomes'
              ? this.props.variant.exome
              : this.props.variant.genome

          const metricData = data.aggregateQualityMetrics

          let selectedMetricBins
          let selectedSiteQualityBinDescription
          if (this.state.selectedMetric === 'SiteQuality') {
            const variantAlleleFreq = variantData.ac / variantData.an

            if (variantAlleleFreq === 1) {
              selectedMetricBins = metricData.SiteQuality.singleton.bins
              selectedSiteQualityBinDescription = 'singleton variants'
            } else if (variantAlleleFreq === 2) {
              selectedMetricBins = metricData.SiteQuality.doubleton.bins
              selectedSiteQualityBinDescription = 'doubleton variants'
            } else {
              const selectedAlleleFreqBin = metricData.SiteQuality.af_bins.find(
                bin => bin.min_af <= variantAlleleFreq && variantAlleleFreq < bin.max_af
              )
              selectedMetricBins = selectedAlleleFreqBin.bins
              selectedSiteQualityBinDescription = `variants with ${
                selectedAlleleFreqBin.min_af
              } < AF < ${selectedAlleleFreqBin.max_af}`
            }
          } else {
            selectedMetricBins = metricData[this.state.selectedMetric].bins
          }

          return (
            <div>
              <BarGraph
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
                    { disabled: !this.props.variant.exome, label: 'Exomes', value: 'gnomadExomes' },
                    {
                      disabled: !this.props.variant.genome,
                      label: 'Genomes',
                      value: 'gnomadGenomes',
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

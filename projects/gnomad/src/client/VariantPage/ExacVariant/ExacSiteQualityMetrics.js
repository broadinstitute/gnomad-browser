import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { Select } from '@broad/ui'

import exacSiteQualityMetricDistributions from '../../dataset-constants/exac/siteQualityMetricDistributions.json'
import ControlSection from '../ControlSection'
import { BarGraph } from '../qualityMetrics/BarGraph'

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
]

export default class ExacSiteQualityMetrics extends Component {
  static propTypes = {
    variant: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      qualityMetrics: PropTypes.shape({
        siteQualityMetrics: PropTypes.shape({
          BaseQRankSum: PropTypes.number,
          ClippingRankSum: PropTypes.number,
          DP: PropTypes.number,
          FS: PropTypes.number,
          InbreedingCoeff: PropTypes.number,
          MQ: PropTypes.number,
          MQRankSum: PropTypes.number,
          QD: PropTypes.number,
          ReadPosRankSum: PropTypes.number,
          SiteQuality: PropTypes.number,
          VQSLOD: PropTypes.number,
        }).isRequired,
      }).isRequired,
    }).isRequired,
  }

  state = {
    selectedMetric: 'SiteQuality',
  }

  render() {
    const { variant } = this.props
    const { selectedMetric } = this.state

    const metricData = exacSiteQualityMetricDistributions

    let selectedMetricBins
    let selectedSiteQualityBinDescription
    if (selectedMetric === 'SiteQuality') {
      if (variant.ac === 1) {
        selectedMetricBins = metricData.siteQuality.singleton.bin_freq.map((n, i) => ({
          x0: metricData.siteQuality.singleton.bin_edges[i],
          x1: metricData.siteQuality.singleton.bin_edges[i + 1],
          n,
        }))
        selectedSiteQualityBinDescription = 'singleton variants'
      } else if (variant.ac === 2) {
        selectedMetricBins = metricData.siteQuality.doubleton.bin_freq.map((n, i) => ({
          x0: metricData.siteQuality.doubleton.bin_edges[i],
          x1: metricData.siteQuality.doubleton.bin_edges[i + 1],
          n,
        }))
        selectedSiteQualityBinDescription = 'doubleton variants'
      } else {
        const variantAlleleFreq = variant.an === 0 ? 0 : variant.ac / variant.an
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
        selectedSiteQualityBinDescription = `variants with ${selectedAlleleFreqBin.min_af} <= AF ${
          selectedAlleleFreqBin.max_af === 1 ? '<=' : '<'
        } ${selectedAlleleFreqBin.max_af}`
      }
    } else {
      const { histogram } = metricData.otherMetrics.find(m => m.metric === selectedMetric)

      selectedMetricBins = histogram.bin_freq.map((n, i) => ({
        x0: histogram.bin_edges[i],
        x1: histogram.bin_edges[i + 1],
        n,
      }))
    }

    const availableMetrics = allMetrics.filter(
      metric => variant.qualityMetrics.siteQualityMetrics[metric] !== null
    )

    return (
      <div>
        <BarGraph
          barColor="#428bca"
          bins={selectedMetricBins}
          highlightValue={variant.qualityMetrics.siteQualityMetrics[selectedMetric]}
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
              const metricValue = variant.qualityMetrics.siteQualityMetrics[metric]
              return (
                <option key={metric} value={metric}>
                  {metric} ({metricValue.toPrecision(4).replace(/\.0+$/, '')})
                </option>
              )
            })}
          </Select>
        </ControlSection>

        <p>
          Note: These are site-level quality metrics, they may be unpredictable for multi-allelic
          sites.
        </p>
        {selectedMetric === 'SiteQuality' && (
          <p>This is the site quality distribution for all {selectedSiteQualityBinDescription}.</p>
        )}
      </div>
    )
  }
}

import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { SegmentedControl, Select } from '@broad/ui'

import gnomadV2SiteQualityMetricDistributions from '../../dataset-constants/gnomad_r2_1_1/siteQualityMetricDistributions.json'
import gnomadV3SiteQualityMetricDistributions from '../../dataset-constants/gnomad_r3/siteQualityMetricDistributions.json'
import ControlSection from '../ControlSection'
import { BarGraph } from './BarGraph'
import qualityMetricDescriptions from './qualityMetricDescriptions'

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

const getSiteQualityMetricDistributions = datasetId => {
  if (datasetId === 'gnomad_r3') {
    return gnomadV3SiteQualityMetricDistributions
  }
  if (datasetId.startsWith('gnomad_r2')) {
    return gnomadV2SiteQualityMetricDistributions
  }
  throw new Error(`No quality metric distribution available for dataset "${datasetId}"`)
}

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

    const variantData = variant[selectedDataset]
    const siteQualityMetricDistributions = getSiteQualityMetricDistributions(datasetId)
    const metricData = siteQualityMetricDistributions[selectedDataset]

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

    const graphColor = selectedDataset === 'exome' ? '#428bca' : '#73ab3d'

    const availableMetrics = allMetrics.filter(
      metric => variantData.qualityMetrics.siteQualityMetrics[metric] !== null
    )

    const metricDescription = qualityMetricDescriptions[selectedMetric]

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

        {metricDescription && <p>{metricDescription}</p>}
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

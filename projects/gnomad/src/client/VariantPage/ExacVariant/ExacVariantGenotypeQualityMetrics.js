import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { SegmentedControl, Select } from '@broad/ui'

import Histogram from '../../Histogram'
import ControlSection from '../ControlSection'

const histogramPropType = PropTypes.shape({
  bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
  bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
})

export default class ExacVariantGenotypeQualityMetrics extends Component {
  static propTypes = {
    variant: PropTypes.shape({
      qualityMetrics: PropTypes.shape({
        genotypeDepth: PropTypes.shape({
          all: histogramPropType,
          alt: histogramPropType,
        }).isRequired,
        genotypeQuality: PropTypes.shape({
          all: histogramPropType,
          alt: histogramPropType,
        }).isRequired,
      }).isRequired,
    }).isRequired,
  }

  state = {
    selectedMetric: 'genotypeQuality', // 'genotypeQality', 'genotypeDepth'
    selectedSamples: 'all', // 'all' or 'alt'
  }

  render() {
    const { variant } = this.props
    const { selectedMetric, selectedSamples } = this.state

    const histogramData = variant.qualityMetrics[selectedMetric][selectedSamples]

    const xLabel = {
      genotypeQuality: 'Genotype Quality',
      genotypeDepth: 'Depth',
    }[selectedMetric]

    const yLabel = selectedSamples === 'all' ? 'All Individuals' : 'Variant carriers'

    return (
      <div>
        <Histogram
          barColor="#428bca"
          binEdges={histogramData.bin_edges}
          binValues={histogramData.bin_freq}
          xLabel={xLabel}
          yLabel={yLabel}
        />

        <ControlSection>
          <SegmentedControl
            id="genotype-quality-metrics-sample"
            onChange={samples => {
              this.setState({ selectedSamples: samples })
            }}
            options={[
              { label: 'All', value: 'all', disabled: selectedMetric === 'alleleBalance' },
              { label: 'Variant Carriers', value: 'alt' },
            ]}
            value={selectedSamples}
          />

          <Select
            id="genotype-quality-metrics-metric"
            onChange={e => {
              this.setState({ selectedMetric: e.target.value })
            }}
            value={selectedMetric}
          >
            <option value="genotypeQuality">Genotype Quality</option>
            <option value="genotypeDepth">Depth</option>
          </Select>
        </ControlSection>
      </div>
    )
  }
}

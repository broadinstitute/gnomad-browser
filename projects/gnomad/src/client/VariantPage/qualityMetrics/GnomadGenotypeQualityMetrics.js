import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { SegmentedControl } from '@broad/ui'

import { BarGraph } from './BarGraph'

const ControlSection = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

export class GnomadGenotypeQualityMetrics extends Component {
  constructor(props) {
    super(props)

    this.state = {
      selectedDataset: props.variant.exome ? 'exome' : 'genome',
      selectedMetric: 'quality', // 'quality' or 'depth'
      selectedSamples: 'all', // 'all' or 'alt'
    }
  }

  render() {
    const variant = this.props.variant
    const variantData = variant[this.state.selectedDataset]

    const histogramData =
      this.state.selectedMetric === 'quality'
        ? variantData.qualityMetrics.genotypeQuality[this.state.selectedSamples]
        : variantData.qualityMetrics.genotypeDepth[this.state.selectedSamples]

    const bins = histogramData.bin_freq.map((n, i) => ({
      x0: histogramData.bin_edges[i],
      x1: histogramData.bin_edges[i + 1],
      n,
    }))

    const xLabel = this.state.selectedMetric === 'quality' ? 'Genotype Quality' : 'Depth'

    const yLabel = this.state.selectedSamples === 'all' ? 'All Individuals' : 'Variant carriers'

    const graphColor = this.state.selectedDataset === 'exome' ? '#428bca' : '#73ab3d'

    return (
      <div>
        <BarGraph barColor={graphColor} bins={bins} xLabel={xLabel} yLabel={yLabel} />

        <ControlSection>
          <SegmentedControl
            id="genotype-quality-metrics-sample"
            onChange={selectedSamples => {
              this.setState({ selectedSamples })
            }}
            options={[{ label: 'All', value: 'all' }, { label: 'Variant Carriers', value: 'alt' }]}
            value={this.state.selectedSamples}
          />

          <SegmentedControl
            id="genotype-quality-metrics-metric"
            onChange={selectedMetric => {
              this.setState({ selectedMetric })
            }}
            options={[
              { label: 'Genotype Quality', value: 'quality' },
              { label: 'Depth', value: 'depth' },
            ]}
            value={this.state.selectedMetric}
          />

          <SegmentedControl
            id="genotype-quality-metrics-dataset"
            onChange={selectedDataset => {
              this.setState({ selectedDataset })
            }}
            options={[
              { disabled: !variant.exome, label: 'Exomes', value: 'exome' },
              { disabled: !variant.genome, label: 'Genomes', value: 'genome' },
            ]}
            value={this.state.selectedDataset}
          />
        </ControlSection>
      </div>
    )
  }
}

const histogramPropType = PropTypes.shape({
  bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
  bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
  n_smaller: PropTypes.number.isRequired,
  n_larger: PropTypes.number.isRequired,
})

const genotypeQualityMetricPropType = PropTypes.shape({
  genotypeDepth: PropTypes.shape({
    all: histogramPropType,
    alt: histogramPropType,
  }).isRequired,
  genotypeQuality: PropTypes.shape({
    all: histogramPropType,
    alt: histogramPropType,
  }).isRequired,
})

GnomadGenotypeQualityMetrics.propTypes = {
  variant: PropTypes.shape({
    exome: PropTypes.shape({
      qualityMetrics: genotypeQualityMetricPropType.isRequired,
    }),
    genome: PropTypes.shape({
      qualityMetrics: genotypeQualityMetricPropType.isRequired,
    }),
  }).isRequired,
}

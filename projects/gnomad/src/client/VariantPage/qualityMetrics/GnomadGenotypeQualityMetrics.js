import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { SegmentedControl } from '@broad/ui'

import Histogram from '../Histogram'

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
    const { variant } = this.props
    const { selectedDataset, selectedMetric, selectedSamples } = this.state

    const variantData = variant[selectedDataset]

    const histogramData =
      selectedMetric === 'quality'
        ? variantData.qualityMetrics.genotypeQuality[selectedSamples]
        : variantData.qualityMetrics.genotypeDepth[selectedSamples]

    const xLabel = selectedMetric === 'quality' ? 'Genotype Quality' : 'Depth'

    const yLabel = selectedSamples === 'all' ? 'All Individuals' : 'Variant carriers'

    const graphColor = selectedDataset === 'exome' ? '#428bca' : '#73ab3d'

    return (
      <div>
        <Histogram
          barColor={graphColor}
          binEdges={histogramData.bin_edges}
          binValues={histogramData.bin_freq}
          nLarger={histogramData.n_larger}
          xLabel={xLabel}
          yLabel={yLabel}
        />

        <ControlSection>
          <SegmentedControl
            id="genotype-quality-metrics-sample"
            onChange={samples => {
              this.setState({ selectedSamples: samples })
            }}
            options={[{ label: 'All', value: 'all' }, { label: 'Variant Carriers', value: 'alt' }]}
            value={selectedSamples}
          />

          <SegmentedControl
            id="genotype-quality-metrics-metric"
            onChange={metric => {
              this.setState({ selectedMetric: metric })
            }}
            options={[
              { label: 'Genotype Quality', value: 'quality' },
              { label: 'Depth', value: 'depth' },
            ]}
            value={selectedMetric}
          />

          <SegmentedControl
            id="genotype-quality-metrics-dataset"
            onChange={dataset => {
              this.setState({ selectedDataset: dataset })
            }}
            options={[
              { disabled: !variant.exome, label: 'Exomes', value: 'exome' },
              { disabled: !variant.genome, label: 'Genomes', value: 'genome' },
            ]}
            value={selectedDataset}
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

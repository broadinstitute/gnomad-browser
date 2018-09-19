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

    const metricValues =
      this.state.selectedMetric === 'quality'
        ? variantData.qualityMetrics.genotypeQuality[this.state.selectedSamples]
        : variantData.qualityMetrics.genotypeDepth[this.state.selectedSamples]

    const bins = metricValues.map((n, i) => ({
      x0: i * 5,
      x1: (i + 1) * 5,
      n,
    }))

    const xLabel = this.state.selectedMetric === 'quality' ? 'Genotype Quality' : 'Depth'

    const yLabel = this.state.selectedSamples === 'all' ? 'All Individuals' : 'Variant carriers'

    return (
      <div>
        <BarGraph bins={bins} xLabel={xLabel} yLabel={yLabel} />

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

const genotypeQualityMetricPropType = PropTypes.shape({
  genotypeDepth: PropTypes.shape({
    all: PropTypes.arrayOf(PropTypes.number).isRequired,
    alt: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
  genotypeQuality: PropTypes.shape({
    all: PropTypes.arrayOf(PropTypes.number).isRequired,
    alt: PropTypes.arrayOf(PropTypes.number).isRequired,
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

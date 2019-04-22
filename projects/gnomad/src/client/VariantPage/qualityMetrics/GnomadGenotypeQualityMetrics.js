import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { SegmentedControl, Select } from '@broad/ui'

import ControlSection from '../ControlSection'
import Histogram from '../Histogram'

export class GnomadGenotypeQualityMetrics extends Component {
  constructor(props) {
    super(props)

    this.state = {
      selectedDataset: props.variant.exome ? 'exome' : 'genome',
      selectedMetric: 'genotypeQuality', // 'genotypeQality', 'genotypeDepth', or 'alleleBalance'
      selectedSamples: 'all', // 'all' or 'alt'
    }
  }

  render() {
    const { variant } = this.props
    const { selectedDataset, selectedMetric, selectedSamples } = this.state

    const histogramData = variant[selectedDataset].qualityMetrics[selectedMetric][selectedSamples]

    const xLabel = {
      genotypeQuality: 'Genotype Quality',
      genotypeDepth: 'Depth',
      alleleBalance: 'Allele Balance',
    }[selectedMetric]

    const yLabel = selectedSamples === 'all' ? 'All Individuals' : 'Variant carriers'

    const graphColor = selectedDataset === 'exome' ? '#428bca' : '#73ab3d'

    return (
      <div>
        <Histogram
          barColor={graphColor}
          binEdges={histogramData.bin_edges}
          binValues={histogramData.bin_freq}
          nLarger={selectedMetric === 'alleleBalance' ? undefined : histogramData.n_larger}
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
              const metric = e.target.value
              const update = { selectedMetric: metric }
              // "All" data is not available for allele balance
              if (metric === 'alleleBalance') {
                update.selectedSamples = 'alt'
              }
              this.setState(update)
            }}
            value={selectedMetric}
          >
            <option value="genotypeQuality">Genotype Quality</option>
            <option value="genotypeDepth">Depth</option>
            <option value="alleleBalance">Allele Balance</option>
          </Select>

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
  alleleBalance: PropTypes.shape({
    alt: histogramPropType,
  }).isRequired,
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

import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { SegmentedControl, Select } from '@gnomad/ui'

import Histogram from '../Histogram'
import ControlSection from './ControlSection'

const histogramPropType = PropTypes.shape({
  bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
  bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
  n_smaller: PropTypes.number,
  n_larger: PropTypes.number,
})

const genotypeQualityMetricPropType = PropTypes.shape({
  allele_balance: PropTypes.shape({
    alt: histogramPropType,
  }),
  genotype_depth: PropTypes.shape({
    all: histogramPropType,
    alt: histogramPropType,
  }).isRequired,
  genotype_quality: PropTypes.shape({
    all: histogramPropType,
    alt: histogramPropType,
  }).isRequired,
})

class VariantGenotypeQualityMetrics extends Component {
  static propTypes = {
    datasetId: PropTypes.string.isRequired,
    variant: PropTypes.shape({
      exome: PropTypes.shape({
        quality_metrics: genotypeQualityMetricPropType.isRequired,
      }),
      genome: PropTypes.shape({
        quality_metrics: genotypeQualityMetricPropType.isRequired,
      }),
    }).isRequired,
  }

  constructor(props) {
    super(props)

    this.state = {
      selectedDataset: props.variant.exome ? 'exome' : 'genome',
      selectedMetric: 'genotype_quality', // 'genotype_quality', 'genotype_depth', or 'allele_balance'
      selectedSamples: 'all', // 'all' or 'alt'
    }
  }

  render() {
    const { datasetId, variant } = this.props
    const { selectedDataset, selectedMetric, selectedSamples } = this.state

    const histogramData = variant[selectedDataset].quality_metrics[selectedMetric][selectedSamples]

    const xLabel = {
      genotype_quality: 'Genotype Quality',
      genotype_depth: 'Depth',
      allele_balance: 'Allele Balance',
    }[selectedMetric]

    let yLabel
    if (selectedSamples === 'all') {
      yLabel = 'All individuals'
    } else if (selectedMetric === 'allele_balance') {
      yLabel = 'Heterozygous variant carriers'
    } else {
      yLabel = 'Variant carriers'
    }

    const graphColor = selectedDataset === 'exome' ? '#428bca' : '#73ab3d'

    return (
      <div>
        <Histogram
          barColor={graphColor}
          binEdges={histogramData.bin_edges}
          binValues={histogramData.bin_freq}
          nLarger={selectedMetric === 'allele_balance' ? undefined : histogramData.n_larger}
          xLabel={xLabel}
          yLabel={yLabel}
          formatTooltip={bin => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
        />

        <ControlSection>
          <Select
            id="genotype-quality-metrics-metric"
            onChange={e => {
              const metric = e.target.value
              const update = { selectedMetric: metric }
              // "All" data is not available for allele balance
              if (metric === 'allele_balance') {
                update.selectedSamples = 'alt'
              }
              this.setState(update)
            }}
            value={selectedMetric}
            style={{
              width: selectedMetric === 'allele_balance' ? 'auto' : '150px',
            }}
          >
            <option value="genotype_quality">Genotype quality</option>
            <option value="genotype_depth">Depth</option>
            {datasetId !== 'exac' && (
              <option value="allele_balance">Allele balance for heterozygotes</option>
            )}
          </Select>

          {selectedMetric !== 'allele_balance' && (
            <SegmentedControl
              id="genotype-quality-metrics-sample"
              onChange={samples => {
                this.setState({ selectedSamples: samples })
              }}
              options={[
                { label: 'All', value: 'all', disabled: selectedMetric === 'allele_balance' },
                { label: 'Variant Carriers', value: 'alt' },
              ]}
              value={selectedSamples}
            />
          )}

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

        {(datasetId.startsWith('gnomad_r2') || datasetId === 'exac') && (
          <p>
            Note: This plot may include low-quality genotypes that were excluded from allele counts
            in the tables above.
          </p>
        )}
      </div>
    )
  }
}

export default VariantGenotypeQualityMetrics

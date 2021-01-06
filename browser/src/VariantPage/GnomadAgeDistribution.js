import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { SegmentedControl, Select } from '@gnomad/ui'

import gnomadV2AgeDistribution from '../dataset-constants/gnomad_r2_1_1/ageDistribution.json'
import gnomadV3AgeDistribution from '../dataset-constants/gnomad_r3/ageDistribution.json'
import Histogram from '../Histogram'
import ControlSection from './ControlSection'

const AgeDistributionPropType = PropTypes.shape({
  het: PropTypes.shape({
    bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
    bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
    n_smaller: PropTypes.number,
    n_larger: PropTypes.number,
  }).isRequired,
  hom: PropTypes.shape({
    bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
    bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
    n_smaller: PropTypes.number,
    n_larger: PropTypes.number,
  }).isRequired,
})

export default class GnomadAgeDistribution extends Component {
  static propTypes = {
    datasetId: PropTypes.string.isRequired,
    variant: PropTypes.shape({
      exome: PropTypes.shape({
        age_distribution: AgeDistributionPropType.isRequired,
      }),
      genome: PropTypes.shape({
        age_distribution: AgeDistributionPropType.isRequired,
      }),
    }).isRequired,
  }

  constructor(props) {
    super(props)

    this.state = {
      selectedDataset: props.variant.exome ? 'exome' : 'genome',
      selectedSamples: 'het', // "all", "het", or "hom"
    }
  }

  render() {
    const { datasetId, variant } = this.props
    const { selectedDataset, selectedSamples } = this.state

    const overallAgeDistribution = datasetId.startsWith('gnomad_r3')
      ? gnomadV3AgeDistribution
      : gnomadV2AgeDistribution

    const selectedAgeDistribution =
      selectedSamples === 'all'
        ? overallAgeDistribution[selectedDataset]
        : variant[selectedDataset].age_distribution[selectedSamples]

    const graphColor = selectedDataset === 'exome' ? '#428bca' : '#73ab3d'

    return (
      <div>
        <Histogram
          barColor={graphColor}
          binEdges={selectedAgeDistribution.bin_edges}
          binValues={selectedAgeDistribution.bin_freq}
          nSmaller={selectedAgeDistribution.n_smaller}
          nLarger={selectedAgeDistribution.n_larger}
          xLabel="Age"
          yLabel="Individuals"
          formatTooltip={bin => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
        />

        <ControlSection>
          <Select
            id="age-distribution-sample"
            onChange={e => {
              this.setState({ selectedSamples: e.target.value })
            }}
            value={selectedSamples}
          >
            <option value="het">Heterozygous Variant Carriers</option>
            <option value="hom">Homozygous Variant Carriers</option>
            {(datasetId.startsWith('gnomad_r2') || datasetId.startsWith('gnomad_r3')) && (
              <option value="all">All Individuals</option>
            )}
          </Select>

          <SegmentedControl
            id="age-distribution-dataset"
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
      </div>
    )
  }
}

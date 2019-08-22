import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { Select } from '@broad/ui'

import Histogram from '../../Histogram'
import ControlSection from '../ControlSection'

export default class ExacAgeDistribution extends Component {
  static propTypes = {
    variant: PropTypes.shape({
      age_distribution: PropTypes.shape({
        het: PropTypes.shape({
          bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
          bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
          n_smaller: PropTypes.number.isRequired,
          n_larger: PropTypes.number.isRequired,
        }).isRequired,
        hom: PropTypes.shape({
          bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
          bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
          n_smaller: PropTypes.number.isRequired,
          n_larger: PropTypes.number.isRequired,
        }).isRequired,
      }).isRequired,
    }).isRequired,
  }

  state = {
    selectedSamples: 'het', // "het" or "hom"
  }

  render() {
    const { variant } = this.props
    const { selectedSamples } = this.state

    const selectedAgeDistribution = variant.age_distribution[selectedSamples]

    return (
      <div>
        <Histogram
          barColor="#428bca"
          binEdges={selectedAgeDistribution.bin_edges}
          binValues={selectedAgeDistribution.bin_freq}
          nSmaller={selectedAgeDistribution.n_smaller}
          nLarger={selectedAgeDistribution.n_larger}
          xLabel="Age"
          yLabel="Individuals"
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
          </Select>
        </ControlSection>
      </div>
    )
  }
}

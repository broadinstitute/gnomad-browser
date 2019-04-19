import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { SegmentedControl } from '@broad/ui'

import ControlSection from './ControlSection'
import Histogram from './Histogram'

export default class GnomadAgeDistribution extends Component {
  static propTypes = {
    variant: PropTypes.shape({
      age_distribution: PropTypes.shape({
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
      }),
    }).isRequired,
  }

  constructor(props) {
    super(props)

    this.state = {
      selectedType: 'het',
    }
  }

  render() {
    const { variant } = this.props
    const { selectedType } = this.state

    const selectedAgeDistribution =
      selectedType === 'het' ? variant.age_distribution.het : variant.age_distribution.hom

    return (
      <div>
        <Histogram
          binEdges={selectedAgeDistribution.bin_edges}
          binValues={selectedAgeDistribution.bin_freq}
          nSmaller={selectedAgeDistribution.n_smaller}
          nLarger={selectedAgeDistribution.n_larger}
          xLabel="Age"
          yLabel="Individuals"
        />

        <ControlSection>
          <SegmentedControl
            id="age-distribution-type"
            onChange={type => {
              this.setState({ selectedType: type })
            }}
            options={[
              { label: 'Heterozygotes', value: 'het' },
              { label: 'Homozygotes', value: 'hom' },
            ]}
            value={selectedType}
          />
        </ControlSection>
      </div>
    )
  }
}

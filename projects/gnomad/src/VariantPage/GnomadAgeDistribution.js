import React, { Component } from 'react'
import styled from 'styled-components'

import { SegmentedControl } from '@broad/ui'

import { BarGraph } from './qualityMetrics/BarGraph'

const ControlSection = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

export default class GnomadAgeDistribution extends Component {
  constructor(props) {
    super(props)

    this.state = {
      selectedType: 'het',
    }
  }

  render() {
    const variant = this.props.variant

    const histogramData =
      this.state.selectedType === 'het'
        ? variant.age_distribution.het
        : variant.age_distribution.hom

    const bins = histogramData.bin_freq.map((n, i) => ({
      x0: histogramData.bin_edges[i],
      x1: histogramData.bin_edges[i + 1],
      n,
    }))

    return (
      <div>
        <BarGraph
          bins={bins}
          nLarger={histogramData.n_larger}
          nSmaller={histogramData.n_smaller}
          xLabel="Age"
          yLabel="Individuals"
        />

        <ControlSection>
          <SegmentedControl
            id="age-distribution-type"
            onChange={selectedType => {
              this.setState({ selectedType })
            }}
            options={[
              { label: 'Heterozygotes', value: 'het' },
              { label: 'Homozygotes', value: 'hom' },
            ]}
            value={this.state.selectedType}
          />
        </ControlSection>
      </div>
    )
  }
}

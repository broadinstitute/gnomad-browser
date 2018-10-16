import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@broad/ui'

import { PopulationsTable } from './PopulationsTable'

const POPULATION_NAMES = {
  AFR: 'African',
  AMR: 'Latino',
  ASJ: 'Ashkenazi Jewish',
  EAS: 'East Asian',
  FIN: 'European (Finnish)',
  NFE: 'European (non-Finnish)',
  OTH: 'Other',
  SAS: 'South Asian',

  FEMALE: 'Female',
  MALE: 'Male',

  // EAS subpopulations
  JPN: 'Japanese',
  KOR: 'Korean',
  OEA: 'Other East Asian',

  // NFE subpopulations
  BGR: 'Bulgarian',
  EST: 'Estonian',
  NWE: 'North-western European',
  ONF: 'Other non-Finnish European',
  SEU: 'Southern European',
  SWE: 'Swedish',
}

const ControlSection = styled.div`
  margin-top: 1em;

  label {
    margin-left: 1em;
  }
`

const combinePopulations = populations => {
  const combined = Object.values(
    populations.reduce((acc, pop) => {
      if (!acc[pop.id]) {
        acc[pop.id] = {
          id: pop.id,
          name: POPULATION_NAMES[pop.id],
          ac: 0,
          an: 0,
          ac_hemi: 0,
          ac_hom: 0,
          subpopulations: [],
        }
      }
      acc[pop.id].ac += pop.ac
      acc[pop.id].an += pop.an
      acc[pop.id].ac_hemi += pop.ac_hemi
      acc[pop.id].ac_hom += pop.ac_hom

      if (pop.subpopulations) {
        acc[pop.id].subpopulations = combinePopulations(
          acc[pop.id].subpopulations.concat(pop.subpopulations)
        )
      }
      return acc
    }, {})
  )
  return combined
}

export class GnomadPopulationsTable extends Component {
  static propTypes = {
    exomePopulations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        ac_hemi: PropTypes.number.isRequired,
        ac_hom: PropTypes.number.isRequired,
        subpopulations: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            ac: PropTypes.number.isRequired,
            an: PropTypes.number.isRequired,
          })
        ),
      })
    ).isRequired,
    genomePopulations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        ac_hemi: PropTypes.number.isRequired,
        ac_hom: PropTypes.number.isRequired,
        subpopulations: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            ac: PropTypes.number.isRequired,
            an: PropTypes.number.isRequired,
          })
        ),
      })
    ).isRequired,
    showHemizygotes: PropTypes.bool,
    showHomozygotes: PropTypes.bool,
  }

  static defaultProps = {
    showHemizygotes: true,
    showHomozygotes: true,
  }

  constructor(props) {
    super(props)

    this.state = {
      includeExomes: props.exomePopulations.length !== 0,
      includeGenomes: props.genomePopulations.length !== 0,
    }
  }

  render() {
    let includedPopulations = []
    if (this.state.includeExomes) {
      includedPopulations = includedPopulations.concat(this.props.exomePopulations)
    }
    if (this.state.includeGenomes) {
      includedPopulations = includedPopulations.concat(this.props.genomePopulations)
    }

    const combinedPopulations = combinePopulations(includedPopulations)

    return (
      <div>
        <PopulationsTable
          populations={combinedPopulations}
          showHemizygotes={this.props.showHemizygotes}
          showHomozygotes={this.props.showHomozygotes}
        />
        <ControlSection>
          Include:
          <Checkbox
            checked={this.state.includeExomes}
            disabled={
              this.props.exomePopulations.length === 0 ||
              (this.state.includeExomes && !this.state.includeGenomes)
            }
            id="includeExomePopulations"
            label="Exomes"
            onChange={includeExomes => {
              this.setState({ includeExomes })
            }}
          />
          <Checkbox
            checked={this.state.includeGenomes}
            disabled={
              this.props.genomePopulations.length === 0 ||
              (!this.state.includeExomes && this.state.includeGenomes)
            }
            id="includeGenomePopulations"
            label="Genomes"
            onChange={includeGenomes => {
              this.setState({ includeGenomes })
            }}
          />
        </ControlSection>
      </div>
    )
  }
}

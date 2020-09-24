import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

import { PopulationsTable } from './PopulationsTable'

const POPULATION_NAMES = {
  AFR: 'African',
  AMI: 'Amish',
  AMR: 'Latino',
  ASJ: 'Ashkenazi Jewish',
  EAS: 'East Asian',
  FIN: 'European (Finnish)',
  NFE: 'European (non-Finnish)',
  OTH: 'Other',
  SAS: 'South Asian',

  // EAS subpopulations
  EAS_JPN: 'Japanese',
  EAS_KOR: 'Korean',
  EAS_OEA: 'Other East Asian',

  // NFE subpopulations
  NFE_BGR: 'Bulgarian',
  NFE_EST: 'Estonian',
  NFE_NWE: 'North-western European',
  NFE_ONF: 'Other non-Finnish European',
  NFE_SEU: 'Southern European',
  NFE_SWE: 'Swedish',
}

const ControlSection = styled.div`
  margin-top: 1em;

  label {
    margin-left: 1em;
  }
`

/**
 * Merge frequency information for multiple populations with the same ID.
 * This is used to add exome and genome population frequencies.
 *
 * @param {Object[]} populations Array of populations.
 */
const mergePopulations = populations => {
  const indices = {}
  const merged = []

  for (let i = 0; i < populations.length; i += 1) {
    const pop = populations[i]

    const popIndex = indices[pop.id]
    if (popIndex === undefined) {
      merged.push({ ...pop })
      indices[pop.id] = merged.length - 1
    } else {
      merged[popIndex].ac += pop.ac
      merged[popIndex].an += pop.an
      if (pop.ac_hemi !== null) {
        merged[popIndex].ac_hemi += pop.ac_hemi
      }
      merged[popIndex].ac_hom += pop.ac_hom
    }
  }

  return merged
}

const addPopulationNames = populations => {
  return populations.map(pop => {
    let name
    if (pop.id.includes('FEMALE')) {
      name = 'Female'
    } else if (pop.id.includes('MALE')) {
      name = 'Male'
    } else {
      name = POPULATION_NAMES[pop.id]
    }
    return { ...pop, name }
  })
}

const nestPopulations = populations => {
  const popIndices = []
  const subpopulations = {}

  for (let i = 0; i < populations.length; i += 1) {
    const pop = populations[i]

    // IDs are one of:
    // * pop
    // * pop_subpop
    // * pop_sex
    // * sex
    const divisions = pop.id.split('_')
    if (divisions.length === 1) {
      popIndices.push(i)
    } else {
      const parentPop = divisions[0]
      if (subpopulations[parentPop] === undefined) {
        subpopulations[parentPop] = [{ ...pop }]
      } else {
        subpopulations[parentPop].push({ ...pop })
      }
    }
  }

  return popIndices.map(index => {
    const pop = populations[index]
    return {
      ...pop,
      subpopulations: subpopulations[pop.id],
    }
  })
}

export class GnomadPopulationsTable extends Component {
  static propTypes = {
    exomePopulations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        ac_hemi: PropTypes.number,
        ac_hom: PropTypes.number.isRequired,
      })
    ).isRequired,
    genomePopulations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        ac_hemi: PropTypes.number,
        ac_hom: PropTypes.number.isRequired,
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
    const { exomePopulations, genomePopulations, showHemizygotes, showHomozygotes } = this.props
    const { includeExomes, includeGenomes } = this.state

    let includedPopulations = []
    if (includeExomes) {
      includedPopulations = includedPopulations.concat(exomePopulations)
    }
    if (includeGenomes) {
      includedPopulations = includedPopulations.concat(genomePopulations)
    }

    const populations = nestPopulations(addPopulationNames(mergePopulations(includedPopulations)))

    return (
      <div>
        <PopulationsTable
          populations={populations}
          showHemizygotes={showHemizygotes}
          showHomozygotes={showHomozygotes}
        />
        {showHemizygotes && <p>Hemizygote counts are not available for subpopulations.</p>}
        <ControlSection>
          Include:
          <Checkbox
            checked={includeExomes}
            disabled={exomePopulations.length === 0 || (includeExomes && !includeGenomes)}
            id="includeExomePopulations"
            label="Exomes"
            onChange={value => {
              this.setState({ includeExomes: value })
            }}
          />
          <Checkbox
            checked={includeGenomes}
            disabled={genomePopulations.length === 0 || (!includeExomes && includeGenomes)}
            id="includeGenomePopulations"
            label="Genomes"
            onChange={value => {
              this.setState({ includeGenomes: value })
            }}
          />
        </ControlSection>
      </div>
    )
  }
}

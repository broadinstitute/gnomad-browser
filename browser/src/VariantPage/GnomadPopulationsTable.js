import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '../dataset-constants/gnomadPopulations'
import { PopulationsTable } from './PopulationsTable'

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
    // TODO: the data pipeline now stores population IDs with XX and XY instead of FEMALE and MALE
    // Checks for FEMALE and MALE can be removed after reloading variants
    if (
      pop.id === 'XX' ||
      pop.id.endsWith('_XX') ||
      pop.id === 'FEMALE' ||
      pop.id.endsWith('_FEMALE')
    ) {
      name = 'XX'
    } else if (
      pop.id === 'XY' ||
      pop.id.endsWith('_XY') ||
      pop.id === 'MALE' ||
      pop.id.endsWith('_MALE')
    ) {
      name = 'XY'
    } else {
      name = GNOMAD_POPULATION_NAMES[pop.id.toLowerCase()] || pop.id
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

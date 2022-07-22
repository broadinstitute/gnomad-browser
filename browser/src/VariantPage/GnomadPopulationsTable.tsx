import React, { Component } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

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
const mergePopulations = (populations: any) => {
  const indices = {}
  const merged = []

  for (let i = 0; i < populations.length; i += 1) {
    const pop = populations[i]

    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const popIndex = indices[pop.id]
    if (popIndex === undefined) {
      merged.push({ ...pop })
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

const addPopulationNames = (populations: any) => {
  return populations.map((pop: any) => {
    let name
    if (pop.id === 'XX' || pop.id.endsWith('_XX')) {
      name = 'XX'
    } else if (pop.id === 'XY' || pop.id.endsWith('_XY')) {
      name = 'XY'
    } else {
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      name = GNOMAD_POPULATION_NAMES[pop.id.toLowerCase()] || pop.id
    }
    return { ...pop, name }
  })
}

const nestPopulations = (populations: any) => {
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
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if (subpopulations[parentPop] === undefined) {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        subpopulations[parentPop] = [{ ...pop }]
      } else {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        subpopulations[parentPop].push({ ...pop })
      }
    }
  }

  return popIndices.map((index) => {
    const pop = populations[index]
    return {
      ...pop,
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      subpopulations: subpopulations[pop.id],
    }
  })
}

type OwnGnomadPopulationsTableProps = {
  datasetId: string
  exomePopulations: {
    id: string
    ac: number
    an: number
    ac_hemi?: number
    ac_hom: number
  }[]
  genomePopulations: {
    id: string
    ac: number
    an: number
    ac_hemi?: number
    ac_hom: number
  }[]
  showHemizygotes?: boolean
  showHomozygotes?: boolean
}

type GnomadPopulationsTableState = any

type GnomadPopulationsTableProps = OwnGnomadPopulationsTableProps &
  typeof GnomadPopulationsTable.defaultProps

export class GnomadPopulationsTable extends Component<
  GnomadPopulationsTableProps,
  GnomadPopulationsTableState
> {
  static defaultProps = {
    showHemizygotes: true,
    showHomozygotes: true,
  }

  constructor(props: GnomadPopulationsTableProps) {
    super(props)

    this.state = {
      includeExomes: props.exomePopulations.length !== 0,
      includeGenomes: props.genomePopulations.length !== 0,
    }
  }

  render() {
    const {
      datasetId,
      exomePopulations,
      genomePopulations,
      showHemizygotes,
      showHomozygotes,
    } = this.props
    const { includeExomes, includeGenomes } = this.state

    let includedPopulations: any = []
    if (includeExomes) {
      includedPopulations = includedPopulations.concat(exomePopulations)
    }
    if (includeGenomes) {
      includedPopulations = includedPopulations.concat(genomePopulations)
    }

    let populations = nestPopulations(addPopulationNames(mergePopulations(includedPopulations)))
    if (datasetId.startsWith('gnomad_r2_1') && includeGenomes) {
      populations = populations.map((pop) => {
        if (pop.id === 'eas') {
          // If the variant is only present in genomes, sub-continental populations won't be present at all.
          if (pop.subpopulations.length === 2) {
            ;['jpn', 'kor', 'oea'].forEach((subPopId) => {
              pop.subpopulations.push({
                id: `eas_${subPopId}`,
                // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                name: GNOMAD_POPULATION_NAMES[`eas_${subPopId}`],
                ac: 0,
                an: 0,
                ac_hemi: 0,
                ac_hom: 0,
              })
            })
          }

          pop.subpopulations.forEach((subPop: any) => {
            if (!(subPop.id.endsWith('XX') || subPop.id.endsWith('XY'))) {
              subPop.name += ' *' // eslint-disable-line no-param-reassign
            }
          })
        }
        return pop
      })
    }

    return (
      <>
        <PopulationsTable
          populations={populations}
          showHemizygotes={showHemizygotes}
          showHomozygotes={showHomozygotes}
        />
        {datasetId.startsWith('gnomad_r2_1') && includeGenomes && (
          <p>
            * Allele frequencies for some sub-continental populations were not computed for genome
            samples.
          </p>
        )}
        {showHemizygotes && <p>Hemizygote counts are not available for subpopulations.</p>}
        <ControlSection>
          Include:
          <Checkbox
            checked={includeExomes}
            disabled={exomePopulations.length === 0 || (includeExomes && !includeGenomes)}
            id="includeExomePopulations"
            label="Exomes"
            onChange={(value) => {
              this.setState({ includeExomes: value })
            }}
          />
          <Checkbox
            checked={includeGenomes}
            disabled={genomePopulations.length === 0 || (!includeExomes && includeGenomes)}
            id="includeGenomePopulations"
            label="Genomes"
            onChange={(value) => {
              this.setState({ includeGenomes: value })
            }}
          />
        </ControlSection>
      </>
    )
  }
}

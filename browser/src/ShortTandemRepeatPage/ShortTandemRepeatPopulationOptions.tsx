import React, { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'

import { PopulationId, GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import { Sex } from './ShortTandemRepeatAlleleSizeDistributionPlot'

const Wrapper = styled.div`
  @media (max-width: 600px) {
    display: flex;
    flex-direction: column;
    align-items: center;

    label:first-child {
      margin-bottom: 1em;
    }
  }
`

const Label = styled.label`
  padding-right: 1em;
`

type Props = {
  id: string
  populations: PopulationId[]
  selectedPopulation: PopulationId | ''
  selectedSex: Sex | ''
  setSelectedPopulation: Dispatch<SetStateAction<PopulationId | ''>>
  setSelectedSex: Dispatch<SetStateAction<Sex | ''>>
}

const ShortTandemRepeatPopulationOptions = ({
  id,
  populations,
  selectedPopulation,
  selectedSex,
  setSelectedPopulation,
  setSelectedSex,
}: Props) => {
  const populationsSortedByName = populations.sort((group1, group2) =>
    GNOMAD_POPULATION_NAMES[group1].localeCompare(GNOMAD_POPULATION_NAMES[group2])
  )

  return (
    <Wrapper>
      <Label htmlFor={`short-tandem-repeat-${id}-population-options-population`}>
        Population: &nbsp;
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <Select
          id={`short-tandem-repeat-${id}-population-options-population`}
          value={selectedPopulation}
          onChange={(e: { target: { value: PopulationId | '' } }) =>
            setSelectedPopulation(e.target.value)
          }
        >
          <option value="">Global</option>
          {populationsSortedByName.map((population) => (
            <option key={population} value={population}>
              {GNOMAD_POPULATION_NAMES[population]}
            </option>
          ))}
        </Select>
      </Label>

      <Label htmlFor={`short-tandem-repeat-${id}-population-options-sex`}>
        Sex: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <Select
          id={`short-tandem-repeat-${id}-population-options-sex`}
          value={selectedSex}
          onChange={(e: { target: { value: Sex | '' } }) => setSelectedSex(e.target.value)}
        >
          <option value="">All</option>
          <option value="XX">XX</option>
          <option value="XY">XY</option>
        </Select>
      </Label>
    </Wrapper>
  )
}

export default ShortTandemRepeatPopulationOptions

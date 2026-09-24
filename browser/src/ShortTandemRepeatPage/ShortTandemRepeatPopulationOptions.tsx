import React, { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'

import { PopulationId, GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import { Sex } from './ShortTandemRepeatPage'

const Wrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  max-width: 100%;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 0.75em;
  }
`

const Label = styled.label`
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  padding-right: 1em;
  white-space: nowrap;

  select {
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
  }

  @media (max-width: 600px) {
    justify-content: space-between;
    width: 100%;
    padding-right: 0;
    gap: 0.5em;
    white-space: normal;

    select {
      flex: 0 1 auto;
    }
  }
`

type Props = {
  id: string
  populations: PopulationId[]
  selectedPopulation: PopulationId | null
  selectedSex: Sex | null
  setSelectedPopulation: Dispatch<SetStateAction<PopulationId | null>>
  setSelectedSex: Dispatch<SetStateAction<Sex | null>>
  ancestryGroupName?: (id: PopulationId) => string
  sexLabels?: Record<Sex, string>
  sourceMetadata?: boolean
}

const ShortTandemRepeatPopulationOptions = ({
  id,
  populations,
  selectedPopulation,
  selectedSex,
  setSelectedPopulation,
  setSelectedSex,
  ancestryGroupName = (group) => GNOMAD_POPULATION_NAMES[group],
  sexLabels = { XX: 'XX', XY: 'XY', unknown: 'Unknown' },
  sourceMetadata = false,
}: Props) => {
  const populationsSortedByName = [...populations].sort((group1, group2) =>
    ancestryGroupName(group1).localeCompare(ancestryGroupName(group2))
  )

  return (
    <Wrapper>
      <Label htmlFor={`short-tandem-repeat-${id}-population-options-population`}>
        {sourceMetadata ? 'Population (source metadata)' : 'Genetic ancestry group'}: &nbsp;
        <Select
          id={`short-tandem-repeat-${id}-population-options-population`}
          value={selectedPopulation || ''}
          onChange={(e: { target: { value: PopulationId | '' } }) =>
            setSelectedPopulation(e.target.value === '' ? null : e.target.value)
          }
        >
          <option value="">{sourceMetadata ? 'All source observations' : 'Global'}</option>
          {populationsSortedByName.map((population) => (
            <option key={population} value={population}>
              {ancestryGroupName(population)}
            </option>
          ))}
        </Select>
      </Label>

      <Label htmlFor={`short-tandem-repeat-${id}-population-options-sex`}>
        {sourceMetadata ? 'Sex (source metadata)' : 'Sex'}: &nbsp;
        <Select
          id={`short-tandem-repeat-${id}-population-options-sex`}
          value={selectedSex || ''}
          onChange={(e: { target: { value: Sex | '' } }) =>
            setSelectedSex(e.target.value === '' ? null : e.target.value)
          }
        >
          <option value="">All</option>
          <option value="XX">{sexLabels.XX}</option>
          <option value="XY">{sexLabels.XY}</option>
          <option value="unknown">{sexLabels.unknown}</option>
        </Select>
      </Label>
    </Wrapper>
  )
}

export default ShortTandemRepeatPopulationOptions

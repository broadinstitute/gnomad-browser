import React from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

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

type Props = {
  id: string
  populationIds: string[]
  selectedPopulationId: string
  onSelectPopulationId: (...args: any[]) => any
}

const ShortTandemRepeatPopulationOptions = ({
  id,
  populationIds,
  selectedPopulationId,
  onSelectPopulationId,
}: Props) => {
  const selectedAncestralPopulation =
    selectedPopulationId === 'XX' || selectedPopulationId === 'XY'
      ? ''
      : selectedPopulationId.split('_')[0]

  let selectedSex = ''
  if (selectedPopulationId.endsWith('XX')) {
    selectedSex = 'XX'
  } else if (selectedPopulationId.endsWith('XY')) {
    selectedSex = 'XY'
  }

  return (
    <Wrapper>
      <label htmlFor={`short-tandem-repeat-${id}-population-options-population`}>
        Population: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <Select
          id={`short-tandem-repeat-${id}-population-options-population`}
          value={selectedAncestralPopulation}
          onChange={(e: any) => {
            onSelectPopulationId([e.target.value, selectedSex].filter(Boolean).join('_'))
          }}
        >
          <option value="">Global</option>
          {populationIds
            .filter((popId) => !(popId.endsWith('XX') || popId.endsWith('XY')))
            .sort((pop1, pop2) =>
              // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
              GNOMAD_POPULATION_NAMES[pop1].localeCompare(GNOMAD_POPULATION_NAMES[pop2])
            )
            .map((popId) => (
              <option key={popId} value={popId}>
                {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
                {GNOMAD_POPULATION_NAMES[popId]}
              </option>
            ))}
        </Select>
      </label>{' '}
      <label htmlFor={`short-tandem-repeat-${id}-population-options-sex`}>
        Sex: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <Select
          id={`short-tandem-repeat-${id}-population-options-sex`}
          value={selectedSex}
          onChange={(e: any) => {
            onSelectPopulationId(
              [selectedAncestralPopulation, e.target.value].filter(Boolean).join('_')
            )
          }}
        >
          <option value="">All</option>
          <option value="XX">XX</option>
          <option value="XY">XY</option>
        </Select>
      </label>
    </Wrapper>
  )
}

export default ShortTandemRepeatPopulationOptions

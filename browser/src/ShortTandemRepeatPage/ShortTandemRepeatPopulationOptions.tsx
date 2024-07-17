import React, { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'

import {
  AncestryGroupId,
  GNOMAD_ANCESTRY_GROUP_NAMES,
} from '@gnomad/dataset-metadata/gnomadPopulations'

import { Sex } from './ShortTandemRepeatPage'

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
  ancestryGroups: AncestryGroupId[]
  selectedAncestryGroup: AncestryGroupId
  selectedSex: string
  setSelectedAncestryGroup: Dispatch<SetStateAction<AncestryGroupId>>
  setSelectedSex: Dispatch<SetStateAction<Sex>>
}

const ShortTandemRepeatPopulationOptions = ({
  id,
  ancestryGroups,
  selectedAncestryGroup,
  selectedSex,
  setSelectedAncestryGroup,
  setSelectedSex,
}: Props) => {
  const ancestryGroupsSortedByName = ancestryGroups.sort((group1, group2) =>
    GNOMAD_ANCESTRY_GROUP_NAMES[group1].localeCompare(GNOMAD_ANCESTRY_GROUP_NAMES[group2])
  )

  return (
    <Wrapper>
      <label htmlFor={`short-tandem-repeat-${id}-population-options-population`}>
        Genetic ancestry group:{' '}
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <Select
          id={`short-tandem-repeat-${id}-population-options-population`}
          value={selectedAncestryGroup}
          onChange={setSelectedAncestryGroup}
        >
          <option value="">Global</option>
          {ancestryGroupsSortedByName.map((ancestryGroup) => (
            <option key={ancestryGroup} value={ancestryGroup}>
              {GNOMAD_ANCESTRY_GROUP_NAMES[ancestryGroup]}
            </option>
          ))}
        </Select>
      </label>

      <label htmlFor={`short-tandem-repeat-${id}-population-options-sex`}>
        Sex: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <Select
          id={`short-tandem-repeat-${id}-population-options-sex`}
          value={selectedSex}
          onChange={setSelectedSex}
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

import React from 'react'
import styled from 'styled-components'

import { Badge, Checkbox, SearchInput } from '@gnomad/ui'

import CategoryFilterControl from '../CategoryFilterControl'
import useSearchHotkeys from '../useSearchHotkeys'

import { cnvTypes, cnvTypeColors } from './copyNumberVariantTypes'

const CategoryFilterLabel = styled.span`
  margin-bottom: 0.5em;
  font-weight: bold;
`

const CategoryFiltersWrapper = styled.div`
  display: flex;
  flex-direction: column;

  @media (max-width: 700px) {
    align-items: center;
  }
`

const CheckboxWrapper = styled.div`
  /* stylelint-ignore-line block-no-empty */
`

const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
`

const SettingsWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: center;
  }
`

type Props = {
  onChange: (...args: any[]) => any
  colorKey: 'type'
  value: {
    includeTypes: {
      [key: string]: boolean
    }
    includeFilteredVariants: boolean
    searchText: string
  }
}

const CopyNumberVariantFilterControls = ({ onChange, colorKey, value }: Props) => {
  const { searchInputRef, searchHotkeys } = useSearchHotkeys()

  return (
    <SettingsWrapper>
      <CategoryFiltersWrapper>
        <CategoryFilterLabel>Classes</CategoryFilterLabel>
        <CategoryFilterControl
          categories={cnvTypes.map((type) => ({
            id: type,
            label: type,
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            color: colorKey === 'type' ? cnvTypeColors[type] : 'gray',
          }))}
          categorySelections={value.includeTypes}
          id="sv-type-category-filter"
          onChange={(includeTypes: any) => {
            onChange({ ...value, includeTypes })
          }}
        />
      </CategoryFiltersWrapper>

      <CheckboxWrapper>
        <span>
          <Checkbox
            checked={value.includeFilteredVariants}
            id="sv-qc-filter"
            label="Include filtered variants"
            onChange={(includeFilteredVariants) => {
              onChange({ ...value, includeFilteredVariants })
            }}
          />
        </span>
      </CheckboxWrapper>

      <SearchWrapper>
        <SearchInput
          // @ts-expect-error TS(2322) FIXME: Type '{ ref: MutableRefObject<null>; placeholder: ... Remove this comment to see the full error message
          ref={searchInputRef}
          placeholder="Search variant table"
          onChange={(searchText) => {
            onChange({ ...value, searchText })
          }}
          value={value.searchText}
        />
        <Badge level="info" tooltip="Press / or Ctrl+F (⌘F on Mac) to search the variant table">
          /
        </Badge>
        {searchHotkeys}
      </SearchWrapper>
    </SettingsWrapper>
  )
}

export default CopyNumberVariantFilterControls

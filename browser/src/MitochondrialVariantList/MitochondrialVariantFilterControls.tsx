import React, { useRef } from 'react'
import styled from 'styled-components'

import { Checkbox, KeyboardShortcut, SearchInput } from '@gnomad/ui'

import CategoryFilterControl from '../CategoryFilterControl'
import { VEP_CONSEQUENCE_CATEGORIES, VEP_CONSEQUENCE_CATEGORY_LABELS } from '../vepConsequences'
import InfoButton from '../help/InfoButton'

const SearchWrapper = styled.div`
  /* stylelint-ignore-line block-no-empty */
`

const SettingsWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: flex-start;

    > * {
      margin-bottom: 1em;
    }
  }
`

const consequenceCategoryColors = {
  lof: '#FF583F',
  missense: '#F0C94D',
  synonymous: 'green',
  other: '#757575',
}

type Props = {
  onChange: (...args: any[]) => any
  value: {
    includeCategories: {
      lof: boolean
      missense: boolean
      synonymous: boolean
      other: boolean
    }
    includeFilteredVariants: boolean
    searchText: string
  }
}

const MitochondrialVariantFilterControls = ({ onChange, value }: Props) => {
  const searchInput = useRef(null)
  return (
    <SettingsWrapper>
      <div>
        <CategoryFilterControl
          categories={VEP_CONSEQUENCE_CATEGORIES.map((category) => ({
            id: category,
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            label: VEP_CONSEQUENCE_CATEGORY_LABELS[category],
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            color: consequenceCategoryColors[category],
          }))}
          categorySelections={value.includeCategories}
          id="variant-consequence-category-filter"
          onChange={(includeCategories: any) => {
            onChange({ ...value, includeCategories })
          }}
        />{' '}
        <InfoButton topic="consequence-category-filter" />
      </div>
      <div>
        <Checkbox
          checked={value.includeFilteredVariants}
          id="qc-variant-filter"
          label="Include filtered variants"
          onChange={(includeFilteredVariants) => {
            onChange({ ...value, includeFilteredVariants })
          }}
        />
        <InfoButton topic="include-filtered-mitochondrial-variants" />
      </div>
      <SearchWrapper>
        <SearchInput
          // @ts-expect-error TS(2322) FIXME: Type '{ ref: MutableRefObject<null>; placeholder: ... Remove this comment to see the full error message
          ref={searchInput}
          placeholder="Search variant table"
          style={{ marginBottom: '1em', width: '210px' }}
          value={value.searchText}
          onChange={(searchText) => {
            onChange({ ...value, searchText })
          }}
        />
        <KeyboardShortcut
          // @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type 'string[]'... Remove this comment to see the full error message
          keys="/"
          // @ts-expect-error TS(2322) FIXME: Type '(e: any) => void' is not assignable to type ... Remove this comment to see the full error message
          handler={(e: any) => {
            // preventDefault to avoid typing a "/" in the search input
            e.preventDefault()
            if (searchInput.current) {
              ;(searchInput.current as any).focus()
            }
          }}
        />
      </SearchWrapper>
    </SettingsWrapper>
  )
}

export default MitochondrialVariantFilterControls

import React, { useRef } from 'react'
import styled from 'styled-components'

import { Checkbox, KeyboardShortcut, SearchInput } from '@gnomad/ui'

import CategoryFilterControl from '../CategoryFilterControl'
import { VEP_CONSEQUENCE_CATEGORIES, VEP_CONSEQUENCE_CATEGORY_LABELS } from '../vepConsequences'
import InfoButton from '../help/InfoButton'

const consequenceCategoryColors = {
  lof: '#FF583F',
  missense: '#F0C94D',
  synonymous: 'green',
  other: '#757575',
}

const SettingsWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

const ConsequenceFiltersWrapper = styled.div`
  margin-bottom: 1em;
`

const CheckboxFiltersWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  margin-bottom: 1em;
`

const CheckboxSection = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-right: 2em;
`

const SearchWrapper = styled.div`
  width: 210px;
  margin-bottom: 1em;
`

const keyboardShortcuts = {
  lof: 'l',
  missense: 'm',
  synonymous: 's',
  other: 'o',
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
    includeExomes: boolean
    includeGenomes: boolean
    includeFilteredVariants: boolean
    includeSNVs: boolean
    includeIndels: boolean
    searchText: string
  }
}

const VariantFilterControls = ({ onChange, value }: Props) => {
  const searchInput = useRef(null)

  return (
    <SettingsWrapper>
      <ConsequenceFiltersWrapper>
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
        {Object.keys(keyboardShortcuts).map((category) => (
          <KeyboardShortcut
            key={category}
            handler={() => {
              onChange({
                ...value,
                includeCategories: {
                  ...value.includeCategories,
                  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                  [category]: !value.includeCategories[category],
                },
              })
            }}
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            keys={keyboardShortcuts[category]}
          />
        ))}
      </ConsequenceFiltersWrapper>

      <CheckboxFiltersWrapper>
        <CheckboxSection>
          <Checkbox
            checked={value.includeExomes}
            disabled={!value.includeGenomes}
            id="exome-variant-filter"
            label="Exomes"
            onChange={(includeExomes) => {
              onChange({ ...value, includeExomes })
            }}
          />
          <Checkbox
            checked={value.includeGenomes}
            disabled={!value.includeExomes}
            id="genome-variant-filter"
            label="Genomes"
            onChange={(includeGenomes) => {
              onChange({ ...value, includeGenomes })
            }}
          />
        </CheckboxSection>
        <CheckboxSection>
          <Checkbox
            checked={value.includeSNVs}
            disabled={!value.includeIndels}
            id="snv-variant-filter"
            label="SNVs"
            onChange={(includeSNVs) => {
              onChange({ ...value, includeSNVs })
            }}
          />
          <Checkbox
            checked={value.includeIndels}
            disabled={!value.includeSNVs}
            id="indel-variant-filter"
            label="Indels"
            onChange={(includeIndels) => {
              onChange({ ...value, includeIndels })
            }}
          />
        </CheckboxSection>
        <CheckboxSection>
          <span>
            <Checkbox
              checked={value.includeFilteredVariants}
              id="qc-variant-fil;ter"
              label="Filtered variants"
              onChange={(includeFilteredVariants) => {
                onChange({ ...value, includeFilteredVariants })
              }}
            />
            <InfoButton topic="include-filtered-variants" />
          </span>
        </CheckboxSection>
      </CheckboxFiltersWrapper>

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

export default VariantFilterControls

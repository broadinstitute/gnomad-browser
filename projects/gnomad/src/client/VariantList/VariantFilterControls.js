import PropTypes from 'prop-types'
import React, { useRef } from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { Checkbox, ConsequenceCategoriesControl, KeyboardShortcut, SearchInput } from '@broad/ui'

const SettingsWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: center;
  }
`

const ConsequenceFiltersWrapper = styled.div`
  margin-bottom: 1em;
`

const CheckboxFiltersWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 1em;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

const CheckboxSection = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-right: 2em;

  @media (max-width: 700px) {
    margin-right: 0;
  }
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

const VariantFilterControls = ({ onChange, value }) => {
  const searchInput = useRef(null)

  return (
    <SettingsWrapper>
      <ConsequenceFiltersWrapper>
        <ConsequenceCategoriesControl
          categorySelections={value.includeCategories}
          id="variant-filter"
          onChange={includeCategories => {
            onChange({ ...value, includeCategories })
          }}
        />
        {Object.keys(keyboardShortcuts).map(category => (
          <KeyboardShortcut
            key={category}
            handler={() => {
              onChange({
                ...value,
                includeCategories: {
                  ...value.includeCategories,
                  [category]: !value.includeCategories[category],
                },
              })
            }}
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
            onChange={includeExomes => {
              onChange({ ...value, includeExomes })
            }}
          />
          <Checkbox
            checked={value.includeGenomes}
            disabled={!value.includeExomes}
            id="genome-variant-filter"
            label="Genomes"
            onChange={includeGenomes => {
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
            onChange={includeSNVs => {
              onChange({ ...value, includeSNVs })
            }}
          />
          <Checkbox
            checked={value.includeIndels}
            disabled={!value.includeSNVs}
            id="indel-variant-filter"
            label="Indels"
            onChange={includeIndels => {
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
              onChange={includeFilteredVariants => {
                onChange({ ...value, includeFilteredVariants })
              }}
            />
            <QuestionMark topic="include-filtered-variants" />
          </span>
        </CheckboxSection>
      </CheckboxFiltersWrapper>

      <SearchWrapper>
        <SearchInput
          ref={searchInput}
          placeholder="Search variant table"
          style={{ marginBottom: '1em', width: '210px' }}
          value={value.searchText}
          onChange={searchText => {
            onChange({ ...value, searchText })
          }}
        />
        <KeyboardShortcut
          keys="/"
          handler={e => {
            // preventDefault to avoid typing a "/" in the search input
            e.preventDefault()
            if (searchInput.current) {
              searchInput.current.focus()
            }
          }}
        />
      </SearchWrapper>
    </SettingsWrapper>
  )
}

VariantFilterControls.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.shape({
    includeCategories: PropTypes.shape({
      lof: PropTypes.bool.isRequired,
      missense: PropTypes.bool.isRequired,
      synonymous: PropTypes.bool.isRequired,
      other: PropTypes.bool.isRequired,
    }).isRequired,
    includeFilteredVariants: PropTypes.bool.isRequired,
    includeSNVs: PropTypes.bool.isRequired,
    includeIndels: PropTypes.bool.isRequired,
    searchText: PropTypes.string.isRequired,
  }).isRequired,
}

export default VariantFilterControls

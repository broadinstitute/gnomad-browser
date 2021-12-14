import PropTypes from 'prop-types'
import React, { useRef } from 'react'
import styled from 'styled-components'

import { CategoryFilterControl, Checkbox, KeyboardShortcut, SearchInput } from '@gnomad/ui'

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

const MitochondrialVariantFilterControls = ({ onChange, value }) => {
  const searchInput = useRef(null)
  return (
    <SettingsWrapper>
      <div>
        <CategoryFilterControl
          categories={VEP_CONSEQUENCE_CATEGORIES.map(category => ({
            id: category,
            label: VEP_CONSEQUENCE_CATEGORY_LABELS[category],
            className: 'category',
            color: consequenceCategoryColors[category],
          }))}
          categorySelections={value.includeCategories}
          id="variant-consequence-category-filter"
          onChange={includeCategories => {
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
          onChange={includeFilteredVariants => {
            onChange({ ...value, includeFilteredVariants })
          }}
        />
        <InfoButton topic="include-filtered-mitochondrial-variants" />
      </div>
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

MitochondrialVariantFilterControls.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.shape({
    includeCategories: PropTypes.shape({
      lof: PropTypes.bool.isRequired,
      missense: PropTypes.bool.isRequired,
      synonymous: PropTypes.bool.isRequired,
      other: PropTypes.bool.isRequired,
    }).isRequired,
    includeFilteredVariants: PropTypes.bool.isRequired,
    searchText: PropTypes.string.isRequired,
  }).isRequired,
}

export default MitochondrialVariantFilterControls

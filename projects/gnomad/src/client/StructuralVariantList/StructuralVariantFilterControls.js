import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { Checkbox, CategoryFilterControl, SearchInput } from '@broad/ui'

import {
  svConsequenceCategoryColors,
  svConsequenceCategoryLabels,
} from './structuralVariantConsequences'
import { svTypes, svTypeColors } from './structuralVariantTypes'

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

  #sv-consequence-category-filter,
  #sv-type-category-filter {
    margin-bottom: 1em;

    @media (max-width: 1200px) {
      display: flex;
      flex-flow: row wrap;
      justify-content: space-around;

      .category {
        border-radius: 0.5em;
        margin: 0.25em;
      }
    }

    @media (max-width: 700px) {
      display: flex;
      flex-direction: column;
      align-items: center;

      .category {
        margin-bottom: 0.5em;
      }
    }
  }
`

const CheckboxWrapper = styled.div`
  /* stylelint-ignore-line block-no-empty */
`

const SearchWrapper = styled.div`
  /* stylelint-ignore-line block-no-empty */
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

const StructuralVariantFilterControls = ({ onChange, colorKey, value }) => (
  <SettingsWrapper>
    <CategoryFiltersWrapper>
      <CategoryFilterLabel>
        Consequences
        <QuestionMark topic="SV_docs/sv-effect-overview" />
      </CategoryFilterLabel>
      <CategoryFilterControl
        categories={['lof', 'dup_lof', 'copy_gain', 'other'].map(category => ({
          id: category,
          label: svConsequenceCategoryLabels[category],
          className: 'category',
          color: colorKey === 'consequence' ? svConsequenceCategoryColors[category] : 'gray',
        }))}
        categorySelections={value.includeConsequenceCategories}
        id="sv-consequence-category-filter"
        onChange={includeConsequenceCategories => {
          onChange({ ...value, includeConsequenceCategories })
        }}
      />
      <CategoryFilterLabel>
        Classes
        <QuestionMark topic="SV_docs/sv-class-overview" />
      </CategoryFilterLabel>
      <CategoryFilterControl
        categories={svTypes.map(type => ({
          id: type,
          label: type,
          className: 'category',
          color: colorKey === 'type' ? svTypeColors[type] : 'gray',
        }))}
        categorySelections={value.includeTypes}
        id="sv-type-category-filter"
        onChange={includeTypes => {
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
          onChange={includeFilteredVariants => {
            onChange({ ...value, includeFilteredVariants })
          }}
        />
      </span>
    </CheckboxWrapper>

    <SearchWrapper>
      <SearchInput
        placeholder="Search variant table"
        onChange={searchText => {
          onChange({ ...value, searchText })
        }}
        value={value.searchText}
      />
    </SearchWrapper>
  </SettingsWrapper>
)

StructuralVariantFilterControls.propTypes = {
  onChange: PropTypes.func.isRequired,
  colorKey: PropTypes.oneOf(['consequence', 'type']).isRequired,
  value: PropTypes.shape({
    includeConsequenceCategories: PropTypes.objectOf(PropTypes.bool).isRequired,
    includeTypes: PropTypes.objectOf(PropTypes.bool).isRequired,
    includeFilteredVariants: PropTypes.bool.isRequired,
    searchText: PropTypes.string.isRequired,
  }).isRequired,
}

export default StructuralVariantFilterControls

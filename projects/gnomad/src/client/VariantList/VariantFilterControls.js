import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { Checkbox, ConsequenceCategoriesControl, SearchInput } from '@broad/ui'

const SettingsWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1em;

  @media (max-width: 1300px) and (min-width: 1101px) {
    > div {
      &:nth-child(2) {
        order: 3;
        width: 50%;
        margin-top: 1em;
      }
    }
  }

  @media (max-width: 1100px) {
    flex-direction: column;
    align-items: center;

    > div {
      margin-bottom: 1.5em;
    }
  }
`
const CheckboxWrapper = styled.span`
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 700px) {
    margin: 0.5em;
  }
`

const VariantFilterControls = ({ onChange, value }) => (
  <SettingsWrapper>
    <div>
      <ConsequenceCategoriesControl
        categorySelections={value.includeCategories}
        id="variant-filter"
        onChange={includeCategories => {
          onChange({ ...value, includeCategories })
        }}
      />
    </div>

    <CheckboxWrapper>
      <span>
        <Checkbox
          checked={value.includeFilteredVariants}
          id="qcFilter2"
          label="Include filtered variants"
          onChange={includeFilteredVariants => {
            onChange({ ...value, includeFilteredVariants })
          }}
        />
        <QuestionMark topic="include-filtered-variants" display="inline" />
      </span>
      <Checkbox
        checked={value.includeSNPs}
        id="snpfilter"
        label="SNPs"
        onChange={includeSNPs => {
          onChange({ ...value, includeSNPs })
        }}
      />
      <Checkbox
        checked={value.includeIndels}
        id="indelfilter"
        label="Indels"
        onChange={includeIndels => {
          onChange({ ...value, includeIndels })
        }}
      />
    </CheckboxWrapper>

    <div>
      <SearchInput
        placeholder="Search variant table"
        onChange={searchText => {
          onChange({ ...value, searchText })
        }}
        withKeyboardShortcuts
        value={value.searchText}
      />
    </div>
  </SettingsWrapper>
)

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
    includeSNPs: PropTypes.bool.isRequired,
    includeIndels: PropTypes.bool.isRequired,
    searchText: PropTypes.string.isRequired,
  }).isRequired,
}

export default VariantFilterControls

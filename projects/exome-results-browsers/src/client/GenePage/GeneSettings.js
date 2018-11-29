import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import {
  actions as variantActions,
  variantDeNovoFilter,
  variantInAnalysisFilter,
  variantFilter,
} from '@broad/redux-variants'
import { Checkbox, ConsequenceCategoriesControl, Search } from '@broad/ui'

const SettingsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;

  @media (max-width: 1100px) {
    flex-direction: column;
  }
`

const FiltersWrapper = styled.div`
  display: flex;
  flex-grow: 2;
  flex-direction: row;
  justify-content: space-between;

  @media (max-width: 1350px) {
    flex-direction: column;
  }
`

const OtherFiltersWrapper = styled.div`
  display: flex;
  flex-direction: column;

  label {
    margin-bottom: 0.375em;
  }

  @media (max-width: 1350px) {
    flex-direction: row;
    margin-top: 1em;

    label {
      margin-right: 2em;
    }
  }

  @media (max-width: 700px) {
    flex-direction: column;
  }
`

const SearchWrapper = styled.div`
  display: flex;
  flex-grow: 1;
  justify-content: flex-end;

  @media (max-width: 1100px) {
    margin-top: 0.525em;
  }
`

const GeneSettings = ({
  consequenceFilter,
  deNovoFilter,
  inAnalysisFilter,
  searchVariants,
  setConsequenceFilter,
  toggleDeNovoFilter,
  toggleInAnalysisFilter,
}) => (
  <SettingsWrapper>
    <FiltersWrapper>
      <ConsequenceCategoriesControl
        categorySelections={consequenceFilter}
        id="variant-filter"
        onChange={setConsequenceFilter}
      />

      <OtherFiltersWrapper>
        <Checkbox
          checked={deNovoFilter}
          id="denovo-filter"
          label="Show only de novo variants"
          onChange={toggleDeNovoFilter}
        />
        <Checkbox
          checked={inAnalysisFilter}
          id="in-analysis-filter"
          label="Show only variants in analysis"
          onChange={toggleInAnalysisFilter}
        />
      </OtherFiltersWrapper>
    </FiltersWrapper>

    <SearchWrapper>
      <Search placeholder="Search variant table" onChange={searchVariants} withKeyboardShortcuts />
    </SearchWrapper>
  </SettingsWrapper>
)

GeneSettings.propTypes = {
  consequenceFilter: PropTypes.shape({
    lof: PropTypes.bool.isRequired,
    missense: PropTypes.bool.isRequired,
    synonymous: PropTypes.bool.isRequired,
    other: PropTypes.bool.isRequired,
  }).isRequired,
  deNovoFilter: PropTypes.bool.isRequired,
  inAnalysisFilter: PropTypes.bool.isRequired,
  searchVariants: PropTypes.func.isRequired,
  setConsequenceFilter: PropTypes.func.isRequired,
  toggleDeNovoFilter: PropTypes.func.isRequired,
  toggleInAnalysisFilter: PropTypes.func.isRequired,
}

const mapStateToProps = state => ({
  consequenceFilter: variantFilter(state),
  deNovoFilter: variantDeNovoFilter(state),
  inAnalysisFilter: variantInAnalysisFilter(state),
  variantDeNovoFilter: variantDeNovoFilter(state),
})

const mapDispatchToProps = dispatch => ({
  searchVariants: searchText => dispatch(variantActions.searchVariants(searchText)),
  setConsequenceFilter: filter => dispatch(variantActions.setVariantFilter(filter)),
  toggleDeNovoFilter: () => dispatch(variantActions.toggleVariantDeNovoFilter()),
  toggleInAnalysisFilter: () => dispatch(variantActions.toggleVariantInAnalysisFilter()),
  toggleVariantDeNovoFilter: () => dispatch(variantActions.toggleVariantDeNovoFilter()),
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSettings)

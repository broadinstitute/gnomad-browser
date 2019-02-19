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
import { Checkbox, Combobox, ConsequenceCategoriesControl, SearchInput } from '@broad/ui'

import browserConfig from '@browser/config'

import ExportVariantsButton from './ExportVariantsButton'

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

  @media (max-width: 700px) {
    align-items: center;
  }
`

const AnalysisGroupMenuWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 1em;

  @media (max-width: 700px) {
    flex-direction: column;
  }

  @media (min-width: 701px) {
    label {
      margin-right: 0.5em;
    }
  }
`

const FiltersFirstColumn = styled.div`
  display: flex;
  flex-direction: column;

  @media (max-width: 700px) {
    align-items: center;
  }
`

const FiltersSecondColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;

  label {
    margin-bottom: 0.375em;
  }

  @media (max-width: 1350px) {
    flex-direction: row;
    justify-content: flex-start;
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
  geneId,
  inAnalysisFilter,
  onChangeAnalysisGroup,
  searchVariants,
  selectedAnalysisGroup,
  setConsequenceFilter,
  toggleDeNovoFilter,
  toggleInAnalysisFilter,
}) => (
  <SettingsWrapper>
    <FiltersWrapper>
      <FiltersFirstColumn>
        <ConsequenceCategoriesControl
          categorySelections={consequenceFilter}
          id="variant-filter"
          onChange={setConsequenceFilter}
        />

        {browserConfig.analysisGroups.selectableGroups.length > 1 && (
          <AnalysisGroupMenuWrapper>
            {/* eslint-disable-next-line jsx-a11y/label-has-for,jsx-a11y/label-has-associated-control */}
            <label htmlFor="analysis-group">Current analysis group </label>
            <Combobox
              id="analysis-group"
              options={browserConfig.analysisGroups.selectableGroups.map(group => ({
                id: group,
                label: group,
              }))}
              onSelect={option => onChangeAnalysisGroup(option.id)}
              value={selectedAnalysisGroup}
            />
            <ExportVariantsButton exportFileName={`${selectedAnalysisGroup}_${geneId}_variants`} />
          </AnalysisGroupMenuWrapper>
        )}
      </FiltersFirstColumn>

      <FiltersSecondColumn>
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
      </FiltersSecondColumn>
    </FiltersWrapper>

    <SearchWrapper>
      <SearchInput
        placeholder="Search variant table"
        onChange={searchVariants}
        withKeyboardShortcuts
      />
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
  geneId: PropTypes.string.isRequired,
  inAnalysisFilter: PropTypes.bool.isRequired,
  onChangeAnalysisGroup: PropTypes.func.isRequired,
  searchVariants: PropTypes.func.isRequired,
  selectedAnalysisGroup: PropTypes.string.isRequired,
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

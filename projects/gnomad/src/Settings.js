import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'

import { QuestionMark } from '@broad/help'
import {
  actions as variantActions,
  selectedVariantDataset,
  variantFilter,
  variantQcFilter,
} from '@broad/redux-variants'
import {
  ClassicExacButton,
  ClassicExacButtonFirst,
  ClassicExacButtonLast,
  ClassicExacButtonGroup,
  SettingsContainer,
  MenusContainer,
  SearchContainer,
  DataSelectionGroup,
  DataSelectionContainer,
  Search,
} from '@broad/ui'

const GeneSettings = ({
  selectedVariantDataset,
  searchVariants,
  setVariantFilter,
  variantFilter,
  setSelectedVariantDataset,
  toggleVariantQcFilter,
  variantQcFilter,
}) => (
  <SettingsContainer>
    <MenusContainer>
      <DataSelectionGroup>
        <ClassicExacButtonGroup>
          <ClassicExacButtonFirst
            isActive={
              variantFilter.lof &&
              variantFilter.missense &&
              variantFilter.synonymous &&
              variantFilter.other
            }
            onClick={() =>
              setVariantFilter({
                lof: true,
                missense: true,
                synonymous: true,
                other: true,
              })
            }
          >
            All
          </ClassicExacButtonFirst>
          <ClassicExacButton
            isActive={
              variantFilter.lof &&
              variantFilter.missense &&
              !variantFilter.synonymous &&
              !variantFilter.other
            }
            onClick={() =>
              setVariantFilter({
                lof: true,
                missense: true,
                synonymous: false,
                other: false,
              })
            }
          >
            Missense + LoF
          </ClassicExacButton>
          <ClassicExacButtonLast
            isActive={
              variantFilter.lof &&
              !variantFilter.missense &&
              !variantFilter.synonymous &&
              !variantFilter.other
            }
            onClick={() =>
              setVariantFilter({
                lof: true,
                missense: false,
                synonymous: false,
                other: false,
              })
            }
          >
            LoF
          </ClassicExacButtonLast>
        </ClassicExacButtonGroup>

        <DataSelectionContainer>
          <select
            onChange={event => setSelectedVariantDataset(event.target.value)}
            value={selectedVariantDataset}
          >
            <option value="gnomadExomeVariants">gnomAD exomes</option>
            <option value="gnomadGenomeVariants">gnomAD genomes</option>
            <option value="gnomadCombinedVariants">gnomAD</option>
            <option value="exacVariants">ExAC</option>
          </select>
          <QuestionMark topic={'dataset-selection'} display={'inline'} />
        </DataSelectionContainer>
      </DataSelectionGroup>
      <DataSelectionGroup>
        <span>
          <label htmlFor="qcFilter">
            <input
              id="qcFilter"
              type="checkbox"
              checked={!variantQcFilter}
              style={{ marginRight: '5px' }}
              onChange={toggleVariantQcFilter}
            />
            Include filtered variants
          </label>
          <QuestionMark topic={'include-filtered-variants'} display={'inline'} />
        </span>

        <SearchContainer>
          <Search
            placeholder={'Search variant table'}
            onChange={searchVariants}
            withKeyboardShortcuts
          />
        </SearchContainer>
      </DataSelectionGroup>
    </MenusContainer>
  </SettingsContainer>
)

GeneSettings.propTypes = {
  searchVariants: PropTypes.func.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  setSelectedVariantDataset: PropTypes.func.isRequired,
  setVariantFilter: PropTypes.func.isRequired,
  toggleVariantQcFilter: PropTypes.func.isRequired,
  variantFilter: PropTypes.shape({
    lof: PropTypes.bool.isRequired,
    missense: PropTypes.bool.isRequired,
    synonymous: PropTypes.bool.isRequired,
    other: PropTypes.bool.isRequired,
  }).isRequired,
  variantQcFilter: PropTypes.bool.isRequired,
}

const mapStateToProps = state => ({
  selectedVariantDataset: selectedVariantDataset(state),
  variantQcFilter: variantQcFilter(state),
  variantFilter: variantFilter(state),
})

const mapDispatchToProps = dispatch => ({
  setVariantFilter: filter => dispatch(variantActions.setVariantFilter(filter)),
  searchVariants: searchText => dispatch(variantActions.searchVariants(searchText)),
  setSelectedVariantDataset: dataset => dispatch(variantActions.setSelectedVariantDataset(dataset)),
  toggleVariantQcFilter: () => dispatch(variantActions.toggleVariantQcFilter()),
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSettings)

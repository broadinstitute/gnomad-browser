import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { currentGene, geneData, exonPadding } from '@broad/redux-genes'
import {
  actions as variantActions,
  selectedVariantDataset,
  variantDeNovoFilter,
  variantFilter,
} from '@broad/redux-variants'
import { MaterialButtonRaised, Search } from '@broad/ui'

const SettingsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 1em;
`

const VariantCategoryButton = MaterialButtonRaised.extend`
  margin-right: 10px;
  background-color: ${({ isActive }) =>
    isActive ? 'rgba(10, 121, 191, 0.3)' : 'rgba(10, 121, 191, 0.1)'};

  &:hover {
    background-color: rgba(10, 121, 191, 0.3);
  }

  &:active {
    background-color: rgba(10, 121, 191, 0.5);
  }
`

const GeneSettings = ({
  searchVariants,
  setVariantFilter,
  toggleVariantDeNovoFilter,
  variantDeNovoFilter,
  variantFilter,
}) => (
  <SettingsWrapper>
    <div>
      <VariantCategoryButton
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
      </VariantCategoryButton>
      <VariantCategoryButton
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
      </VariantCategoryButton>
      <VariantCategoryButton
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
      </VariantCategoryButton>
      <VariantCategoryButton isActive={variantDeNovoFilter} onClick={toggleVariantDeNovoFilter}>
        De novo
      </VariantCategoryButton>
    </div>
    <Search placeholder={'Search variant table'} onChange={searchVariants} withKeyboardShortcuts />
  </SettingsWrapper>
)

GeneSettings.propTypes = {
  searchVariants: PropTypes.func.isRequired,
  setVariantFilter: PropTypes.func.isRequired,
  toggleVariantDeNovoFilter: PropTypes.func.isRequired,
  variantDeNovoFilter: PropTypes.bool.isRequired,
  variantFilter: PropTypes.shape({
    lof: PropTypes.bool.isRequired,
    missense: PropTypes.bool.isRequired,
    synonymous: PropTypes.bool.isRequired,
    other: PropTypes.bool.isRequired,
  }).isRequired,
}

const mapStateToProps = state => ({
  currentGene: currentGene(state),
  exonPadding: exonPadding(state),
  selectedVariantDataset: selectedVariantDataset(state),
  geneData: geneData(state),
  variantDeNovoFilter: variantDeNovoFilter(state),
  variantFilter: variantFilter(state),
})
const mapDispatchToProps = dispatch => ({
  setVariantFilter: filter => dispatch(variantActions.setVariantFilter(filter)),
  searchVariants: searchText => dispatch(variantActions.searchVariants(searchText)),
  toggleVariantDeNovoFilter: () => dispatch(variantActions.toggleVariantDeNovoFilter()),
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSettings)

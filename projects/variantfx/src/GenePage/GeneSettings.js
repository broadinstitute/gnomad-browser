import React, { PropTypes } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'

import {
  actions as variantActions,
  selectedVariantDataset,
} from '@broad/redux-variants'

import { geneData, currentGene, exonPadding } from '@broad/redux-genes'

import {
  MaterialButtonRaised,
  SettingsContainer,
  MenusContainer,
  Search,
  SearchContainer,
  DataSelectionGroup,
} from '@broad/ui'

const GeneSettings = ({
  searchVariants,
  setVariantFilter,
  // searchVariants
}) => {
  const VariantCategoryButtonGroup = styled.div`
    display: flex;
    flex-direction: row;
  `

  const VariantCatagoryButton = MaterialButtonRaised.extend`
    background-color: rgba(10, 121, 191, 0.1);
    margin-right: 10px;
    &:hover {
      background-color: rgba(10, 121, 191, 0.3);
    }
    &:active {
      background-color: rgba(10, 121, 191, 0.5);
    }
  `

  const MaterialVariantCategoryButtonGroup = () => (
    <VariantCategoryButtonGroup>
      <VariantCatagoryButton onClick={() => setVariantFilter('all')}>All</VariantCatagoryButton>
      <VariantCatagoryButton onClick={() => setVariantFilter('missenseOrLoF')}>Missense + LoF</VariantCatagoryButton>
      <VariantCatagoryButton onClick={() => setVariantFilter('lof')}>LoF</VariantCatagoryButton>
    </VariantCategoryButtonGroup>
  )

  return (
    <SettingsContainer>
      <MenusContainer>
        <DataSelectionGroup>
          <MaterialVariantCategoryButtonGroup />
        </DataSelectionGroup>
        <DataSelectionGroup>
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
}

GeneSettings.propTypes = {
  searchVariants: PropTypes.func.isRequired,
  setVariantFilter: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => {
  return {
    currentGene: currentGene(state),
    exonPadding: exonPadding(state),
    selectedVariantDataset: selectedVariantDataset(state),
    geneData: geneData(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setVariantFilter: filter => dispatch(variantActions.setVariantFilter(filter)),
    searchVariants: searchText => dispatch(variantActions.searchVariants(searchText)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GeneSettings)

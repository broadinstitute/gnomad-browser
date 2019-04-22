import PropTypes from 'prop-types'
import React from 'react'
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
  SearchInput,
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

  const VariantCategoryButton = styled(MaterialButtonRaised)`
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
      <VariantCategoryButton
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
            <SearchInput
              placeholder="Search variant table"
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

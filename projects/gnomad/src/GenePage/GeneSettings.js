/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React, { PropTypes } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'

import Slider from 'material-ui/Slider'
import TextField from 'material-ui/TextField'
import SelectField from 'material-ui/SelectField'
import MenuItem from 'material-ui/MenuItem'

import Mousetrap from 'mousetrap'

import {
  actions as variantActions,
  selectedVariantDataset,
} from '@broad/gene-page/src/resources/variants'

import { currentGene, exonPadding, actions as activeActions } from '@broad/gene-page/src/resources/active'
import { MaterialButtonRaised } from '@broad/ui'

let findInput

Mousetrap.bind(['command+f', 'meta+s'], (e) => {
  e.preventDefault()
  findInput.focus()
})

const GeneSettings = ({
  currentGene,
  exonPadding,
  selectedVariantDataset,
  setCurrentGene,
  setExonPadding,
  searchVariants,
  setVariantFilter,
  setSelectedVariantDataset,
}) => {
  const testGenes = [
    'PCSK9',
    'ZNF658',
    'MYH9',
    'FMR1',
    'BRCA2',
    'CFTR',
    'FBN1',
    'TP53',
    'SCN5A',
    'MYH7',
    'MYBPC3',
    'ARSF',
    'CD33',
    'DMD',
    'TTN',
    'USH2A',
  ]

  const handleDropdownChange = (gene) => {
    setCurrentGene(gene)
  }

  const setPadding = (event, newValue) => {
    const padding = Math.floor(1000 * newValue)
    setExonPadding(padding)
  }
  const geneLinks = testGenes.map(gene =>
    <a href="#" key={`${gene}-link`} onClick={() => handleDropdownChange(gene)}>{gene} </a>)

  const filterTextInputStyles = {
    hintStyle: {
      color: 'grey',
      fontSize: 12,
    },
    floatingLabelStyle: {
      color: 'black',
      fontSize: 14,
    },
    floatingLabelFocusStyle: {
      color: 'black',
      fontSize: 14,
    },
    menuItemStyle: {
      fontSize: 14
    },
  }
  const GeneSettingsContainer = styled.div`
    margin-left: 110px;
    width: 100%;
  `

  const MenusContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 950px;
  `

  const SearchContainer = styled.div`
    margin-bottom: 5px;
  `

  const VariantCategoryButtonGroup = styled.div`
    display: flex;
    flex-direction: row;
  `

  const VariantCatagoryButton = MaterialButtonRaised.extend`
    background-color: rgba(70, 130, 180, 0.07);
    margin-right: 10px;
    &:hover {
      background-color: rgba(70, 130, 180, 0.3);
    }
    &:active {
      background-color: rgba(70, 130, 180, 0.4);
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
    <GeneSettingsContainer>
      {/*geneLinks*/}
      <MenusContainer>
        <MaterialVariantCategoryButtonGroup />
        <SearchContainer>
          <TextField
            hintText="Enter search terms"
            hintStyle={filterTextInputStyles.inputStyle}
            floatingLabelText="Find variants"
            floatingLabelStyle={filterTextInputStyles.floatingLabelStyle}
            floatingLabelFocusStyle={filterTextInputStyles.floatingLabelFocusStyle}
            ref={input => findInput = input}
            onChange={(event) => {
              event.preventDefault()
              searchVariants(event.target.value)
            }}
          />
        </SearchContainer>
        <SelectField
          floatingLabelText="Select dataset"
          value={selectedVariantDataset}
          onChange={(event, index, value) => setSelectedVariantDataset(value)}
          floatingLabelStyle={filterTextInputStyles.floatingLabelStyle}
          floatingLabelFocusStyle={filterTextInputStyles.floatingLabelFocusStyle}
        >
          <MenuItem value={'gnomadExomeVariants'} primaryText="gnomAD exomes" />
          <MenuItem value={'gnomadGenomeVariants'} primaryText="gnomAD genomes" />
          <MenuItem value={'gnomadCombinedVariants'} primaryText="gnomAD combined" />
          <MenuItem value={'exACv1'} primaryText="ExACv1" />
        </SelectField>
        <Slider
          style={{
            width: 100,
            height: 20,
          }}
          onChange={setPadding}
        />
      </MenusContainer>
    </GeneSettingsContainer>
  )
}

GeneSettings.propTypes = {
  currentGene: PropTypes.string.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  exonPadding: PropTypes.number.isRequired,
  setCurrentGene: PropTypes.func.isRequired,
  setExonPadding: PropTypes.func.isRequired,
  searchVariants: PropTypes.func.isRequired,
  setVariantFilter: PropTypes.func.isRequired,
  setSelectedVariantDataset: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => {
  return {
    currentGene: currentGene(state),
    exonPadding: exonPadding(state),
    selectedVariantDataset: selectedVariantDataset(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setCurrentGene: geneName => dispatch(activeActions.setCurrentGene(geneName)),
    setExonPadding: padding => dispatch(activeActions.setExonPadding(padding)),
    setVariantFilter: filter => dispatch(variantActions.setVariantFilter(filter)),
    searchVariants: searchText => dispatch(variantActions.searchVariants(searchText)),
    setSelectedVariantDataset: dataset => dispatch(variantActions.setSelectedVariantDataset(dataset)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GeneSettings)

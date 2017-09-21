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

// import DropDownMenu from 'material-ui/DropDownMenu'
// import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'
// import Checkbox from 'material-ui/Checkbox'
import TextField from 'material-ui/TextField'
import { orange500, blue500 } from 'material-ui/styles/colors'
import Mousetrap from 'mousetrap'

import { actions as tableActions } from '@broad/gene-page/src/resources/table'
import { currentGene, exonPadding, actions as activeActions } from '@broad/gene-page/src/resources/active'

import { MaterialButtonRaised } from '@broad/ui'

let findInput

Mousetrap.bind(['command+f', 'meta+s'], function(e) {
  e.preventDefault()
  findInput.focus()
})

const GeneSettings = ({
  currentGene,
  exonPadding,
  setCurrentGene,
  setExonPadding,
  searchVariants
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
  }
  const GeneSettingsContainer = styled.div`
    margin-left: 50px;
    width: 100%;
  `

  const MenusContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 600px;
    margin-top: 20px;
    margin-bottom: 20px;
  `

  const SearchContainer = styled.div`
    margin-bottom: 5px;
  `

  const VariantCategoryButtonGroup = styled.div`
    display: flex;
    flex-direction: row;
  `

  const VariantCatagoryButton = MaterialButtonRaised.extend`
    background-color: rgba(10, 121, 191, 0.1);
    margin-right: 10px;
    &:hover {
      background-color: rgba(10, 121, 191, 0.3);
    &:active {
      background-color: rgba(10, 121, 191, 0.5);
    }
  `

  const MaterialVariantCategoryButtonGroup = () => (
    <VariantCategoryButtonGroup>
      <VariantCatagoryButton>All</VariantCatagoryButton>
      <VariantCatagoryButton>Missense + LoF</VariantCatagoryButton>
      <VariantCatagoryButton>LoF</VariantCatagoryButton>
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
        {'' /* <Slider
          style={{
            width: 100,
            height: 20,
          }}
          onChange={setPadding}
        /> */}
      </MenusContainer>
    </GeneSettingsContainer>
  )
}

GeneSettings.propTypes = {
  currentGene: PropTypes.string.isRequired,
  exonPadding: PropTypes.number.isRequired,
  setCurrentGene: PropTypes.func.isRequired,
  setExonPadding: PropTypes.func.isRequired,
  searchVariants: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => {
  return {
    currentGene: currentGene(state),
    exonPadding: exonPadding(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setCurrentGene: geneName => dispatch(activeActions.setCurrentGene(geneName)),
    setExonPadding: padding => dispatch(activeActions.setExonPadding(padding)),
    searchVariants: searchText => dispatch(tableActions.searchVariants(searchText))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GeneSettings)

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'

// import DropDownMenu from 'material-ui/DropDownMenu'
// import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'
// import Checkbox from 'material-ui/Checkbox'
import TextField from 'material-ui/TextField'
import { orange500, blue500 } from 'material-ui/styles/colors'
import Mousetrap from 'mousetrap'

import { actions as tableActions } from 'lens-redux-gene-page/lib/resources/table'
import { currentGene, exonPadding, actions as activeActions } from 'lens-redux-gene-page/lib/resources/active'

import css from './styles.css'

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
  return (
    <div className={css.geneSettings}>
      {/*geneLinks*/}
      <div className={css.menus}>
        <div className={css.variantSelectorCheckboxContainer}>
          <div className={css.variantSelectorCheckboxTitle}>
              Include:
          </div>
          <div className={css.variantSelectorCheckboxes}>
              <label>
                  <input checked type="checkbox" id="exome_checkbox" value="" />
                  <div className={css.checkboxLabel}>Exomes</div>
              </label>

              <label>
                  <input type="checkbox" id="genome_checkbox" value="" />
                  <div className={css.checkboxLabel}>Genomes</div>
              </label>
              <label>
                  <input checked type="checkbox" id="snp_checkbox" value="" />
                  <div className={css.checkboxLabel}>SNPs</div>
              </label>
              <label>
                  <input checked type="checkbox" id="indel_checkbox" value="" />
                  <div className={css.checkboxLabel}>Indels</div>
              </label>

              <label>
                  <input checked type="checkbox" id="filtered_checkbox" value="" />
                  <div className={css.checkboxLabel}>Filtered (non-PASS) variants</div>
              </label>
          </div>
        </div>
        <TextField
          hintText="Enter filter criteria"
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
        <Slider
          style={{
            width: 100,
            height: 20,
          }}
          onChange={setPadding}
        />
      </div>
    </div>
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

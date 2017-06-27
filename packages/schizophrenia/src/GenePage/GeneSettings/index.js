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
    'DRD2',
    'GRM3',
    'GRIN2A',
    'SRR',
    'GRIA1',
    'CACNA1C',
    'CACNB2',
  ]

  const handleDropdownChange = (gene) => {
    setCurrentGene(gene)
  }

  const setPadding = (event, newValue) => {
    const padding = Math.floor(30000 * newValue)
    setExonPadding(padding)
  }
  const geneLinks = testGenes.map(gene =>
    <a href="#" key={`${gene}-link`} onClick={() => handleDropdownChange(gene)}>{gene} </a>)
  return (
    <div className={css.geneSettings}>
      {geneLinks}
      <Slider
        style={{
          width: 100,
        }}
        onChange={setPadding}
      />
      <div className={css.menus}>
        {/*<input
          type="text"
          placeholder={'Enter data'}
          ref={input => findInput = input}
          onChange={(event) => {
            event.preventDefault()
            searchVariants(event.target.value)
          }}
        />*/}
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

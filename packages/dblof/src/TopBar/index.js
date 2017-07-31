import React from 'react'
import { connect } from 'react-redux'

import SearchIcon from 'material-ui/svg-icons/action/search'

import { currentGene, actions as activeActions } from 'lens-redux-gene-page/lib/resources/active'

import css from './styles.css'

// let TopBarSearchInput

const TopBar = ({ setCurrentGene }) => {
  return (
    <div className={css.topBar}>
      <div className={css.logo}>
        dbLoF
      </div>
      <div className={css.search}>
        <span className={css.searchIcon}>
          <SearchIcon />
        </span>
        <form onSubmit={(event) => {
          event.preventDefault()
          setCurrentGene(event.target.elements[0].value)
        }}>
          <input
            className={css.searchInput}
            type="text"
            name="search"
            placeholder="Search by gene, transcript, region, or variant"
            list="genes"
          />
          <datalist id="genes">
            <option value="PCSK9" />
            <option value="ZNF658" />
            <option value="MYH9" />
            <option value="FMR1" />
            <option value="BRCA2" />
            <option value="CFTR" />
            <option value="FBN1" />
            <option value="TP53" />
            <option value="SCN5A" />
            <option value="MYH7" />
            <option value="MYBPC3" />
            <option value="ARSF" />
            <option value="CD33" />
            <option value="DMD" />
            <option value="TTN" />
            <option value="USH2A" />
          </datalist>
        </form>
      </div>
    </div>
  )
}

const mapStateToProps = (state) => {
  return {
    currentGene: currentGene(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setCurrentGene: geneName => dispatch(activeActions.setCurrentGene(geneName)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(TopBar)

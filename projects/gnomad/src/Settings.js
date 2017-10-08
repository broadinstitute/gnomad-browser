import React, { PropTypes } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'
import Mousetrap from 'mousetrap'

import {
  actions as variantActions,
  selectedVariantDataset,
} from '@broad/gene-page/src/resources/variants'

import { exonPadding, actions as activeActions } from '@broad/gene-page/src/resources/active'

import {
  ClassicExacButton,
  ClassicExacButtonFirst,
  ClassicExacButtonLast,
  ClassicExacButtonGroup,
} from '@broad/ui/src/classicExac/button'

import { Search } from '@broad/ui/src/search/simpleSearch'

let findInput

Mousetrap.bind(['command+f', 'meta+s'], (e) => {
  e.preventDefault()
  findInput.focus()
})

const GeneSettings = ({
  exonPadding,
  selectedVariantDataset,
  setExonPadding,
  searchVariants,
  setVariantFilter,
  setSelectedVariantDataset,
}) => {
  const setPadding = (event, newValue) => {
    const padding = Math.floor(1000 * newValue)
    setExonPadding(padding)
  }

  const SettingsContainer = styled.div`
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

  const ClassicVariantCategoryButtonGroup = () => (
    <ClassicExacButtonGroup>
      <ClassicExacButtonFirst onClick={() => setVariantFilter('all')}>All</ClassicExacButtonFirst>
      <ClassicExacButton onClick={() => setVariantFilter('missenseOrLoF')}>Missense + LoF</ClassicExacButton>
      <ClassicExacButtonLast onClick={() => setVariantFilter('lof')}>LoF</ClassicExacButtonLast>
    </ClassicExacButtonGroup>
  )

  return (
    <SettingsContainer>
      <MenusContainer>
        <ClassicVariantCategoryButtonGroup />
        <SearchContainer>
          <Search
            listName={'search table'}
            options={['Variant ID', 'RSID', 'HGVSp']}
            placeholder={'Search variant table'}
            reference={findInput}
            onChange={searchVariants}
          />
        </SearchContainer>
        <select
          onChange={event => setSelectedVariantDataset(event.target.value)}
          value={selectedVariantDataset}
        >
          <option value="gnomadExomeVariants">gnomAD exomes</option>
          <option value="gnomadGenomeVariants">gnomAD genomes</option>
          <option value="gnomadCombinedVariants">gnomAD combined</option>
        </select>
      </MenusContainer>
    </SettingsContainer>
  )
}

GeneSettings.propTypes = {
  selectedVariantDataset: PropTypes.string.isRequired,
  exonPadding: PropTypes.number.isRequired,
  setExonPadding: PropTypes.func.isRequired,
  searchVariants: PropTypes.func.isRequired,
  setVariantFilter: PropTypes.func.isRequired,
  setSelectedVariantDataset: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => {
  return {
    exonPadding: exonPadding(state),
    selectedVariantDataset: selectedVariantDataset(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setExonPadding: padding => dispatch(activeActions.setExonPadding(padding)),
    setVariantFilter: filter => dispatch(variantActions.setVariantFilter(filter)),
    searchVariants: searchText =>
      dispatch(variantActions.searchVariants(searchText)),
    setSelectedVariantDataset: dataset =>
      dispatch(variantActions.setSelectedVariantDataset(dataset)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GeneSettings)

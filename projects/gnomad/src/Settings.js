import React, { PropTypes } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'
import Mousetrap from 'mousetrap'

import {
  actions as variantActions,
  selectedVariantDataset,
  variantFilter,
  variantQcFilter,
  variantSearchText,
} from '@broad/gene-page/src/resources/variants'

import { exonPadding, actions as activeActions } from '@broad/gene-page/src/resources/active'

import { geneData } from '@broad/gene-page/src/resources/genes'
import { regionData } from '@broad/gene-page/src/resources/regions'

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
  variantFilter,
  setSelectedVariantDataset,
  toggleVariantQcFilter,
  variantQcFilter,
  variantSearchText,
  geneData,
  regionData,
}) => {
  const setPadding = (event, newValue) => {
    const padding = Math.floor(1000 * newValue)
    setExonPadding(padding)
  }

  const SettingsContainer = styled.div`
    width: 100%;
  `

  const MenusContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding-right: 0;
    ${'' /* border: 1px solid green; */}
    @media (max-width: 900px) {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  `

  const SearchContainer = styled.div`
    margin-left: 10px;
    margin-bottom: 5px;
    @media (max-width: 900px) {
      margin-top: 5px;
      margin-bottom: 5px;
    }
  `

  let totalBasePairs
  if (geneData) {
    const exons = geneData.getIn(['transcript', 'exons']).toJS()

    const padding = 75
    totalBasePairs = exons.filter(region => region.feature_type === 'CDS')
      .reduce((acc, { start, stop }) => (acc + ((stop - start) + (padding * 2))), 0)
  }

  let partialFetch
  if (totalBasePairs > 40000) {
    partialFetch = 'lof'
    variantFilter = partialFetch  // eslint-disable-line
  } else if (totalBasePairs > 15000) {
    partialFetch = 'missenseOrLoF'
    variantFilter = variantFilter === 'all' ? partialFetch : variantFilter  // eslint-disable-line
  } else if (regionData) {
    if ((regionData.get('stop') - regionData.get('start')) > 50000) {
      partialFetch = 'lof'
      variantFilter = variantFilter === 'all' ? partialFetch : variantFilter  // eslint-disable-line
    }
  }

  const ClassicVariantCategoryButtonGroup = () => (
    <ClassicExacButtonGroup>
      <ClassicExacButtonFirst
        isActive={variantFilter === 'all'}
        onClick={() => setVariantFilter('all')}
        disabled={(partialFetch === 'lof' || partialFetch === 'missenseOrLoF')}
      >
        All
      </ClassicExacButtonFirst>
      <ClassicExacButton
        isActive={variantFilter === 'missenseOrLoF'}
        onClick={() => setVariantFilter('missenseOrLoF')}
        disabled={(partialFetch === 'lof')}
      >
        Missense + LoF
      </ClassicExacButton>
      <ClassicExacButtonLast
        isActive={variantFilter === 'lof'}
        onClick={() => setVariantFilter('lof')}
      >
        LoF
      </ClassicExacButtonLast>
    </ClassicExacButtonGroup>
  )

  const DataSelectionGroup = styled.div`
    margin: 0;
    display: flex;
    width: 50%;
    justify-content: space-around;
    align-items: center;
    ${'' /* border: 1px solid orange; */}
    @media (max-width: 900px) {
      flex-direction: row;
      justify-content: space-around;
      width: 90%;
    }
  `

  const DataSelectionContainer = styled.div`
    ${'' /* margin-right: 20px; */}
    ${'' /* border: 1px solid blue; */}
    @media (max-width: 900px) {
    }
  `

  return (
    <SettingsContainer>
      <MenusContainer>
        <DataSelectionGroup>
          <ClassicVariantCategoryButtonGroup />
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
          </DataSelectionContainer>
        </DataSelectionGroup>
        <DataSelectionGroup>
          <form>
            <div>
              <input
                id="qcFilter"
                type="checkbox"
                checked={!variantQcFilter}
                onChange={event => toggleVariantQcFilter()}
              />
              <label style={{ marginLeft: '5px' }} htmlFor="qcFilter">
                Include filtered variants
              </label>
            </div>
          </form>
          <SearchContainer>
            <Search
              listName={'search table'}
              options={['Variant ID', 'RSID', 'HGVSp']}
              placeholder={'Search variant table'}
              reference={findInput}
              onChange={searchVariants}
            />
          </SearchContainer>
        </DataSelectionGroup>
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
    variantQcFilter: variantQcFilter(state),
    variantFilter: variantFilter(state),
    // variantSearchText: variantSearchText(state),
    geneData: geneData(state),
    regionData: regionData(state),
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
    toggleVariantQcFilter: () =>
      dispatch(variantActions.toggleVariantQcFilter()),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GeneSettings)

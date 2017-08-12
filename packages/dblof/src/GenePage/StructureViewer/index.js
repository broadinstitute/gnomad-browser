/* eslint-disable arrow-parens */
/* eslint-disable no-shadow */
import React, { PropTypes } from 'react'
import { connect } from 'react-redux'

import * as reduxFunctions from 'lens-structure-viewer/lib/redux'

import ProteinStructureViewer from 'lens-structure-viewer/lib/component'

import {
  visibleVariants,
  searchFilteredVariants,
} from 'lens-redux-gene-page/lib/resources/table'

let StructureViewerConnected = (props) => {
  const {
    pdbFiles,
    pdbSearchResultsList,
    receivedPdb,
    retrieving,
    currentPdb,
    currentGene,
    setCurrentPdbOnClick,
    fetchPdbIfNeeded,
    searchPdb,
    variants
  } = props
  console.log('re-rendering')
  return (
    <div>
      <ProteinStructureViewer
        width={1000}
        height={400}
        backgroundColor={'#FAFAFA'}
        variantsData={variants}
        pdbFiles={pdbFiles}
        pdbSearchResultsList={pdbSearchResultsList}
        receivedPdb={receivedPdb}
        retrieving={retrieving}
        currentPdb={currentPdb}
        currentGene={currentGene}
        setCurrentPdbOnClick={setCurrentPdbOnClick}
        fetchPdbIfNeeded={fetchPdbIfNeeded}
        searchPdb={searchPdb}
      />
    </div>
  )
}

const mapStateToProps = (state) => {
  const currentGene = state.active.currentGene
  const structureData = reduxFunctions.structures(state)
  const retrieving = reduxFunctions.retrieving(state)
  const currentPdb = reduxFunctions.currentPdb(state)
  const pdbSearchResultsList = structureData.get('pdbSearchResultsList').toJS()
  const receivedPdb = structureData.get('receivedPdb')
  const hasPdb = structureData.get('receivedPdb')
  const pdbFiles = structureData.get('pdbFiles').toJS()
  return ({
    retrieving,
    currentPdb,
    pdbSearchResultsList,
    receivedPdb,
    hasPdb,
    pdbFiles,
    currentGene,
    variants: searchFilteredVariants(state),
  })
}

const mapDispatchProps = (dispatch) => ({
  setCurrentPdbOnClick: (pdb) => dispatch(reduxFunctions.actions.setCurrentPdb(pdb)),
  fetchPdbIfNeeded: (gene, pdb) => dispatch(reduxFunctions.actions.fetchPdbIfNeeded(gene, pdb)),
  searchPdb: (gene) => dispatch(reduxFunctions.actions.searchPdb(gene)),
})

StructureViewerConnected = connect(mapStateToProps, mapDispatchProps)(StructureViewerConnected)

export default StructureViewerConnected

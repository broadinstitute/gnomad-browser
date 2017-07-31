/* eslint-disable arrow-parens */
/* eslint-disable no-shadow */
import React, { PropTypes } from 'react'
import { connect } from 'react-redux'

import {
  actions,
  structures,
  currentPdb,
  retrieving,
} from 'lens-structure-viewer/lib/redux'

import ProteinStructureViewer from 'lens-structure-viewer/lib/component'

let StructureViewerConnected = (props) => {
  return (
    <div>
      <ProteinStructureViewer
        variantsData={[123, 124, 125]}
        {...props}
      />
    </div>
  )
}

const mapStateToProps = (state) => {
  const currentGene = 'HBB'
  const structureData = structures(state.structureViewer, currentGene)
  return ({
    retrieving: retrieving(state.structureViewer),
    currentPdb: currentPdb(state.structureViewer),
    pdbSearchResultsList: structureData.get('pdbSearchResultsList').toJS(),
    receivedPdb: structureData.get('receivedPdb'),
    hasPdb: structureData.get('receivedPdb'),
    pdbFiles: structureData.get('pdbFiles').toJS(),
    currentGene,
  })
}

const mapDispatchProps = (dispatch) => ({
  setCurrentPdbOnClick: (pdb) => dispatch(actions.setCurrentPdb(pdb)),
  fetchPdbIfNeeded: (gene, pdb) => dispatch(actions.fetchPdbIfNeeded(gene, pdb)),
  searchPdb: (gene) => dispatch(actions.searchPdb(gene)),
})

StructureViewerConnected = connect(mapStateToProps, mapDispatchProps)(StructureViewerConnected)

export default StructureViewerConnected

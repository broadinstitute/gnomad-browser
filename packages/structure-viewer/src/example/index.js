/* eslint-disable arrow-parens */
/* eslint-disable no-shadow */
import React, { PropTypes } from 'react'
import Immutable from 'immutable'
import { Provider, connect } from 'react-redux'

import createTestStore from './store'

import {
  actions,
  structures,
  currentPdb,
  retrieving,
} from '../redux'

const store = createTestStore()

import ProteinStructureViewer from '../component'

let StructureViewerExample = (props) => {
  return (
    <div>
      <h1>Structure viewer example</h1>
      <ProteinStructureViewer
        height={800}
        width={800}
        backgroundColor={'white'}
        variantsData={[123, 124, 125]}
        {...props}
      />
    </div>
  )
}

const mapStateToProps = (state) => {
  const currentGene = 'HBB'
  const structureData = structures(state, currentGene)
  console.log(state.toJS())
  console.log(structureData.toJS())
  return ({
    retrieving: retrieving(state),
    currentPdb: currentPdb(state),
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

StructureViewerExample = connect(mapStateToProps, mapDispatchProps)(StructureViewerExample)

const ExampleApp = () => (
  <Provider store={store}>
    <StructureViewerExample />
  </Provider>
)

export default ExampleApp

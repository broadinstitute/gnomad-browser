import React from 'react'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'

import { createGeneReducer } from '@broad/redux-genes'
import GeneViewer from '@broad/region-viewer/src/example/GeneViewer'

import { ConnectedTranscriptsTrack } from '..'

const logger = createLogger()

const store = createStore(
  combineReducers({
    genes: createGeneReducer({
      variantDatasets: {},
    }),
  }),
  applyMiddleware(thunk, logger)
)

const TranscriptsTrackExample = () => (
  <Provider store={store}>
    <GeneViewer geneName="DMD" width={800}>
      <ConnectedTranscriptsTrack />
    </GeneViewer>
  </Provider>
)

export default TranscriptsTrackExample

import React from 'react'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'

import { createGeneReducer } from '@broad/redux-genes'
import GeneViewer from '@broad/region-viewer/src/example/GeneViewer'

import { TranscriptTrackConnected } from '..'

const logger = createLogger()

const store = createStore(
  combineReducers({
    genes: createGeneReducer({
      variantDatasets: {},
    }),
  }),
  applyMiddleware(thunk, logger)
)

const TranscriptTrackExample = () => (
  <Provider store={store}>
    <GeneViewer geneName="DMD" width={800}>
      <TranscriptTrackConnected height={10} />
    </GeneViewer>
  </Provider>
)

export default TranscriptTrackExample

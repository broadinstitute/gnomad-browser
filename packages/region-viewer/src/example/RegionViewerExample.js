import React from 'react'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import styled from 'styled-components'

import { createGeneReducer } from '@broad/redux-genes'
import PositionTableTrack from '@broad/track-position-table'
import { TranscriptTrackConnected } from '@broad/track-transcript'

import GeneViewer from './GeneViewer'

const logger = createLogger()

const Wrapper = styled.div`
  width: 1000px;
  margin: 50px auto;
`

const store = createStore(
  combineReducers({
    genes: createGeneReducer({
      variantDatasets: {},
    }),
  }),
  applyMiddleware(thunk, logger)
)

const ExampleApp = () => (
  <Provider store={store}>
    <Wrapper>
      <GeneViewer geneName="PCSK9" width={1000}>
        <TranscriptTrackConnected height={12} />
        <PositionTableTrack />
      </GeneViewer>
    </Wrapper>
  </Provider>
)

export default ExampleApp

import React from 'react'
import styled from 'styled-components'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import createGeneReducer from '@broad/redux-genes'
import createActiveReducer from '@broad/gene-page/src/resources/active'

import GeneViewer from '@broad/region/src/GeneViewerConnected'

import { TranscriptTrackConnected } from '../index'

const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
  border: 1px solid #000;
`

const logger = createLogger()

const store = createStore(
  combineReducers({
    genes: createGeneReducer({ variantDatasets: {} }),
    active: createActiveReducer({ projectDefaults: { startingGene: 'DMD' } }),
  }),
  applyMiddleware(thunk, logger)
)

const ExampleApp = () => (
  <Provider store={store}>
    <Wrapper>
      <GeneViewer width={800}>
        <TranscriptTrackConnected
          height={10}
        />
      </GeneViewer>
    </Wrapper>
  </Provider>
)

export default ExampleApp

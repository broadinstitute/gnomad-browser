import React from 'react'
import styled from 'styled-components'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import { createGeneReducer } from '@broad/redux-genes'

import { GeneViewer } from '@broad/region'

import { TranscriptTrackConnected } from '../index'

const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
  border: 1px solid #000;
`

const logger = createLogger()

const store = createStore(
  combineReducers({
    genes: createGeneReducer(
      {
        startingGene: 'DMD',
        variantDatasets: {},
      }
    )
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

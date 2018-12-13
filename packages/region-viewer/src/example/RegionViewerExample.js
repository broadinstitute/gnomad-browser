import React from 'react'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import styled from 'styled-components'

import { createGeneReducer } from '@broad/redux-genes'
import PositionTableTrack from '@broad/track-position-table'
import { TranscriptTrackConnected } from '@broad/track-transcript'

import { GeneViewer } from '..'

const logger = createLogger()

const Wrapper = styled.div`
  width: 1000px;
  margin: 50px auto;
`

const attributeConfig = {
  CDS: {
    color: '#28BCCC',
    thickness: '30px',
  },
  start_pad: {
    color: '#FFB33D',
    thickness: '5px',
  },
  end_pad: {
    color: '#BEEB9F',
    thickness: '5px',
  },
  intron: {
    color: '#FF9559',
    thickness: '5px',
  },
  default: {
    color: '#grey',
    thickness: '5px',
  },
}

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
      <GeneViewer geneName="PCSK9" regionAttributes={attributeConfig} width={1000}>
        <TranscriptTrackConnected height={12} />
        <PositionTableTrack />
      </GeneViewer>
    </Wrapper>
  </Provider>
)

export default ExampleApp

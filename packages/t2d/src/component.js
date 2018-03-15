import React from 'react'
import styled from 'styled-components'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import { createGeneReducer, actions } from '@broad/redux-genes'

import { GeneViewer } from '@broad/region'

import { TranscriptTrackConnected } from '@broad/track-transcript'

const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
  ${'' /* border: 1px solid #000; */}
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

const ExampleApp = ({ gene }) => {
  store.dispatch(actions.setCurrentGene(gene))
  return (
    <Provider store={store}>
      <Wrapper>
        <GeneViewer currentGene={gene} width={800}>
          <TranscriptTrackConnected
            currentGene={gene}
            height={10}
          />
        </GeneViewer>
      </Wrapper>
    </Provider>
  )
}


export default ExampleApp

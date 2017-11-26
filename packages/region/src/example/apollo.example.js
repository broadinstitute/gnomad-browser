import React from 'react'
import styled from 'styled-components'
import { Provider as ReduxStoreProvider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { ApolloProvider, } from 'react-apollo'

import { createLogger } from 'redux-logger'
import { createGeneReducer } from '@broad/redux-genes'
// import createActiveReducer from '@broad/gene-page/src/resources/active'
import { TranscriptTrack } from '@broad/track-transcript'
import PositionTableTrack from '@broad/track-position-table'

import GeneViewer from '../GeneViewerApolloConnected'

const logger = createLogger()

const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
  border: 1px solid #000;
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
    genes: createGeneReducer({ startingGene: 'DMD' }),
  }),
  applyMiddleware(thunk, logger)
)

const client = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:8007' }),
  // link: new HttpLink({ uri: 'http://35.184.112.239/' }),
  cache: new InMemoryCache()
})

const ExampleApp = () => (
  <ReduxStoreProvider store={store}>
    <ApolloProvider client={client}>
      <Wrapper>
        <GeneViewer width={1000} regionAttributes={attributeConfig}>
          <TranscriptTrack
            title={''}
            height={50}
          />
          <PositionTableTrack
            title={''}
            height={50}
            leftPanelWidth={100}
          />
        </GeneViewer>
      </Wrapper>
    </ApolloProvider>
  </ReduxStoreProvider>
)

export default ExampleApp

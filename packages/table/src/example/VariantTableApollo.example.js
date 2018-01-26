import React from 'react'
import styled from 'styled-components'
import { Provider as ReduxStoreProvider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'

import { ApolloClient } from 'apollo-client'
import { ApolloProvider, } from 'react-apollo'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'

import { createGeneReducer, actions as geneActions } from '@broad/redux-genes'
import { Search } from '@broad/ui'

import VariantTable from '../VariantTableApollo'
import tableConfig from './tableConfig'

const logger = createLogger()

const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
  border: 1px solid #000;
`

const store = createStore(
  combineReducers({
    genes: createGeneReducer({
      startingGene: 'ENSG00000198947',
      startingTranscript: 'testing',
      variantDatasets: {},
    }),
  }),
  applyMiddleware(thunk, logger)
)

const client = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:8007' }),
  // link: new HttpLink({ uri: 'http://35.184.112.239' }),
  cache: new InMemoryCache()
})

const ExampleApp = () => (
  <ReduxStoreProvider store={store}>
    <ApolloProvider client={client}>
      <Wrapper>
        <Search onChange={gene => store.dispatch(geneActions.setCurrentTranscript(gene))} />
        <VariantTable
          store={store}
          numberOfVariants={50}
          tableConfig={tableConfig}
          consequence={'missense_variant'}
        />
      </Wrapper>
    </ApolloProvider>
  </ReduxStoreProvider>
)

export default ExampleApp

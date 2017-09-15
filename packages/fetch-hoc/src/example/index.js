/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React from 'react'
import R from 'ramda'
import { createStore, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'
import { createSelector } from 'reselect'

import FetchHOC from '../index'

const initialState = {
  currentGene: 'PCSK9',
  isFetching: false,
  allGenes: ['PCSK9'],
}

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_CURRENT_GENE':
      return {
        ...state,
        currentGene: action.currentGeneName,
      }
    case 'REQUEST_GENE_DATA':
      return {
        ...state,
        isFetching: true,
      }
    case 'RECEIVE_GENE_DATA':
      return {
        ...state,
        isFetching: false,
        allGenes: [...state.allGenes, action.data],
      }
    default:
      return state
  }
}

const logger = createLogger()

const store = createStore(rootReducer, applyMiddleware(thunk, logger))

const getCurrentGene = state => state.currentGene

const getAllGenes = state => state.allGenes

const geneIsFetching = state => state.isFetching

const shouldFetchGene = createSelector(
  [getCurrentGene, getAllGenes, geneIsFetching],
  (currentGene, allGenes, isFetching) => {
    if (!R.contains(currentGene, allGenes)) {
      return true
    }
    if (isFetching) {
      return false
    }
    return false
  }
)

const mockFetch = (geneName) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(geneName)
    }, 500)
  })
}

const fetchGene = (geneName) => {
  return (dispatch) => {
    dispatch({
      type: 'REQUEST_GENE_DATA',
    })

    mockFetch(geneName).then((data) => {
      dispatch({
        type: 'RECEIVE_GENE_DATA',
        data,
      })
    })
  }
}


const FetchHocExample = ({ currentId }) => {
  return (
    <div>
      {'Current data: '} {currentId}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          store.dispatch({
            currentGeneName: event.target.elements[0].value,
            type: 'SET_CURRENT_GENE',
          })
        }}
      >
        <input type="text" placeholder={'Enter data'} />
        <button style={{ visibility: 'hidden' }} type="submit" />
      </form>
    </div>
  )
}

const WrappedComponent = FetchHOC(
  FetchHocExample,
  getCurrentGene,
  shouldFetchGene,
  fetchGene,
)

const ExampleApp = () => (
  <Provider store={store}>
    <WrappedComponent />
  </Provider>
)

export default ExampleApp

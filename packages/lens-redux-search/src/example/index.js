/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import React from 'react'
import R from 'ramda'
import { Provider, connect } from 'react-redux'
import { createSelector } from 'reselect'

import createStore from './store'

import {
  // State,
  // resources,
  // resourceSelector,
  variants,
  searchSelectors,
  dataSearchText,
  filteredIdList,
  searchVariants,
  unfilteredResult,
  immutableData,
  actions,
} from './resources'


const store = createStore()

let SearchExample = ({ variants, filteredIdList, searchVariants }) => {
  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          searchVariants(event.target.elements[0].value)
        }}
      >
        <input type="text" placeholder={'Enter data'} />
        <button style={{ visibility: 'hidden' }} type="submit" />
      </form>
      {filteredIdList.map(id => {
        return <p>{variants.get(id)}</p>
      })}
      {/*variants.map(v => <p>{v.variant_id}_____{v.hgvsp}</p>)*/}
    </div>
  )
}

const selectors = createSelector(
  [variants, filteredIdList], (variants, filteredIdList) => ({ variants, filteredIdList })
)

SearchExample = connect(selectors, actions)(SearchExample)

const ExampleApp = () => (
  <Provider store={store}>
    <SearchExample />
  </Provider>
)

export default ExampleApp


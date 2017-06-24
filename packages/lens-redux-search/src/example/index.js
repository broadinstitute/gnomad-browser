/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import React from 'react'
import R from 'ramda'
import { Provider, connect } from 'react-redux'
import { createSelector } from 'reselect'
import Highlighter from 'react-highlight-words'

import createStore from './store'

import css from './styles.css'

import {
  // State,
  // resources,
  // resourceSelector,
  variants,
  searchSelectors,
  dataSearchText,
  filteredIdList,
  searchVariants,
  actions,
} from './resources'


const store = createStore()

let SearchExample = ({ variants, filteredIdList, dataSearchText, searchVariants }) => {
  const filteredVariants = filteredIdList.map(id => {
    const variant = variants.get(id)
    return (
      <div className={css.row}>
        <Highlighter
          key={id}
          highlightClassName={css.Highlight}
          searchWords={dataSearchText.split(/\s+/)}
          textToHighlight={`${variant.variant_id},      ${variant.hgvsp},      ${variant.hgvsc}`}
        />
    </div>
    )
  })
  return (
    <div>

      <input
        type="text"
        placeholder={'Enter data'}
        onChange={(event) => {
          event.preventDefault()
          searchVariants(event.target.value)
        }}
      />
      <button style={{ visibility: 'hidden' }} type="submit" />
      {filteredVariants}
    </div>
  )
}

const selectors = createSelector(
  [variants, filteredIdList, dataSearchText], (variants, filteredIdList, dataSearchText) =>
    ({ variants, filteredIdList, dataSearchText })
)

SearchExample = connect(selectors, actions)(SearchExample)

const ExampleApp = () => (
  <Provider store={store}>
    <SearchExample />
  </Provider>
)

export default ExampleApp


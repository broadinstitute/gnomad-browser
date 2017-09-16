/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import React from 'react'
import R from 'ramda'
import { Provider, connect } from 'react-redux'
import { createSelector } from 'reselect'
import Highlighter from 'react-highlight-words'
import Mousetrap from 'mousetrap'

import LensTable from '@broad/table'

import createStore from './store'
import tableConfig from './tableConfig'

import {
  variants,
  searchSelectors,
  dataSearchText,
  filteredIdList,
  searchVariants,
  actions,
} from './resources'

let findInput

Mousetrap.bind(['command+f', 'meta+s'], function(e, combo) {
  e.preventDefault()
  findInput.focus()
})

const store = createStore()

let SearchExample = ({
  variants,
  filteredIdList,
  dataSearchText,
  searchVariants
}) => {
  const filteredVariantsRendered = filteredIdList.map(id => {
    const variant = variants.get(id)
    return (
      <div key={id} styles={{ display: 'block' }}>
        <Highlighter
          searchWords={dataSearchText.split(/\s+/)}
          textToHighlight={`${variant.variant_id},      ${variant.hgvsp},      ${variant.hgvsc}`}
        />
    </div>
  )
  })
  const filteredVariants = filteredIdList.map(id => variants.get(id))
  return (
    <div>
      <input
        type="text"
        placeholder={'Enter data'}
        ref={input => findInput = input}
        onChange={(event) => {
          event.preventDefault()
          searchVariants(event.target.value)
        }}
      />
      <button style={{ visibility: 'hidden' }} type="submit" />
      <LensTable
        title={''}
        height={800}
        tableConfig={tableConfig}
        tableData={filteredVariants}
        remoteRowCount={filteredVariants.size}
        searchText={dataSearchText}
      />
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

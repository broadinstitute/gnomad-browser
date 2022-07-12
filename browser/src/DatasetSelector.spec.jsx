import React from 'react'
import { Router } from 'react-router'
import renderer from 'react-test-renderer'
import DatasetSelector from './DatasetSelector'
import { createBrowserHistory } from 'history'

import { allDatasetIds } from './datasets'

describe.each(allDatasetIds)('DataSelector with "%s" dataset selected', (datasetId) => {
  test('has no unexpected changes', () => {
    const tree = renderer.create(
      <Router history={createBrowserHistory()}>
        <DatasetSelector selectedDataset={datasetId} datasetOptions={{}} />
      </Router>
    )
    expect(tree).toMatchSnapshot()
  })
})

import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import { Router } from 'react-router'
import renderer from 'react-test-renderer'
import { createBrowserHistory } from 'history'
import DatasetSelector from './DatasetSelector'

import { forAllDatasets } from '../../tests/__helpers__/datasets'

forAllDatasets('DataSelector with "%s" dataset selected', (datasetId) => {
  test('has no unexpected changes', () => {
    const tree = renderer.create(
      <Router history={createBrowserHistory()}>
        <DatasetSelector selectedDataset={datasetId} datasetOptions={{}} />
      </Router>
    )
    expect(tree).toMatchSnapshot()
  })
})

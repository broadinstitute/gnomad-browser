import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'
import DatasetSelector from './DatasetSelector'

import { forAllDatasets } from '../../tests/__helpers__/datasets'
import { withDummyRouter } from '../../tests/__helpers__/router'

forAllDatasets('DataSelector with "%s" dataset selected', (datasetId) => {
  test('has no unexpected changes', () => {
    const tree = renderer.create(
      withDummyRouter(<DatasetSelector selectedDataset={datasetId} datasetOptions={{}} />)
    )
    expect(tree).toMatchSnapshot()
  })
})

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

  test('has no unexpected changes when showing all possible datasets', () => {
    const tree = renderer.create(
      withDummyRouter(
        <DatasetSelector
          selectedDataset={datasetId}
          datasetOptions={{
            includeShortVariants: true,
            includeStructuralVariants: true,
            includeExac: true,
            includeGnomad2: true,
            includeGnomad2Subsets: true,
            includeGnomad3: true,
            includeGnomad3Subsets: true,
            includeCopyNumberVariants: true,
            includeGnomad4: true,
          }}
        />
      )
    )
    expect(tree).toMatchSnapshot()
  })
})

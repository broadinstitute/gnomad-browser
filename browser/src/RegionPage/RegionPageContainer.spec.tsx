import React from 'react'
import { test, expect } from '@jest/globals'
import { createRenderer } from 'react-test-renderer/shallow'

import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import RegionPageContainer from './RegionPageContainer'

forAllDatasets('RegionPageContainer with dataset %s', (datasetId) => {
  test('queries API with correct parameters', () => {
    const renderer = createRenderer()
    renderer.render(<RegionPageContainer datasetId={datasetId} regionId="12-345-678" />)
    expect(renderer.getRenderOutput()).toMatchSnapshot()
  })
})

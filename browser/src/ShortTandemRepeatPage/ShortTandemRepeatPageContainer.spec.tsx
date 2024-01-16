import React from 'react'
import { test, expect } from '@jest/globals'
import { createRenderer } from 'react-test-renderer/shallow'

import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import ShortTandemRepeatPageContainer from './ShortTandemRepeatPageContainer'

forAllDatasets('ShortTandemRepeatPageContainer with dataset %s', (datasetId) => {
  test('queries API with correct parameters', () => {
    const renderer = createRenderer()
    renderer.render(<ShortTandemRepeatPageContainer datasetId={datasetId} strId="ATXN1" />)
    expect(renderer.getRenderOutput()).toMatchSnapshot()
  })
})

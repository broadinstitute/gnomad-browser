import React from 'react'
import { expect, test } from '@jest/globals'
import { createRenderer } from 'react-test-renderer/shallow'
import shortTandemRepeatFactory from '../__factories__/ShortTandemRepeat'

import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import ShortTandemRepeatPage from './ShortTandemRepeatPage'

forAllDatasets('ShortTandemRepeatPage with "%s" dataset', (datasetId) => {
  test('has no unexected changes', () => {
    const shortTandemRepeat = shortTandemRepeatFactory.build()
    const renderer = createRenderer()
    renderer.render(
      <ShortTandemRepeatPage datasetId={datasetId} shortTandemRepeat={shortTandemRepeat} />
    )
    expect(renderer.getRenderOutput()).toMatchSnapshot()
  })
})

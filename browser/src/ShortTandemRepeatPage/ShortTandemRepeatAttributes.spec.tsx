import React from 'react'
import { expect, test } from '@jest/globals'
import renderer from 'react-test-renderer'
import shortTandemRepeatFactory, { DEFAULT_GENE } from '../__factories__/ShortTandemRepeat'

import ShortTandemRepeatAttributes from './ShortTandemRepeatAttributes'
import { BrowserRouter } from 'react-router-dom'

describe('ShortTandemRepeatAttributes', () => {
  test('has no unexected changes', () => {
    const shortTandemRepeat = shortTandemRepeatFactory.build()
    const tree = renderer.create(
      <BrowserRouter>
        <ShortTandemRepeatAttributes shortTandemRepeat={shortTandemRepeat} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })

  test('displays no gene link for an STR with empty string for associated gene', () => {
    const shortTandemRepeat = shortTandemRepeatFactory.build({
      gene: { ...DEFAULT_GENE, ensembl_id: '' },
    })
    const tree = renderer.create(
      <BrowserRouter>
        <ShortTandemRepeatAttributes shortTandemRepeat={shortTandemRepeat} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})

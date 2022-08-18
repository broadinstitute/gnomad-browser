import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import DownloadsPage from './DownloadsPage'

import { withDummyRouter } from '../../../tests/__helpers__/router'

const downloadsTabs = ['#v2-', '#v2-liftover-', '#v3-', '#exac-', '#research-']

downloadsTabs.forEach((tab) => {
  test(`Downloads page with location '${tab}' indicated in url `, () => {
    const tree = renderer.create(withDummyRouter(<DownloadsPage location={{ hash: tab }} />))
    expect(tree).toMatchSnapshot()
  })
})

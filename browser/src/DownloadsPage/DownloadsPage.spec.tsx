import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import DownloadsPage from './DownloadsPage'

import { withDummyRouter } from '../../../tests/__helpers__/router'

test('Downloads Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<DownloadsPage />))
  expect(tree).toMatchSnapshot()
})

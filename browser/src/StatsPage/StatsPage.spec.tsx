import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import StatsPage from './StatsPage'

import { withDummyRouter } from '../../../tests/__helpers__/router'

test('Stats Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<StatsPage />))
  expect(tree).toMatchSnapshot()
})

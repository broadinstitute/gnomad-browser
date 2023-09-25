import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import StatsPage from './StatsPage'
import { BrowserRouter } from 'react-router-dom'

test('Stats Page has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <StatsPage />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

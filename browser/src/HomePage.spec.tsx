import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import HomePage from './HomePage'

import { BrowserRouter } from 'react-router-dom'

test('Home Page has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

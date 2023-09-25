import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import NavBar from './NavBar'

import { BrowserRouter } from 'react-router-dom'

test('NavBar has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <NavBar />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

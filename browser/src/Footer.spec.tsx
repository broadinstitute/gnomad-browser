import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import Footer from './Footer'

import { BrowserRouter } from 'react-router-dom'

test('Footer has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <Footer />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

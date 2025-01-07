import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import FederationPage from './FederationPage'

import { BrowserRouter } from 'react-router-dom'

test('Federation Page has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <FederationPage />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

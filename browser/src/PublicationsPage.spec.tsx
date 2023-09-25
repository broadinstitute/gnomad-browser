import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import PublicationsPage from './PublicationsPage'

import { BrowserRouter } from 'react-router-dom'

test('Publications Page has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <PublicationsPage />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

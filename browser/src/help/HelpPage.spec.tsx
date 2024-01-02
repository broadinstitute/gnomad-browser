import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import HelpPage from './HelpPage'

import { BrowserRouter } from 'react-router-dom'

test('Help Page has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <HelpPage />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

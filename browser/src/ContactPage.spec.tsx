import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import ContactPage from './ContactPage'
import { BrowserRouter } from 'react-router-dom'

test('Contact Page has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <ContactPage />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

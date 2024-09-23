import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import DataPage from './DataPage'

import { BrowserRouter } from 'react-router-dom'

test('Data Page has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <DataPage />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

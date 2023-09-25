import { jest, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import TeamPage from './TeamPage'

import { BrowserRouter } from 'react-router-dom'

jest.mock('./headshotLoader', () => ({
  headshotImages: () => {
    return 'mockHeadshotImages'
  },
}))

test('Team Page has no unexpected changes', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <TeamPage />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

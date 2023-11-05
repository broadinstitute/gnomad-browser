import { jest, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import TeamPage from './TeamPage'

import { withDummyRouter } from '../../../tests/__helpers__/router'

jest.mock('./headshotLoader', () => ({
  headshotImages: () => {
    return 'mockHeadshotImages'
  },
}))

test('Team Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<TeamPage />))
  expect(tree).toMatchSnapshot()
})

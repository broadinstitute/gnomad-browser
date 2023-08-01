import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import NavBar from './NavBar'

import { withDummyRouter } from '../../tests/__helpers__/router'

test('NavBar has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<NavBar />))
  expect(tree).toMatchSnapshot()
})

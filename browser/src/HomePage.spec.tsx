import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import HomePage from './HomePage'

import { withDummyRouter } from '../../tests/__helpers__/router'

test('Home Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<HomePage />))
  expect(tree).toMatchSnapshot()
})

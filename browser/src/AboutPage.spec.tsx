import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import AboutPage from './AboutPage'

import { withDummyRouter } from '../../tests/__helpers__/router'

test('About Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<AboutPage />))
  expect(tree).toMatchSnapshot()
})

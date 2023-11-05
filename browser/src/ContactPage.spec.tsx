import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import ContactPage from './ContactPage'

import { withDummyRouter } from '../../tests/__helpers__/router'

test('Contact Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<ContactPage />))
  expect(tree).toMatchSnapshot()
})

import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import PoliciesPage from './PoliciesPage'

import { withDummyRouter } from '../../tests/__helpers__/router'

test('Policies Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<PoliciesPage />))
  expect(tree).toMatchSnapshot()
})

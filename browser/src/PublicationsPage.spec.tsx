import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import PublicationsPage from './PublicationsPage'

import { withDummyRouter } from '../../tests/__helpers__/router'

test('Publications Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<PublicationsPage />))
  expect(tree).toMatchSnapshot()
})

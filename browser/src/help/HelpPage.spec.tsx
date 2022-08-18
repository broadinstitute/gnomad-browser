import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import HelpPage from './HelpPage'

import { withDummyRouter } from '../../../tests/__helpers__/router'

test('Help Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<HelpPage />))
  expect(tree).toMatchSnapshot()
})

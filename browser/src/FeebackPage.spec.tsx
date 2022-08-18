import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import FeedbackPage from './FeedbackPage'

import { withDummyRouter } from '../../tests/__helpers__/router'

test('Feedback Page has no unexpected changes', () => {
  const tree = renderer.create(withDummyRouter(<FeedbackPage />))
  expect(tree).toMatchSnapshot()
})

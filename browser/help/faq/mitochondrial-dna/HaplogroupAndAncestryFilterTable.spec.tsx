import { test, expect } from '@jest/globals'
import renderer from 'react-test-renderer'
import 'jest-styled-components'

import { renderAnswer } from './how-many-samples-are-in-each-mtdna-haplogroup-for-each-nuclear-ancestry-population'

test('has no unexpected changes', () => {
  const tree = renderer.create(renderAnswer())
  expect(tree).toMatchSnapshot()
})

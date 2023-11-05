import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import VariantFlag, { FLAGS_CONFIG } from './VariantFlag'

describe('Variant flag', () => {
  const realFlags = Object.keys(FLAGS_CONFIG)

  realFlags.forEach((flag) => {
    test(`correctly formats with key of '${flag}'`, () => {
      const tree = renderer.create(<VariantFlag key={flag} type={flag} variant={{}} />)
      expect(tree).toMatchSnapshot()
    })
  })

  test('correctly formats as nothing when given a non-existent variant flag', () => {
    const tree = renderer.create(
      <VariantFlag key="not-a-real-flag" type="not-a-real-flag" variant={{}} />
    )
    expect(tree).toMatchSnapshot()
  })
})

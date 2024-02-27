import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'
import { BrowserRouter } from 'react-router-dom'

import StructuralVariantAttributeList from './StructuralVariantAttributeList'
import StructuralVariantFactory from '../__factories__/StructuralVariant'

test('StructuralVariantAttributeList tolerates certain variant fields being null', () => {
  const variant = StructuralVariantFactory.build({
    filters: null,
    algorithms: null,
    length: null,
    evidence: null,
    cpx_intervals: null,
  })
  const tree = renderer.create(
    <BrowserRouter>
      <StructuralVariantAttributeList variant={variant} />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

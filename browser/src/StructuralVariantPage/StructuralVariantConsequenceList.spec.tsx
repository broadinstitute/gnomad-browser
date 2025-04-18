import React from 'react'
import { render } from '@testing-library/react'
import { expect, test, describe } from '@jest/globals'
import svFactory from '../__factories__/StructuralVariant'
import StructuralVariantConsequenceList from './StructuralVariantConsequenceList'
import { BrowserRouter } from 'react-router-dom'

describe('StructuralVariantConsequenceList', () => {
  test('should have no unexpected changes', () => {
    const consequences = [
      { consequence: 'lof', genes: null },
      { consequence: 'lof', genes: ['ABC123'] },
      { consequence: 'lof', genes: ['ABC123', 'QRSTUV'] },
      { consequence: 'copy_gain', genes: null },
      { consequence: 'copy_gain', genes: ['DEF234'] },
      { consequence: 'copy_gain', genes: ['DEF234', 'LLLLLL'] },
    ]
    const variant = svFactory.build({ consequences })
    const { asFragment } = render(
      <BrowserRouter>
        <StructuralVariantConsequenceList variant={variant} />
      </BrowserRouter>
    )
    expect(asFragment()).toMatchSnapshot()
  })
})

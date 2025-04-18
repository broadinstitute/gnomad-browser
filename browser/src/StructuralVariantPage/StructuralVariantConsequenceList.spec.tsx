import React from 'react'
import { render } from '@testing-library/react'
import { expect, test, describe } from '@jest/globals'
import svFactory from '../__factories__/StructuralVariant'
import StructuralVariantConsequenceList from './StructuralVariantConsequenceList'
import { BrowserRouter } from 'react-router-dom'
import { SVConsequence } from './StructuralVariantPage'

describe('StructuralVariantConsequenceList', () => {
  test('should have no unexpected changes', () => {
    const consequences: SVConsequence[] = [
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

  const consequenceTermsByCategory = {
    lof: ['lof'],
    dup_lof: ['dup_lof', 'partial_exon_dup'],
    copy_gain: ['copy_gain'],
    other: ['inv_span', 'dup_partial'],
  } as const

  const geneLists = [
    ['ABC', 'DEF', 'GHI', 'JKL'],
    ['MNO', 'PQR', 'STU', 'VWX', 'YZ1'],
  ]

  describe.each(Object.keys(consequenceTermsByCategory))(
    'expanding genes list for consequence in category %s with >3 genes',
    (category) => {
      const consequences = consequenceTermsByCategory[
        category as keyof typeof consequenceTermsByCategory
      ].map((consequenceTerm, i) => ({
        consequence: consequenceTerm,
        genes: geneLists[i],
      }))

      const variant = svFactory.build({ consequences })

      test('expands to show all genes', async () => {
        const { asFragment, getByText, queryAllByText, findAllByText } = render(
          <BrowserRouter>
            <StructuralVariantConsequenceList variant={variant} />
          </BrowserRouter>
        )
        expect(asFragment()).toMatchSnapshot()

        expect(queryAllByText('JKL')).toHaveLength(0)
        expect(queryAllByText('YZ1')).toHaveLength(0)
        const expandButton = getByText('and 1 more')
        expandButton.click()
        expect(await findAllByText('JKL')).toHaveLength(1)
        // ensure that if there is a second consequence in the category, we didn't expand that one
        expect(queryAllByText('YZ1')).toHaveLength(0)
      })
    }
  )
})

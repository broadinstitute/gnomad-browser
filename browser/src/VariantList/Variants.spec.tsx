import { Variant } from '../VariantPage/VariantPage'
import { v2VariantFactory } from '../__factories__/Variant'
import { getFirstIndexFromSearchText } from './Variants'
import { describe, it, expect } from '@jest/globals'

describe('getFirstIndexFromSearchText', () => {
  const mockVariantsSearched: Variant[] = []

  for (let i = 0; i < 50; i += 1) {
    mockVariantsSearched[i] = v2VariantFactory.build({ variant_id: `example${i}`, pos: i })
  }

  const mockVariantsTableColumns = [
    {
      key: 'variant_id',
      heading: 'Variant ID',
      description: 'Chromosome-position-reference-alternate',
      isRowHeader: true,
      minWidth: 150,
      grow: 1,
      compareFunction: () => 1,
      getSearchTerms: (variant: any) => [variant.variant_id].concat(variant.rsids || []),
      render: () => 1,
    },
  ]

  it('returns expected index when searchedVariants has length > 0 and firstIndex > visibleVariantWindow[0]', () => {
    const mockSearchFilter = {
      includeCategories: {
        lof: true,
        missense: true,
        synonymous: true,
        other: true,
      },
      includeFilteredVariants: false,
      includeSNVs: true,
      includeIndels: true,
      includeExomes: true,
      includeGenomes: true,
      includeContext: true,
      searchText: 'example35',
    }

    const mockVisibleVariantWindow = [0, 19]

    expect(
      getFirstIndexFromSearchText(
        mockSearchFilter,
        mockVariantsSearched,
        mockVariantsTableColumns,
        mockVisibleVariantWindow
      )
    ).toBe(45)
  })

  it('returns expected index when searchedVariants has length > 0 and firstIndex < visibleVariantWindow[0]', () => {
    const mockSearchFilter = {
      includeCategories: {
        lof: true,
        missense: true,
        synonymous: true,
        other: true,
      },
      includeFilteredVariants: false,
      includeSNVs: true,
      includeIndels: true,
      includeExomes: true,
      includeGenomes: true,
      includeContext: true,
      searchText: 'example16',
    }

    const mockVisibleVariantWindow = [20, 39]

    expect(
      getFirstIndexFromSearchText(
        mockSearchFilter,
        mockVariantsSearched,
        mockVariantsTableColumns,
        mockVisibleVariantWindow
      )
    ).toBe(6)
  })

  it('returns expected index when searchedVariants has length of 0, no results found', () => {
    const mockSearchFilter = {
      includeCategories: {
        lof: true,
        missense: true,
        synonymous: true,
        other: true,
      },
      includeFilteredVariants: false,
      includeSNVs: true,
      includeIndels: true,
      includeExomes: true,
      includeGenomes: true,
      includeContext: true,
      searchText: '1234',
    }

    const mockVisibleVariantWindow = [0, 19]

    expect(
      getFirstIndexFromSearchText(
        mockSearchFilter,
        mockVariantsSearched,
        mockVariantsTableColumns,
        mockVisibleVariantWindow
      )
    ).toBe(0)
  })
})

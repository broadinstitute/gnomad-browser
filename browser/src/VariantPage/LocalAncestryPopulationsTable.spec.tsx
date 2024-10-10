import React from 'react'
import { expect, test } from '@jest/globals'
import renderer from 'react-test-renderer'
import { LocalAncestryPopulation } from './VariantPage'

import LocalAncestryPopulationsTable from './LocalAncestryPopulationsTable'

describe('local ancestry populations table', () => {
  test(`has no unexpected changes`, () => {
    const localAncestryData: LocalAncestryPopulation[] = [
      { id: 'amr_african', ac: 1, an: 2 },
      { id: 'amr_amerindigenous', ac: 3, an: 4 },
      { id: 'amr_european', ac: 4, an: 5 },
      { id: 'afr_african', ac: 5, an: 6 },
      { id: 'afr_european', ac: 7, an: 8 },
    ]
    const tree = renderer.create(<LocalAncestryPopulationsTable populations={localAncestryData} />)
    expect(tree).toMatchSnapshot()
  })
})

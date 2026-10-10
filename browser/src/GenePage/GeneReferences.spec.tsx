import React from 'react'
import renderer from 'react-test-renderer'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import GeneReferences from './GeneReferences'

import geneFactory from '../__factories__/Gene'

describe('GeneReferences', () => {
  test.each(['BRCA2', 'PCSK9'])('links to the current GeneCards URL for %s', async (symbol) => {
    const testGene = geneFactory.build({ symbol })

    render(<GeneReferences gene={testGene} />)

    expect(screen.queryByRole('link', { name: 'GeneCards' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'and more' }))

    const geneCardsLink = screen.getByRole('link', { name: 'GeneCards' })
    expect(geneCardsLink.getAttribute('href')).toBe(`https://www.genecards.org/${symbol}`)
  })

  test('snapshot has no unexpected changes', () => {
    const testGene = geneFactory.build()

    const tree = renderer.create(<GeneReferences gene={testGene} />)

    expect(tree).toMatchSnapshot()
  })
})

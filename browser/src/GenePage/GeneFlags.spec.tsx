import React from 'react'
import { describe, expect, test } from '@jest/globals'
import renderer from 'react-test-renderer'

import GeneFlags from './GeneFlags'
import geneFactory from '../__factories__/Gene'

describe('GeneFlags', () => {
  test('does not render any flags with basic gene', () => {
    const testGene = geneFactory.build()

    const tree = renderer.create(<GeneFlags gene={testGene} />)

    expect(tree).toMatchSnapshot()
  })

  test('renders chip flag if present on gene', () => {
    const testGene = geneFactory.build({ flags: ['chip'] })

    const tree = renderer.create(<GeneFlags gene={testGene} />)

    expect(tree).toMatchSnapshot()
  })

  test('renders CMRG flag if one of 3 relevant genes', () => {
    const testGene = geneFactory.build({ symbol: 'CRYAA', reference_genome: 'GRCh38' })

    const tree = renderer.create(<GeneFlags gene={testGene} />)

    expect(tree).toMatchSnapshot()
  })

  test('renders VEP 115 warning for RNU4ATAC', () => {
    const testGene = geneFactory.build({ symbol: 'RNU4ATAC', reference_genome: 'GRCh38' })

    const tree = renderer.create(<GeneFlags gene={testGene} />)

    expect(tree).toMatchSnapshot()
  })
})

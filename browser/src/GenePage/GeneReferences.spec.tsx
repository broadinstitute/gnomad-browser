import React from 'react'
import renderer from 'react-test-renderer'
import { describe, expect, test } from '@jest/globals'

import GeneReferences from './GeneReferences'

import geneFactory from '../__factories__/Gene'

describe('GeneReferences', () => {
  test('snapshot has no unexpected changes', () => {
    const testGene = geneFactory.build()

    const tree = renderer.create(<GeneReferences gene={testGene} />)

    expect(tree).toMatchSnapshot()
  })
})

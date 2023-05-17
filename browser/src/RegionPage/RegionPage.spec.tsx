import React from 'react'
import { expect, test } from '@jest/globals'
import { createRenderer } from 'react-test-renderer/shallow'

import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { referenceGenome } from '../../../dataset-metadata/metadata'
import RegionPage from './RegionPage'

forAllDatasets('RegionPage with "%s" dataset', (datasetId) => {
  test('has no unexpected changes for a non-mitochondrial region', () => {
    const region = {
      reference_genome: referenceGenome(datasetId),
      chrom: '12',
      start: 345,
      stop: 456,
      genes: [],
      short_tandem_repeats: [],
      non_coding_constraints: [],
    }

    const renderer = createRenderer()
    renderer.render(<RegionPage datasetId={datasetId} region={region} />)
    expect(renderer.getRenderOutput()).toMatchSnapshot()
  })

  test('has no unexpected changes for a mitochondrial region', () => {
    const region = {
      reference_genome: referenceGenome(datasetId),
      chrom: 'M',
      start: 345,
      stop: 456,
      genes: [],
      short_tandem_repeats: [],
      non_coding_constraints: [],
    }

    const renderer = createRenderer()
    renderer.render(<RegionPage datasetId={datasetId} region={region} />)
    expect(renderer.getRenderOutput()).toMatchSnapshot()
  })
})

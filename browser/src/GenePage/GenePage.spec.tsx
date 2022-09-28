import { jest, describe, expect } from '@jest/globals'
import React from 'react'
import renderer from 'react-test-renderer'

import geneFactory from '../__factories__/Gene'
import GenePage from './GenePage'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { apiCallsMatching } from '../../../tests/__helpers__/apiCall'
import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { withDummyRouter } from '../../../tests/__helpers__/router'

forAllDatasets('GenePage with dataset "%s"', (datasetId) => {
  const fetch = jest.fn(() => {
    return new Promise(() => {})
  })

  beforeEach(() => {
    global.fetch = fetch as typeof global.fetch
  })

  test('has no unexpected changes', () => {
    const gene = geneFactory.build()
    const tree = renderer.create(
      withDummyRouter(<GenePage datasetId={datasetId} gene={gene} geneId={gene.gene_id} />)
    )
    expect(tree).toMatchSnapshot()
  })
})

describe.each([
  ['exac', true],
  ['gnomad_r2_1', true],
  ['gnomad_r2_1_controls', true],
  ['gnomad_r2_1_non_cancer', true],
  ['gnomad_r2_1_non_neuro', true],
  ['gnomad_r2_1_non_topmed', true],
  ['gnomad_r3', false],
  ['gnomad_r3_controls_and_biobanks', false],
  ['gnomad_r3_non_cancer', false],
  ['gnomad_r3_non_neuro', false],
  ['gnomad_r3_non_topmed', false],
  ['gnomad_r3_non_v2', false],
] as [DatasetId, boolean][])('GenePage with non-SV dataset "%s"', (datasetId, expectedResult) => {
  const fetch = jest.fn(() => {
    return new Promise(() => {})
  })

  beforeEach(() => {
    global.fetch = fetch as typeof global.fetch
  })

  test('queries the API for gene coverage with the correct parameters', async () => {
    const gene = geneFactory.build()
    renderer.create(
      withDummyRouter(<GenePage datasetId={datasetId} gene={gene} geneId={gene.gene_id} />)
    )

    const coverageQueries = apiCallsMatching(fetch, 'query GeneCoverage')
    expect(coverageQueries).toHaveLength(1)
    const [coverageQuery] = coverageQueries
    const exomeCoverageArg = coverageQuery.body.variables.includeExomeCoverage
    expect(exomeCoverageArg).toEqual(expectedResult)
  })
})

describe.each([
  'gnomad_sv_r2_1',
  'gnomad_sv_r2_1_controls',
  'gnomad_sv_r2_1_non_neuro',
] as DatasetId[])('GenePage with non-SV dataset "%s"', (datasetId) => {
  const fetch = jest.fn(() => {
    return new Promise(() => {})
  })

  beforeEach(() => {
    global.fetch = fetch as typeof global.fetch
  })

  test('queries the API for region coverage with the correct parameters', async () => {
    const gene = geneFactory.build()
    renderer.create(
      withDummyRouter(<GenePage datasetId={datasetId} gene={gene} geneId={gene.gene_id} />)
    )
    const coverageQueries = apiCallsMatching(fetch, 'query RegionCoverage')
    expect(coverageQueries).toHaveLength(1)
    const [coverageQuery] = coverageQueries
    const exomeCoverageArg = coverageQuery.body.variables.includeExomeCoverage
    expect(exomeCoverageArg).toEqual(false)
  })
})

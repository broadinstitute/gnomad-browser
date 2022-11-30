import { jest, describe, expect } from '@jest/globals'
import React from 'react'
import renderer from 'react-test-renderer'

import { Factory } from 'fishery'

import TranscriptPage, { Transcript } from './TranscriptPage'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { apiCallsMatching } from '../../../tests/__helpers__/apiCall'
import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { withDummyRouter } from '../../../tests/__helpers__/router'

import geneFactory from '../__factories__/Gene'

const transcriptFactory = Factory.define<Transcript>(({ params }) => {
  const { reference_genome = 'GRCh37', strand = '+' } = params

  return {
    transcript_id: 'dummy_transcript',
    transcript_version: '12.34.5',
    chrom: '13',
    reference_genome,
    start: 9,
    stop: 15,
    strand,
    exons: [],
    gene: geneFactory.build({ reference_genome, strand }),
  }
})

forAllDatasets('TranscriptPage with dataset "%s"', (datasetId) => {
  const fetch = jest.fn(() => {
    return new Promise(() => {})
  })

  beforeEach(() => {
    global.fetch = fetch as typeof global.fetch
  })

  test('has no unexpected changes', () => {
    const transcript = transcriptFactory.build()
    const tree = renderer.create(
      withDummyRouter(<TranscriptPage datasetId={datasetId} transcript={transcript} />)
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
  ['gnomad_sv_r2_1', true],
  ['gnomad_sv_r2_1_controls', true],
  ['gnomad_sv_r2_1_non_neuro', true],
] as [DatasetId, boolean][])('TranscriptPage with dataset "%s"', (datasetId, expectedResult) => {
  const fetch = jest.fn(() => {
    return new Promise(() => {})
  })

  beforeEach(() => {
    global.fetch = fetch as typeof global.fetch
  })

  test('queries the API with the correct parameters', async () => {
    const transcript = transcriptFactory.build()
    renderer.create(
      withDummyRouter(<TranscriptPage datasetId={datasetId} transcript={transcript} />)
    )
    const coverageQueries = apiCallsMatching(fetch, 'query TranscriptCoverage')
    expect(coverageQueries).toHaveLength(1)
    const [coverageQuery] = coverageQueries
    const exomeCoverageArg = coverageQuery.body.variables.includeExomeCoverage
    expect(exomeCoverageArg).toEqual(expectedResult)
  })
})

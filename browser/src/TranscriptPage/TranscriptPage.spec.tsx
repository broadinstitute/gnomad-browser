import { jest, describe, expect } from '@jest/globals'
import React from 'react'
import renderer from 'react-test-renderer'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import TranscriptPage from './TranscriptPage'
import { apiCallsMatching } from '../../../tests/__helpers__/apiCall'
import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { BrowserRouter } from 'react-router-dom'

import transcriptFactory from '../__factories__/Transcript'

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
      <BrowserRouter>
        <TranscriptPage datasetId={datasetId} transcript={transcript} />
      </BrowserRouter>
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
      <BrowserRouter>
        <TranscriptPage datasetId={datasetId} transcript={transcript} />
      </BrowserRouter>
    )
    const coverageQueries = apiCallsMatching(fetch, 'query TranscriptCoverage')
    expect(coverageQueries).toHaveLength(1)
    const [coverageQuery] = coverageQueries
    const exomeCoverageArg = coverageQuery.body.variables.includeExomeCoverage
    expect(exomeCoverageArg).toEqual(expectedResult)
  })
})

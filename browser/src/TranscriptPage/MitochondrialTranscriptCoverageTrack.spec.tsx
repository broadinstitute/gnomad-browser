import React from 'react'
import renderer from 'react-test-renderer'
import { createRenderer } from 'react-test-renderer/shallow'

import { jest, describe, expect, test } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'

import MitochondrialTranscriptCoverageTrack from './MitochondrialTranscriptCoverageTrack'

import { DatasetId, allDatasetIds } from '@gnomad/dataset-metadata/metadata'

jest.mock('../Query', () => {
  const originalModule = jest.requireActual('../Query')

  return {
    __esModule: true,
    ...(originalModule as object),
    default: jest.fn(),
    BaseQuery: jest.fn(),
  }
})

const { resetMockApiCalls, resetMockApiResponses, simulateApiResponse, setMockApiResponses } =
  mockQueries()

beforeEach(() => {
  Query.mockImplementation(
    jest.fn(({ query, children, operationName, variables }) =>
      simulateApiResponse('Query', query, children, operationName, variables)
    )
  )
  ;(BaseQuery as any).mockImplementation(
    jest.fn(({ query, children, operationName, variables }) =>
      simulateApiResponse('BaseQuery', query, children, operationName, variables)
    )
  )
})

afterEach(() => {
  resetMockApiCalls()
  resetMockApiResponses()
})

const datasetsWithoutCoverage: DatasetId[] = [
  'exac',
  'gnomad_r2_1',
  'gnomad_r2_1_controls',
  'gnomad_r2_1_non_neuro',
  'gnomad_r2_1_non_cancer',
  'gnomad_r2_1_non_topmed',
]
const datasetsWithCoverage = allDatasetIds.filter(
  (datasetId) => !datasetsWithoutCoverage.includes(datasetId)
)

describe.each(datasetsWithoutCoverage)(
  'MitochondrialTranscriptCoverageTrack with dataset %s',
  (datasetId) => {
    test('has no unexpected changes', () => {
      const tree = renderer.create(
        <MitochondrialTranscriptCoverageTrack
          datasetId={datasetId}
          transcriptId="dummy-transcript"
        />
      )
      expect(tree).toMatchSnapshot()
    })
  }
)

describe.each(datasetsWithCoverage)(
  'MitochondrialTranscriptCoverageTrack with dataset %s',
  (datasetId) => {
    test('queries with proper parameters', () => {
      setMockApiResponses({
        MitochondrialCoverageInRegion: () => ({}),
      })

      const shallowRenderer = createRenderer()
      shallowRenderer.render(
        <MitochondrialTranscriptCoverageTrack
          datasetId={datasetId}
          transcriptId="dummy-transcript"
        />
      )

      expect(shallowRenderer.getRenderOutput()).toMatchSnapshot()
    })
  }
)

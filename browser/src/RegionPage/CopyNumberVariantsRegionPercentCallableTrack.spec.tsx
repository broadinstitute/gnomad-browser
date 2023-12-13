import React from 'react'
import { createRenderer } from 'react-test-renderer/shallow'

import { jest, describe, expect, test } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'

import CopyNumberVariantsRegionPercentCallableTrack from './CopyNumberVariantsRegionPercentCallableTrack'

import { allDatasetIds, hasCopyNumberVariantCoverage } from '@gnomad/dataset-metadata/metadata'

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

const datasetsWithCoverage = allDatasetIds.filter((datasetId) =>
  hasCopyNumberVariantCoverage(datasetId)
)

describe.each(datasetsWithCoverage)(
  'CopyNumberVariantsRegionPercentCallableTrack with dataset %s',
  (datasetId) => {
    test('queries with appropriate params', () => {
      setMockApiResponses({
        CopyNumberVariantsRegionPercentCallableTrack: () => ({
          region: {
            cnv_track_callable_coverage: [],
          },
        }),
      })

      const shallowRenderer = createRenderer()
      shallowRenderer.render(
        <CopyNumberVariantsRegionPercentCallableTrack
          datasetId={datasetId}
          chrom={1}
          start={123}
          stop={456}
        />
      )

      expect(shallowRenderer.getRenderOutput()).toMatchSnapshot()
    })
  }
)

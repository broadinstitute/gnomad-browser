import React from 'react'
import { createRenderer } from 'react-test-renderer/shallow'

import { jest, describe, expect, test } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'

import CopyNumberVariantsGenePercentCallableTrack from './CopyNumberVariantsGenePercentCallableTrack'

import { allDatasetIds, hasCopyNumberVariantCoverage } from '@gnomad/dataset-metadata/metadata'
import geneFactory from '../__factories__/Gene'

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
  'CopyNumberVariantsGenePercentCallableTrack with dataset %s',
  (datasetId) => {
    test('queries with appropriate params', () => {
        const gene = geneFactory.build()
        setMockApiResponses({
        CopyNumberVariantsGenePercentCallableTrack: () => ({
          gene: {
            cnv_track_callable_coverage: [],
          },
        }),
      })

      const shallowRenderer = createRenderer()
      shallowRenderer.render(
        <CopyNumberVariantsGenePercentCallableTrack
          datasetId={datasetId}
          geneId={gene.gene_id}
        />
      )

      expect(shallowRenderer.getRenderOutput()).toMatchSnapshot()
    })
  }
)

import React from 'react'
import renderer from 'react-test-renderer'

import { jest, expect, test } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'

import MitochondrialVariantsInTranscript from './MitochondrialVariantsInTranscript'

import transcriptFactory from '../__factories__/Transcript'
import { BrowserRouter } from 'react-router-dom'
import { forAllDatasets } from '../../../tests/__helpers__/datasets'

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

forAllDatasets('MitochondrialVariantsInTranscript with dataset %s', (datasetId) => {
  test('has no unexpected changes', () => {
    setMockApiResponses({
      MitochondrialVariantsInTranscript: () => ({
        meta: {
          clinvar_release_date: '2023-12-31',
        },
        transcript: {
          clinvar_variants: [],
          mitochondrial_variants: [],
        },
      }),
    })
    const tree = renderer.create(
      <BrowserRouter>
        <MitochondrialVariantsInTranscript
          datasetId={datasetId}
          transcript={transcriptFactory.build()}
        />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})

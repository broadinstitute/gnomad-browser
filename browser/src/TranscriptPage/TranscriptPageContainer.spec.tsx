import React from 'react'
import renderer from 'react-test-renderer'
import { jest, expect, test } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'
import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { BrowserRouter } from 'react-router-dom'

import transcriptFactory from '../__factories__/Transcript'
import TranscriptPageContainer from './TranscriptPageContainer'

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

forAllDatasets('TranscriptPageContainer with dataset %s', (datasetId) => {
  test('has no unexpected changes', () => {
    const transcript = transcriptFactory.build()

    setMockApiResponses({
      Transcript: () => ({
        transcript,
      }),
      VariantsInTranscript: () => ({
        meta: { clinvar_release_date: '2023-12-01' },
        transcript: {
          clinvar_variants: [],
          variants: [],
        },
      }),
      TranscriptCoverage: () => ({
        transcript: {
          coverage: {},
        },
      }),
    })

    const tree = renderer.create(
      <BrowserRouter>
        <TranscriptPageContainer datasetId={datasetId} transcriptId={transcript.transcript_id} />
      </BrowserRouter>
    )

    expect(tree).toMatchSnapshot()
  })
})

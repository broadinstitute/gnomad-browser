import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'

import transcriptFactory from '../__factories__/Transcript'

import TranscriptPage from './TranscriptPage'

jest.mock('../Query', () => {
  const originalModule = jest.requireActual('../Query')

  return {
    __esModule: true,
    ...(originalModule as object),
    default: jest.fn(),
    BaseQuery: jest.fn(),
  }
})

jest.mock('./TranscriptCoverageTrack', () => ({
  __esModule: true,
  default: () => {
    throw new Error('Forced render-time error in TranscriptCoverageTrack for regression test')
  },
}))

const { resetMockApiCalls, resetMockApiResponses, simulateApiResponse, setMockApiResponses } =
  mockQueries()

beforeEach(() => {
  Query.mockImplementation(
    jest.fn(({ children, operationName, variables, query }) =>
      simulateApiResponse('Query', query, children, operationName, variables)
    )
  )
  ;(BaseQuery as any).mockImplementation(
    jest.fn(({ children, operationName, variables, query }) =>
      simulateApiResponse('BaseQuery', query, children, operationName, variables)
    )
  )
})

afterEach(() => {
  resetMockApiCalls()
  resetMockApiResponses()
})

const withSilencedConsoleError = (fn: () => void) => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    fn()
  } finally {
    consoleErrorSpy.mockRestore()
  }
}

describe('TranscriptPage section render error isolation', () => {
  test('a render-time throw in one section leaves sibling sections rendered', () => {
    const transcript = transcriptFactory.build()
    setMockApiResponses({
      VariantsInTranscript: () => ({
        meta: { clinvar_release_date: '2022-10-31' },
        transcript: { variants: [], clinvar_variants: [] },
      }),
    })

    withSilencedConsoleError(() => {
      render(
        <MemoryRouter>
          <TranscriptPage datasetId="gnomad_r4" transcript={transcript} />
        </MemoryRouter>
      )
    })

    expect(screen.getByText(/Something went wrong rendering Transcript coverage/)).toBeTruthy()
    expect(screen.queryByText('Something Went Wrong')).toBeNull()
    expect(
      screen.getByText(`Transcript: ${transcript.transcript_id}.${transcript.transcript_version}`)
    ).toBeTruthy()
  })
})

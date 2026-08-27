import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { mockQueries } from '../../../tests/__helpers__/queries'
import { referenceGenome } from '../../../dataset-metadata/metadata'
import Query, { BaseQuery } from '../Query'

import RegionPage from './RegionPage'

jest.mock('../Query', () => {
  const originalModule = jest.requireActual('../Query')

  return {
    __esModule: true,
    ...(originalModule as object),
    default: jest.fn(),
    BaseQuery: jest.fn(),
  }
})

jest.mock('./RegionCoverageTrack', () => ({
  __esModule: true,
  default: () => {
    throw new Error('Forced render-time error in RegionCoverageTrack for regression test')
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

describe('RegionPage section render error isolation', () => {
  test('a render-time throw in one section leaves sibling sections rendered', () => {
    const datasetId = 'gnomad_r4'
    const region = {
      reference_genome: referenceGenome(datasetId),
      chrom: '12',
      start: 345,
      stop: 456,
      genes: [],
      short_tandem_repeats: [],
      non_coding_constraints: [],
    }

    setMockApiResponses({
      VariantInRegion: () => ({
        meta: { clinvar_release_date: '2022-10-31' },
        region: { variants: [], clinvar_variants: [] },
      }),
    })

    withSilencedConsoleError(() => {
      render(
        <MemoryRouter>
          <RegionPage datasetId={datasetId} region={region} />
        </MemoryRouter>
      )
    })

    expect(screen.getByText(/Something went wrong rendering Region coverage/)).toBeTruthy()
    expect(screen.queryByText('Something Went Wrong')).toBeNull()
    expect(screen.getByText(`${region.chrom}-${region.start}-${region.stop}`)).toBeTruthy()
  })
})

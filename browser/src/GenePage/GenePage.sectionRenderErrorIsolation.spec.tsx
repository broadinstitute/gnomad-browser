import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'

import geneFactory from '../__factories__/Gene'

import GenePage from './GenePage'

jest.mock('../Query', () => {
  const originalModule = jest.requireActual('../Query')

  return {
    __esModule: true,
    ...(originalModule as object),
    default: jest.fn(),
    BaseQuery: jest.fn(),
  }
})

jest.mock('./GeneCoverageTrack', () => ({
  __esModule: true,
  default: () => {
    throw new Error('Forced render-time error in GeneCoverageTrack for regression test')
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

describe('GenePage section render error isolation', () => {
  test('a render-time throw in one section leaves sibling sections rendered', () => {
    const gene = geneFactory.build()
    setMockApiResponses({
      VariantsInGene: () => ({
        gene,
        meta: { clinvar_release_date: '2022-10-31' },
      }),
    })

    withSilencedConsoleError(() => {
      render(
        <MemoryRouter>
          <GenePage datasetId="gnomad_r4" gene={gene} geneId={gene.gene_id} />
        </MemoryRouter>
      )
    })

    expect(screen.getByText(/Something went wrong rendering Gene coverage/)).toBeTruthy()
    expect(screen.queryByText('Something Went Wrong')).toBeNull()
    expect(screen.getByText('Constraint')).toBeTruthy()
  })
})

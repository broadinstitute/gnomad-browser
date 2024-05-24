import React from 'react'
import renderer from 'react-test-renderer'

import { jest, expect, test } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'

import 'jest-styled-components'

import { readsApiOutputFactory, exomeReadApiOutputFactory } from '../__factories__/ReadData'
import ReadDataContainer from './ReadData'
import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { BrowserRouter } from 'react-router-dom'

const variantId = '123-45-A-G'

jest.mock('../Query', () => {
  const originalModule = jest.requireActual('../Query')

  return {
    __esModule: true,
    ...(originalModule as object),
    default: jest.fn(),
    BaseQuery: jest.fn(),
  }
})

jest.mock('../../../graphql-api/src/cache', () => ({
  withCache: (wrappedFunction: any) => wrappedFunction,
}))

const {
  resetMockApiCalls,
  resetMockApiResponses,
  simulateApiResponse,
  setMockApiResponses,
  mockApiCalls,
} = mockQueries()

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('alwaysLoadReadsDataOnVariantPage', 'true')

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

jest.mock('./IGVBrowser', () => () => null)

forAllDatasets('ReadData with "%s" dataset selected', (datasetId) => {
  test('has no unexpected changes with exome data present', () => {
    setMockApiResponses({
      ReadData: () =>
        readsApiOutputFactory
          .params({
            variant_0: { exome: exomeReadApiOutputFactory.buildList(1) },
          })
          .build(),
    })

    const tree = renderer.create(
      <BrowserRouter>
        <ReadDataContainer datasetId={datasetId} variantIds={[variantId]} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })

  test('has no unexpected changes with exome and genome data both missing', () => {
    setMockApiResponses({
      ReadData: () =>
        readsApiOutputFactory
          .params({
            variant_0: { exome: null, genome: null },
          })
          .build(),
    })

    const tree = renderer.create(
      <BrowserRouter>
        <ReadDataContainer datasetId={datasetId} variantIds={[variantId]} />
      </BrowserRouter>
    )

    expect(tree).toMatchSnapshot()
  })

  test('queries against the correct dataset', () => {
    setMockApiResponses({
      ReadData: () =>
        readsApiOutputFactory
          .params({
            variant_0: { exome: exomeReadApiOutputFactory.buildList(1) },
          })
          .build(),
    })

    renderer.create(
      <BrowserRouter>
        <ReadDataContainer datasetId={datasetId} variantIds={[variantId]} />
      </BrowserRouter>
    )

    const { query } = mockApiCalls()[0]
    expect(query).toMatchSnapshot()
  })
})

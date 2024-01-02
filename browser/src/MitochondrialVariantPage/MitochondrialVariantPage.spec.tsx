import React from 'react'
import renderer from 'react-test-renderer'
import { jest, expect, test } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'

import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { BrowserRouter } from 'react-router-dom'
import mitochondrialVariantFactory from '../__factories__/MitochondrialVariant'

import MitochondrialVariantPage from './MitochondrialVariantPage'

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

forAllDatasets('MitochondrialVariantPage with dataset %s', (datasetId) => {
  test('has no unexpected changes', () => {
    const variant = mitochondrialVariantFactory.build()
    const { clinvar, ...rest } = variant
    const apiResponse = {
      mitochondrial_variant: rest,
      clinvar_variant: clinvar,
      meta: { clinvar_release_date: '2022-10-31' },
    }
    setMockApiResponses({
      MitochondrialVariant: () => apiResponse,
    })
    const tree = renderer.create(
      <BrowserRouter>
        <MitochondrialVariantPage variantId={variant.variant_id} datasetId={datasetId} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})

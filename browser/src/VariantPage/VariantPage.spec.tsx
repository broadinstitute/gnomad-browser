import React from 'react'
import { jest, expect, test } from '@jest/globals'
import renderer from 'react-test-renderer'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'
import { forDatasetsMatching } from '../../../tests/__helpers__/datasets'
import VariantPage from './VariantPage'
import { v2VariantFactory, v3VariantFactory } from '../__factories__/Variant'
import { BrowserRouter } from 'react-router-dom'

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
  // The semicolon is due to a quirk of JS/TS parsing--try taking it out and
  // you'll see what happens.
  // Also, it's not clear why we have to cast BaseQuery here but not Query
  // above.
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

forDatasetsMatching(/gnomad_r3/, 'VariantPage with the dataset "%s"', (datasetId) => {
  test('has no unexpected changes', () => {
    const variant = v3VariantFactory.build()

    setMockApiResponses({
      GnomadVariant: () => ({ variant }),
      ReadData: () => ({
        variant_0: { exome: null, genome: [] },
      }),
    })
    const tree = renderer.create(
      <BrowserRouter>
        <VariantPage datasetId={datasetId} variantId={variant.variant_id} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})

forDatasetsMatching(/gnomad_r2/, 'VariantPage with the dataset %s', (datasetId) => {
  test('has no unexpected changes', () => {
    const variant = v2VariantFactory.build()

    setMockApiResponses({
      GnomadVariant: () => ({ variant }),
      ReadData: () => ({
        variant_0: { exome: null, genome: [] },
      }),
    })
    const tree = renderer.create(
      <BrowserRouter>
        <VariantPage datasetId={datasetId} variantId={variant.variant_id} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})

describe('VariantPage with the dataset exac', () => {
  test('has no unexpected changes', () => {
    const variant = v2VariantFactory.build()

    setMockApiResponses({
      GnomadVariant: () => ({ variant }),
      ReadData: () => ({
        variant_0: { exome: null, genome: [] },
      }),
    })
    const tree = renderer.create(
      <BrowserRouter>
        <VariantPage datasetId="exac" variantId={variant.variant_id} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})

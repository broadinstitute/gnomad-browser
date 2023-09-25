import React from 'react'
import renderer from 'react-test-renderer'
import { jest, expect, test, describe } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'
import { forDatasetsMatching } from '../../../tests/__helpers__/datasets'
import CopyNumberVariantPage from './CopyNumberVariantPage'
import cnvFactory from '../__factories__/CopyNumberVariant'
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

forDatasetsMatching(/gnomad_cnv_r4/, 'CopyNumberVariantPage with dataset %s', (datasetId) => {
  describe.each(['DEL', 'DUP'])('with variant of type %s', (variantType: string) => {
    test('has no unexpected changes', () => {
      const variant = cnvFactory.build({ type: variantType })
      setMockApiResponses({
        CopyNumberVariant: () => ({
          copy_number_variant: variant,
        }),
      })
      const tree = renderer.create(
        <BrowserRouter>
          <CopyNumberVariantPage datasetId={datasetId} variantId={variant.variant_id} />
        </BrowserRouter>
      )
      expect(tree).toMatchSnapshot()
    })
  })
})

import React from 'react'
import renderer from 'react-test-renderer'
import { jest, expect, test, describe } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'
import { forDatasetsMatching } from '../../../tests/__helpers__/datasets'
import StructuralVariantPage from './StructuralVariantPage'
import svFactory from '../__factories__/StructuralVariant'
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

forDatasetsMatching(/gnomad_sv_r2/, 'StructuralVariantPage with dataset %s', (datasetId) => {
  describe.each(['DEL', 'DUP', 'MCNV', 'INS', 'INV'])(
    'with non-interchromosomal variant of type %s',
    (variantType: string) => {
      test('has no unexpected changes', () => {
        const variant = svFactory.build({ type: variantType })
        setMockApiResponses({
          StructuralVariant: () => ({
            structural_variant: variant,
          }),
        })
        const tree = renderer.create(
          <BrowserRouter>
            <StructuralVariantPage datasetId={datasetId} variantId={variant.variant_id} />
          </BrowserRouter>
        )
        expect(tree).toMatchSnapshot()
      })
    }
  )

  describe.each(['BND', 'CTX'])(
    'with interchromosomal variant of type %s',
    (variantType: string) => {
      test('has no unexpected changes', () => {
        const variant = svFactory.build({
          type: variantType,
          chrom2: '22',
          pos2: 876,
        })
        setMockApiResponses({
          StructuralVariant: () => ({
            structural_variant: variant,
          }),
        })
        const tree = renderer.create(
          <BrowserRouter>
            <StructuralVariantPage datasetId={datasetId} variantId={variant.variant_id} />
          </BrowserRouter>
        )
        expect(tree).toMatchSnapshot()
      })
    }
  )

  describe('with a complex variant', () => {
    test('has no unexpected changes', () => {
      const variant = svFactory.build({
        type: 'CPX',
        cpx_type: 'CCR',
      })
      setMockApiResponses({
        StructuralVariant: () => ({
          structural_variant: variant,
        }),
      })
      const tree = renderer.create(
        <BrowserRouter>
          <StructuralVariantPage datasetId={datasetId} variantId={variant.variant_id} />
        </BrowserRouter>
      )
      expect(tree).toMatchSnapshot()
    })
  })
})

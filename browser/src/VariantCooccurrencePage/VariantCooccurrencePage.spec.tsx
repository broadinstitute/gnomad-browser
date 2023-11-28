import React from 'react'
import { describe, test, expect } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'
import renderer from 'react-test-renderer'
import { forDatasetsNotMatching } from '../../../tests/__helpers__/datasets'
import { withDummyRouter } from '../../../tests/__helpers__/router'

import VariantCoocurrencePage from './VariantCooccurrencePage'
import { createBrowserHistory } from 'history'

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

describe('VariantCoocurrencePage', () => {
  describe('for gnomad_r2_1', () => {
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

    test('has no unexpected changes', () => {
      const variantId1 = '1-234-A-C'
      const variantId2 = '1-987-C-A'
      const apiResponse = {
        variant_cooccurrence: {
          variant_ids: [variantId1, variantId2],
          genotype_counts: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          haplotype_counts: [10, 11, 12, 13],
          p_compound_heterozygous: 0.123, // TK calculate in real value

          populations: [
            {
              id: 'afr',
              genotype_counts: [14, 15, 16, 17, 18, 19, 20, 21, 22],
              haplotype_counts: [23, 24, 25, 26],
              p_compound_heterozygous: 0.123, // TK calc
            },
            {
              id: 'amr',
              genotype_counts: [27, 28, 29, 30, 31, 32, 33, 34, 35],
              haplotype_counts: [36, 37, 38, 39],
              p_compound_heterozygous: 0.123, // TK calc
            },
          ],
        },
        variant1: {
          exome: { ac: 999, an: 101010 },
          genome: { ac: 555, an: 5555 },
          multi_nucleotide_variants: null,
          transcript_consequences: [
            {
              gene_id: 'ENSG00000169174',
              gene_version: '9',
              gene_symbol: 'PCSK9',
              hgvs: 'p.Arg46Leu',
              hgvsc: 'c.137G>T',
              hgvsp: 'p.Arg46Leu',
              is_canonical: true,
              is_mane_select: null,
              is_mane_select_version: null,
              lof: null,
              lof_flags: null,
              lof_filter: null,
              major_consequence: 'missense_variant',
              polyphen_prediction: 'benign',
              sift_prediction: 'tolerated',
              transcript_id: 'ENST00000302118',
              transcript_version: '5',
            },
          ],
        },
        variant2: {
          exome: { ac: 456, an: 654 },
          genome: { ac: 678, an: 876 },
          multi_nucleotide_variants: null,
          transcript_consequences: [],
        },
      }

      setMockApiResponses({
        VariantCooccurrence: () => apiResponse,
      })

      const history = createBrowserHistory()
      history.location.search = `?variant=${variantId1}&variant=${variantId2}`

      const tree = renderer.create(
        withDummyRouter(<VariantCoocurrencePage datasetId="gnomad_r2_1" />, history)
      )
      expect(tree).toMatchSnapshot()
    })
  })

  forDatasetsNotMatching(/r2_1$/, 'for non-2.1 dataset %s', (datasetId) => {
    test('has no unexpected changes', () => {
      const tree = renderer.create(
        withDummyRouter(<VariantCoocurrencePage datasetId={datasetId} />)
      )
      expect(tree).toMatchSnapshot()
    })
  })
})

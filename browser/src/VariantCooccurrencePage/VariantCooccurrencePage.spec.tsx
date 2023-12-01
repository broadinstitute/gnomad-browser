import React from 'react'
import { describe, test, expect } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'
import renderer from 'react-test-renderer'
import { render } from '@testing-library/react'
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

const variantId1 = '1-234-A-C'
const variantId2 = '1-987-C-A'
const baseApiResponse = {
  variant_cooccurrence: {
    variant_ids: [variantId1, variantId2],
    genotype_counts: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    haplotype_counts: [10, 11, 12, 13],
    p_compound_heterozygous: 0.123, // TK calculate in real value

    populations: [],
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

const cisThreshold = 0.02
const transThreshold = 0.55
const epsilon = 0.0000001

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
      setMockApiResponses({
        VariantCooccurrence: () => baseApiResponse,
      })

      const history = createBrowserHistory()
      history.location.search = `?variant=${variantId1}&variant=${variantId2}`

      const tree = renderer.create(
        withDummyRouter(<VariantCoocurrencePage datasetId="gnomad_r2_1" />, history)
      )
      expect(tree).toMatchSnapshot()
    })

    const cisResponse = {
      ...baseApiResponse,
      variant_cooccurrence: {
        ...baseApiResponse.variant_cooccurrence,
        p_compound_heterozygous: cisThreshold - epsilon,
      },
    }

    const lowAmbiguousResponse = {
      ...baseApiResponse,
      variant_cooccurrence: {
        ...baseApiResponse.variant_cooccurrence,
        p_compound_heterozygous: cisThreshold,
      },
    }

    const highAmbiguousResponse = {
      ...baseApiResponse,
      variant_cooccurrence: {
        ...baseApiResponse.variant_cooccurrence,
        p_compound_heterozygous: transThreshold,
      },
    }

    const transResponse = {
      ...baseApiResponse,
      variant_cooccurrence: {
        ...baseApiResponse.variant_cooccurrence,
        p_compound_heterozygous: transThreshold + epsilon,
      },
    }

    const missingFirstVariantResponse = {
      ...baseApiResponse,
      variant_cooccurrence: {
        ...baseApiResponse.variant_cooccurrence,
        genotype_counts: [1, 2, 3, 0, 0, 0, 0, 0, 0],
        p_compound_heterozygous: null,
      },
    }

    const missingSecondVariantResponse = {
      ...baseApiResponse,
      variant_cooccurrence: {
        ...baseApiResponse.variant_cooccurrence,
        genotype_counts: [1, 0, 0, 2, 0, 0, 3, 0, 0],
        p_compound_heterozygous: null,
      },
    }

    const missingBothVariantsResponse = {
      ...baseApiResponse,
      variant_cooccurrence: {
        ...baseApiResponse.variant_cooccurrence,
        genotype_counts: [10000, 0, 0, 0, 0, 0, 0, 0, 0],
        p_compound_heterozygous: null,
      },
    }

    const cisSingletonResponse = {
      ...baseApiResponse,
      variant_cooccurrence: {
        ...baseApiResponse.variant_cooccurrence,
        genotype_counts: [1000, 0, 0, 0, 1, 0, 0, 0, 0],
        p_compound_heterozygous: cisThreshold - epsilon,
      },
    }

    const cisGenotypeCountsText = /these variants are likely found on the same haplotype/
    const ambiguousGenotypeCountsText =
      /The co-occurrence pattern for these variants doesn’t allow us to give a robust assessment/
    const transGenotypeCountsText =
      /these variants are likely found on different haplotypes in most/
    const missingOneVariantGenotypeCountsText = /One of these variants is not observed/
    const missingBothVariantsGenotypeCountsText = /These variants are not observed/

    const cisTableDescription = 'Same haplotype'
    const ambiguousTableDescription = 'Uncertain'
    const transTableDescription = 'Different haplotypes'
    const noCalculationTableDescription = 'No prediction'

    const cases: [string, object, RegExp | null, string][] = [
      ['cis p_chet', cisResponse, cisGenotypeCountsText, cisTableDescription],
      [
        'low borderline p_chet',
        lowAmbiguousResponse,
        ambiguousGenotypeCountsText,
        ambiguousTableDescription,
      ],
      [
        'high borderline p_chet',
        highAmbiguousResponse,
        ambiguousGenotypeCountsText,
        ambiguousTableDescription,
      ],
      ['trans p_chet', transResponse, transGenotypeCountsText, transTableDescription],
      [
        'only the first of the two variants',
        missingFirstVariantResponse,
        missingOneVariantGenotypeCountsText,
        noCalculationTableDescription,
      ],
      [
        'only the second of the two variants',
        missingSecondVariantResponse,
        missingOneVariantGenotypeCountsText,
        noCalculationTableDescription,
      ],
      [
        'neither variant',
        missingBothVariantsResponse,
        missingBothVariantsGenotypeCountsText,
        noCalculationTableDescription,
      ],
      ['a cis singleton', cisSingletonResponse, null, noCalculationTableDescription],
    ]

    cases.forEach(([description, response, genotypeCountsText, tableDescription]) => {
      describe(`when the main population has ${description}`, () => {
        test('has an appropriate description in the summary table and under the genotype counts', async () => {
          const history = createBrowserHistory()
          history.location.search = `?variant=${variantId1}&variant=${variantId2}`

          setMockApiResponses({
            VariantCooccurrence: () => response,
          })
          const tree = render(
            withDummyRouter(<VariantCoocurrencePage datasetId="gnomad_r2_1" />, history)
          )
          expect(tree).toMatchSnapshot()
          if (genotypeCountsText) {
            await tree.findByText(genotypeCountsText)
          }
          await tree.findByText(tableDescription)
        })
      })
    })

    test('omits haplotype table for cis singleton', async () => {
      const history = createBrowserHistory()
      history.location.search = `?variant=${variantId1}&variant=${variantId2}`

      setMockApiResponses({
        VariantCooccurrence: () => cisSingletonResponse,
      })
      const tree = render(
        withDummyRouter(<VariantCoocurrencePage datasetId="gnomad_r2_1" />, history)
      )

      const tables = tree.queryAllByText(/Haplotype Counts/)
      expect(tables).toEqual([])
    })

    test('has an accuracy warning for variants in cis with a large distance between them', async () => {
      const distantCisResponse = {
        ...cisResponse,
        variant_cooccurrence: {
          ...cisResponse.variant_cooccurrence,
          variant_ids: ['1-1-A-C', '1-50002-A-C'],
        },
      }
      const history = createBrowserHistory()
      history.location.search = '?variant=$1-1-A-C&variant=1-50002-A-C'

      setMockApiResponses({
        VariantCooccurrence: () => distantCisResponse,
      })
      const tree = render(
        withDummyRouter(<VariantCoocurrencePage datasetId="gnomad_r2_1" />, history)
      )
      expect(tree).toMatchSnapshot()
      await tree.findByText(/Accuracy is lower .+ away from each other./)
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

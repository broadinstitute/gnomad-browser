import React from 'react'
import renderer from 'react-test-renderer'
import { jest, describe, expect } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import geneFactory from '../__factories__/Gene'
import GenePage from './GenePage'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { forDatasetsMatching, forDatasetsNotMatching } from '../../../tests/__helpers__/datasets'
import { withDummyRouter } from '../../../tests/__helpers__/router'

jest.mock('../Query', () => {
  const originalModule = jest.requireActual('../Query')

  return {
    __esModule: true,
    ...(originalModule as Object),
    default: jest.fn(),
    BaseQuery: jest.fn(),
  }
})

const {
  resetMockApiCalls,
  resetMockApiResponses,
  simulateApiResponse,
  setMockApiResponses,
  mockApiCalls,
} = mockQueries()

beforeEach(() => {
  Query.mockImplementation(
    jest.fn(({ children, operationName, variables }) =>
      simulateApiResponse('Query', children, operationName, variables)
    )
  )
  ;(BaseQuery as any).mockImplementation(
    jest.fn(({ children, operationName, variables }) =>
      simulateApiResponse('BaseQuery', children, operationName, variables)
    )
  )
})

afterEach(() => {
  resetMockApiCalls()
  resetMockApiResponses()
})

const svRegexp = /_sv/

forDatasetsNotMatching(svRegexp, 'GenePage with non-SV dataset "%s"', (datasetId) => {
  const gene = geneFactory.build()
  beforeEach(() =>
    setMockApiResponses({
      VariantsInGene: () => ({
        gene,
        meta: { clinvar_release_date: '2022-10-31' },
      }),
      GeneCoverage: () => ({
        gene: {
          coverage: {},
        },
      }),
    })
  )

  test('has no unexpected changes', () => {
    const tree = renderer.create(
      withDummyRouter(<GenePage datasetId={datasetId} gene={gene} geneId={gene.gene_id} />)
    )
    expect(tree).toMatchSnapshot()
  })

  test('selector allows toggling between constrant and co-occurrence tables', async () => {
    const constraintModeMatcher = /Constraint not (yet )?available/
    const cooccurrenceModeMatcher = /Individuals with/

    render(withDummyRouter(<GenePage datasetId={datasetId} gene={gene} geneId={gene.gene_id} />))
    const constraintButton = screen.getByText('Constraint')
    const cooccurrenceButton = screen.getByText('Variant co-occurrence')

    expect(screen.queryByText(constraintModeMatcher)).not.toBeNull()
    expect(screen.queryAllByText(cooccurrenceModeMatcher)).toEqual([])

    await userEvent.click(cooccurrenceButton)
    expect(screen.queryByText(constraintModeMatcher)).toBeNull()
    expect(screen.queryAllByText(cooccurrenceModeMatcher)).not.toEqual([])

    await userEvent.click(constraintButton)
    expect(screen.queryByText(constraintModeMatcher)).not.toBeNull()
    expect(screen.queryAllByText(cooccurrenceModeMatcher)).toEqual([])
  })
})

forDatasetsMatching(svRegexp, 'GenePage with SV dataset "%s"', (datasetId) => {
  test('has no unexpected changes', () => {
    const gene = geneFactory.build()
    setMockApiResponses({
      StructuralVariantsInGene: () => ({
        gene: { structural_variants: [] },
      }),
      RegionCoverage: () => ({
        region: {
          coverage: {},
        },
      }),
    })
    const tree = renderer.create(
      withDummyRouter(<GenePage datasetId={datasetId} gene={gene} geneId={gene.gene_id} />)
    )
    expect(tree).toMatchSnapshot()
  })

  test('queries the API for region coverage with the correct parameters', async () => {
    const gene = geneFactory.build()
    setMockApiResponses({
      StructuralVariantsInGene: () => ({
        gene: { structural_variants: [] },
      }),
      RegionCoverage: () => ({
        region: {
          coverage: {},
        },
      }),
    })
    renderer.create(
      withDummyRouter(<GenePage datasetId={datasetId} gene={gene} geneId={gene.gene_id} />)
    )
    const coverageQueries = mockApiCalls().filter(
      ({ operationName }) => operationName === 'RegionCoverage'
    )
    expect(coverageQueries).toHaveLength(1)
    const [coverageQuery] = coverageQueries
    const exomeCoverageArg = coverageQuery.variables.includeExomeCoverage
    expect(exomeCoverageArg).toEqual(false)
  })
})

describe.each([
  ['exac', true],
  ['gnomad_r2_1', true],
  ['gnomad_r2_1_controls', true],
  ['gnomad_r2_1_non_cancer', true],
  ['gnomad_r2_1_non_neuro', true],
  ['gnomad_r2_1_non_topmed', true],
  ['gnomad_r3', false],
  ['gnomad_r3_controls_and_biobanks', false],
  ['gnomad_r3_non_cancer', false],
  ['gnomad_r3_non_neuro', false],
  ['gnomad_r3_non_topmed', false],
  ['gnomad_r3_non_v2', false],
] as [DatasetId, boolean][])('GenePage with non-SV dataset "%s"', (datasetId, expectedResult) => {
  test('queries the API for gene coverage with the correct parameters', async () => {
    const gene = geneFactory.build()
    setMockApiResponses({
      VariantsInGene: () => ({
        gene,
        meta: { clinvar_release_date: '2022-10-31' },
      }),
      GeneCoverage: () => ({
        gene: {
          coverage: {},
        },
      }),
    })
    renderer.create(
      withDummyRouter(<GenePage datasetId={datasetId} gene={gene} geneId={gene.gene_id} />)
    )

    const coverageQueries = mockApiCalls().filter(
      ({ operationName }) => operationName === 'GeneCoverage'
    )
    expect(coverageQueries).toHaveLength(1)
    const [coverageQuery] = coverageQueries
    const exomeCoverageArg = coverageQuery.variables.includeExomeCoverage
    expect(exomeCoverageArg).toEqual(expectedResult)
  })
})

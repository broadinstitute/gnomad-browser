import React from 'react'
import renderer from 'react-test-renderer'
import { jest, describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DatasetId,
  hasVariantCoocurrence,
  ReferenceGenome,
} from '@gnomad/dataset-metadata/metadata'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'

import geneFactory from '../__factories__/Gene'

import GenePage from './GenePage'
import GenePageContainer from './GenePageContainer'
import { forDatasetsMatching, forDatasetsNotMatching } from '../../../tests/__helpers__/datasets'
import { withDummyRouter } from '../../../tests/__helpers__/router'

jest.mock('../Query', () => {
  const originalModule = jest.requireActual('../Query')

  return {
    __esModule: true,
    ...(originalModule as object),
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

const svRegexp = /_sv/
const cnvRegexp = /_cnv/

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
      CopyNumberVariantsInGene: () => ({
        gene: { copy_number_variants: [] },
      }),
      CopyNumberVariantsGenePercentCallableTrack: () => ({
        gene: { cnv_track_callable_coverage: [] },
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
    if (hasVariantCoocurrence(datasetId)) {
      expect(screen.queryAllByText(cooccurrenceModeMatcher)).not.toEqual([])
    } else {
      expect(screen.queryAllByText(cooccurrenceModeMatcher)).toEqual([])
    }

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
})

forDatasetsMatching(cnvRegexp, 'GenePage with CNV dataset "%s"', (datasetId) => {
  test('has no unexpected changes', () => {
    const gene = geneFactory.build()
    setMockApiResponses({
      CopyNumberVariantsInGene: () => ({
        gene: { copy_number_variants: [] },
      }),
      RegionCoverage: () => ({
        region: {
          coverage: {},
        },
      }),
      GeneCoverage: () => ({
        gene: {
          coverage: {},
        },
      }),
      CopyNumberVariantsGenePercentCallableTrack: () => ({
        gene: { cnv_track_callable_coverage: [] },
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
      CopyNumberVariantsInGene: () => ({
        gene: { copy_number_variants: [] },
      }),
      GeneCoverage: () => ({
        gene: {
          coverage: {},
        },
      }),
      CopyNumberVariantsGenePercentCallableTrack: () => ({
        gene: { cnv_track_callable_coverage: [] },
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
    expect(exomeCoverageArg).toEqual(true)
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
  ['gnomad_cnv_r4', true],
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
      CopyNumberVariantsInGene: () => ({
        gene: { copy_number_variants: [] },
      }),
      CopyNumberVariantsGenePercentCallableTrack: () => ({
        gene: { cnv_track_callable_coverage: [] },
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

describe.each([
  ['exac', 'GRCh37', false],
  ['gnomad_r2_1', 'GRCh37', false],
  ['gnomad_r2_1_controls', 'GRCh37', false],
  ['gnomad_r2_1_non_cancer', 'GRCh37', false],
  ['gnomad_r2_1_non_neuro', 'GRCh37', false],
  ['gnomad_r2_1_non_topmed', 'GRCh37', false],
  ['gnomad_sv_r2_1', 'GRCh37', false],
  ['gnomad_sv_r2_1_controls', 'GRCh37', false],
  ['gnomad_sv_r2_1_non_neuro', 'GRCh37', false],
  ['gnomad_r3', 'GRCh38', true],
  ['gnomad_r3_controls_and_biobanks', 'GRCh38', true],
  ['gnomad_r3_non_cancer', 'GRCh38', true],
  ['gnomad_r3_non_neuro', 'GRCh38', true],
  ['gnomad_r3_non_topmed', 'GRCh38', true],
  ['gnomad_r3_non_v2', 'GRCh38', true],
  ['gnomad_cnv_r4', 'GRCh38', false],
] as [DatasetId, ReferenceGenome, boolean][])(
  'gene query with dataset %s',
  (datasetId, expectedReferenceGenome, expectedIncludeShortTandemRepeats) => {
    beforeEach(() => {
      setMockApiResponses({
        Gene: () => ({}),
      })
    })

    test(`uses ${expectedReferenceGenome} reference genome`, () => {
      renderer.create(<GenePageContainer datasetId={datasetId} geneIdOrSymbol="ABC123" />)
      const queries = mockApiCalls()
      expect(queries).toHaveLength(1)
      expect(queries[0].variables.referenceGenome).toEqual(expectedReferenceGenome)
    })

    const verb = expectedIncludeShortTandemRepeats ? 'includes' : 'does not include'
    test(`${verb} short tandem repeats`, () => {
      renderer.create(<GenePageContainer datasetId={datasetId} geneIdOrSymbol="ABC123" />)
      const queries = mockApiCalls()
      expect(queries).toHaveLength(1)
      expect(queries[0].variables.includeShortTandemRepeats).toEqual(
        expectedIncludeShortTandemRepeats
      )
    })
  }
)

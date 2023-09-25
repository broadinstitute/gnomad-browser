import React from 'react'
import renderer from 'react-test-renderer'

import { jest, describe, expect, test } from '@jest/globals'
import { mockQueries } from '../../../tests/__helpers__/queries'
import { BrowserRouter } from 'react-router-dom'

import Query, { BaseQuery } from '../Query'

import MitochondrialVariantsInRegion from './MitochondrialVariantsInRegion'

import { DatasetId, allDatasetIds } from '@gnomad/dataset-metadata/metadata'
import { Region } from './RegionPage'

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

const datasetsWithoutCoverage: DatasetId[] = [
  'exac',
  'gnomad_r2_1',
  'gnomad_r2_1_controls',
  'gnomad_r2_1_non_neuro',
  'gnomad_r2_1_non_cancer',
  'gnomad_r2_1_non_topmed',
]
const datasetsWithCoverage = allDatasetIds.filter(
  (datasetId) => !datasetsWithoutCoverage.includes(datasetId)
)

const region: Region = {
  chrom: 'M',
  reference_genome: 'GRCh38',
  start: 123,
  stop: 456,
  genes: [],
  non_coding_constraints: null,
}

describe.each(datasetsWithoutCoverage)(
  'MitochondrialVariantsInRegion with dataset %s',
  (datasetId) => {
    test('has no unexpected changes', () => {
      const tree = renderer.create(
        <BrowserRouter>
          <MitochondrialVariantsInRegion datasetId={datasetId} region={region} />
        </BrowserRouter>
      )
      expect(tree).toMatchSnapshot()
    })
  }
)

describe.each(datasetsWithCoverage)(
  'MitochondrialVariantsInRegion with dataset %s',
  (datasetId) => {
    test('has no unexpected changes', () => {
      setMockApiResponses({
        MitochondrialVariantsInRegion: () => ({
          meta: {
            clinvar_release_date: '2022-10-31',
          },
          region: {
            clinvar_variants: [],
            mitochondrial_variants: [],
          },
        }),
      })
      const tree = renderer.create(
        <MitochondrialVariantsInRegion datasetId={datasetId} region={region} />
      )
      expect(tree).toMatchSnapshot()
    })
  }
)

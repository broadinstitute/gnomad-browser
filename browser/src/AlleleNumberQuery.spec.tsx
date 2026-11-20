import React from 'react'
import renderer from 'react-test-renderer'

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import { DatasetId, allDatasetIds, hasAlleleNumber } from '@gnomad/dataset-metadata/metadata'

import { mockQueries } from '../../tests/__helpers__/queries'
import AlleleNumberQuery, { AlleleNumberTrackProps } from './AlleleNumberQuery'
import { BaseQuery } from './Query'

jest.mock('./Query', () => {
  const originalModule = jest.requireActual('./Query')

  return {
    __esModule: true,
    ...(originalModule as object),
    BaseQuery: jest.fn(),
  }
})

const {
  mockApiCalls,
  resetMockApiCalls,
  resetMockApiResponses,
  setMockApiResponses,
  simulateApiResponse,
} = mockQueries()

beforeEach(() => {
  ;(BaseQuery as any).mockImplementation(
    jest.fn(({ children, operationName, variables, query }: any) =>
      simulateApiResponse('BaseQuery', query, children, operationName, variables)
    )
  )
})

afterEach(() => {
  resetMockApiCalls()
  resetMockApiResponses()
})

const operationName = 'GeneAlleleNumber'
const query = `
query ${operationName}($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  feature: gene(gene_id: $geneId, reference_genome: $referenceGenome) {
    allele_number(dataset: $datasetId) {
      exome {
        pos
        an_percent
      }
    }
  }
}
`

/** Renders the query and returns whatever it handed to its children. */
const renderQuery = (datasetId: DatasetId): AlleleNumberTrackProps => {
  let received: AlleleNumberTrackProps | undefined

  renderer.create(
    <AlleleNumberQuery
      datasetId={datasetId}
      operationName={operationName}
      query={query}
      variables={{ geneId: 'ENSG00000169174' }}
    >
      {(alleleNumber) => {
        received = alleleNumber
        return <div />
      }}
    </AlleleNumberQuery>
  )

  if (!received) {
    throw new Error('AlleleNumberQuery did not render its children')
  }
  return received
}

const datasetsWithoutAlleleNumber = allDatasetIds.filter((id) => !hasAlleleNumber(id))

describe('datasets without an allele number release', () => {
  test.each(datasetsWithoutAlleleNumber)('%s is not queried at all', (datasetId) => {
    // Subsets are in here as well as older releases. Call rate is a function of
    // which samples are in the callset, so a subset must not be served the full
    // release's allele number the way it is served the full release's coverage.
    expect(renderQuery(datasetId)).toEqual({ isAlleleNumberLoading: false })
    expect(mockApiCalls()).toEqual([])
  })
})

describe('datasets with an allele number release', () => {
  test('are queried with their own dataset and reference genome', () => {
    setMockApiResponses({ [operationName]: () => ({ feature: { allele_number: {} } }) })

    renderQuery('gnomad_r4')

    expect(mockApiCalls()).toHaveLength(1)
    expect(mockApiCalls()[0].variables).toEqual({
      geneId: 'ENSG00000169174',
      datasetId: 'gnomad_r4',
      referenceGenome: 'GRCh38',
    })
  })

  test('turn the response into exome and genome series', () => {
    setMockApiResponses({
      [operationName]: () => ({
        feature: {
          allele_number: {
            exome: [{ pos: 100, an_percent: 99.5 }],
            genome: [{ pos: 100, an_percent: 98.5 }],
          },
        },
      }),
    })

    const { alleleNumberDatasets } = renderQuery('gnomad_r4')

    expect(alleleNumberDatasets?.map((dataset) => dataset.name)).toEqual(['exome', 'genome'])
    expect(alleleNumberDatasets?.[0].buckets).toEqual([{ pos: 100, an_percent: 99.5 }])
  })

  test('report no series when the response is empty', () => {
    // An empty series would otherwise put a legend entry on the track for data
    // that is not there.
    setMockApiResponses({
      [operationName]: () => ({ feature: { allele_number: { exome: [], genome: [] } } }),
    })

    expect(renderQuery('gnomad_r4')).toEqual({ isAlleleNumberLoading: false })
  })

  test('report no series when the query fails', () => {
    // A failed allele number request must not take the coverage track with it,
    // so a null feature is treated the same as an empty one.
    setMockApiResponses({ [operationName]: () => ({ feature: null }) })

    expect(renderQuery('gnomad_r4')).toEqual({ isAlleleNumberLoading: false })
  })
})

import React from 'react'
import { jest, describe, expect, test, beforeEach, afterEach } from '@jest/globals'
import renderer from 'react-test-renderer'
import { mockQueries } from '../../../tests/__helpers__/queries'
import { withDummyRouter } from '../../../tests/__helpers__/router'
import Query, { BaseQuery } from '../Query'
import LiftoverDisambiguationPage from './LiftoverDisambiguationPage'
import { createMemoryHistory } from 'history'

import {
  DatasetId,
  allDatasetIds,
  isLiftoverSource,
  isLiftoverTarget,
} from '@gnomad/dataset-metadata/metadata'

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

const liftoverSourceDatasets = allDatasetIds.filter(isLiftoverSource)
const liftoverTargetDatasets = allDatasetIds.filter(isLiftoverTarget)

describe('LiftoverDisambiguationPage', () => {
  describe.each(liftoverSourceDatasets)(
    'starting from liftover source dataset %s',
    (fromDatasetId: DatasetId) => {
      test('makes the correct query', () => {
        setMockApiResponses({
          LiftoverDisambiguation: () => ({}),
        })

        renderer.create(
          withDummyRouter(
            <LiftoverDisambiguationPage
              fromVariantId="fakevariant"
              fromDatasetId={fromDatasetId}
              toDatasetId="gnomad_r4"
            />
          )
        )

        const queries = mockApiCalls()
        expect(queries.length).toEqual(1)

        const query = queries[0]
        expect(query.operationName).toEqual('LiftoverDisambiguation')
        expect(query.variables.source_variant_id).toEqual('fakevariant')
        expect(query.variables.liftover_variant_id).toEqual(undefined)
        expect(query.variables.reference_genome).toEqual('GRCh37')
      })
      test('has appropriate message if no corresponding variant found', () => {
        setMockApiResponses({
          LiftoverDisambiguation: () => ({ liftover: [] }),
        })

        const tree = renderer.create(
          withDummyRouter(
            <LiftoverDisambiguationPage
              fromVariantId="fakevariant"
              fromDatasetId={fromDatasetId}
              toDatasetId="gnomad_r4"
            />
          )
        )
        expect(tree).toMatchSnapshot()
      })

      test('redirects if one corresponding variant found', () => {
        setMockApiResponses({
          LiftoverDisambiguation: () => ({
            liftover: [{ liftover: { variant_id: 'source1' } }],
          }),
        })

        const history = createMemoryHistory()

        const router = withDummyRouter(
          <LiftoverDisambiguationPage
            fromVariantId="fakevariant"
            fromDatasetId={fromDatasetId}
            toDatasetId="gnomad_r4"
          />,
          history
        )
        renderer.create(router)
        const { location } = history
        expect(location.pathname).toEqual('/variant/source1')
        expect(location.search).toEqual('?dataset=gnomad_r4')
      })

      test('renders links to each variant if multiple corresponding variants found', () => {
        setMockApiResponses({
          LiftoverDisambiguation: () => ({
            liftover: [
              { liftover: { variant_id: 'source1' } },
              { liftover: { variant_id: 'source2' } },
            ],
          }),
        })

        const tree = renderer.create(
          withDummyRouter(
            <LiftoverDisambiguationPage
              fromVariantId="fakevariant"
              fromDatasetId={fromDatasetId}
              toDatasetId="gnomad_r4"
            />
          )
        )

        expect(tree).toMatchSnapshot()
      })
    }
  )

  describe.each(liftoverTargetDatasets)(
    'starting from liftover target dataset %s',
    (fromDatasetId: DatasetId) => {
      test('makes the correct query', () => {
        setMockApiResponses({
          LiftoverDisambiguation: () => ({}),
        })

        renderer.create(
          withDummyRouter(
            <LiftoverDisambiguationPage
              fromVariantId="fakevariant"
              fromDatasetId={fromDatasetId}
              toDatasetId="gnomad_r2_1"
            />
          )
        )

        const queries = mockApiCalls()
        expect(queries.length).toEqual(1)

        const query = queries[0]
        expect(query.operationName).toEqual('LiftoverDisambiguation')
        expect(query.variables.source_variant_id).toEqual(undefined)
        expect(query.variables.liftover_variant_id).toEqual('fakevariant')
        expect(query.variables.reference_genome).toEqual('GRCh38')
      })

      test('has appropriate message if no corresponding variant found', () => {
        setMockApiResponses({
          LiftoverDisambiguation: () => ({ liftover: [] }),
        })

        const tree = renderer.create(
          withDummyRouter(
            <LiftoverDisambiguationPage
              fromVariantId="fakevariant"
              fromDatasetId={fromDatasetId}
              toDatasetId="gnomad_r2_1"
            />
          )
        )
        expect(tree).toMatchSnapshot()
      })

      test('redirects if one corresponding variant found', () => {
        setMockApiResponses({
          LiftoverDisambiguation: () => ({
            liftover: [{ source: { variant_id: 'source1' } }],
          }),
        })

        const history = createMemoryHistory()

        const router = withDummyRouter(
          <LiftoverDisambiguationPage
            fromVariantId="fakevariant"
            fromDatasetId={fromDatasetId}
            toDatasetId="gnomad_r2_1"
          />,
          history
        )
        renderer.create(router)
        const { location } = history
        expect(location.pathname).toEqual('/variant/source1')
        expect(location.search).toEqual('?dataset=gnomad_r2_1')
      })

      test('renders links to each variant if multiple corresponding variants found', () => {
        setMockApiResponses({
          LiftoverDisambiguation: () => ({
            liftover: [
              { source: { variant_id: 'source1' } },
              { source: { variant_id: 'source2' } },
            ],
          }),
        })

        const tree = renderer.create(
          withDummyRouter(
            <LiftoverDisambiguationPage
              fromVariantId="fakevariant"
              fromDatasetId={fromDatasetId}
              toDatasetId="gnomad_r2_1"
            />
          )
        )

        expect(tree).toMatchSnapshot()
      })
    }
  )
})

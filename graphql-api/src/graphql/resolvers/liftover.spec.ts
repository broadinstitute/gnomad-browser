import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import config from '../../config'
import logger from '../../logger'
import {
  fetchLiftoverVariantsBySource,
  fetchLiftoverVariantsByTarget,
} from '../../queries/liftover-queries'

import resolvers from './liftover'

jest.mock('../../config', () => ({ PARQUET_ONLY: false }))
jest.mock('../../logger', () => ({ warn: jest.fn() }))
jest.mock('../../queries/liftover-queries', () => ({
  fetchLiftoverVariantsBySource: jest.fn(),
  fetchLiftoverVariantsByTarget: jest.fn(),
}))

const esClient = {}
const context = { esClient }

const resolveLiftover = (args: Record<string, string>) =>
  resolvers.Query.liftover({}, { reference_genome: 'GRCh38', ...args }, context)

beforeEach(() => {
  jest.clearAllMocks()
  config.PARQUET_ONLY = false
})

describe('Query.liftover', () => {
  test('reads liftover by source variant from Elasticsearch', async () => {
    await resolveLiftover({ source_variant_id: '17-16000457-T-C' })

    expect(fetchLiftoverVariantsBySource).toHaveBeenCalledWith(
      esClient,
      '17-16000457-T-C',
      'GRCh38'
    )
  })

  test('reads liftover by target variant from Elasticsearch', async () => {
    await resolveLiftover({ liftover_variant_id: '17-16000457-T-C' })

    expect(fetchLiftoverVariantsByTarget).toHaveBeenCalledWith(
      esClient,
      '17-16000457-T-C',
      'GRCh38'
    )
  })

  test.each(['source_variant_id', 'liftover_variant_id'])(
    'returns no liftover for %s and warns in PARQUET_ONLY mode',
    async (argument) => {
      config.PARQUET_ONLY = true

      expect(await resolveLiftover({ [argument]: '17-16000457-T-C' })).toEqual([])
      expect(fetchLiftoverVariantsBySource).not.toHaveBeenCalled()
      expect(fetchLiftoverVariantsByTarget).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'parquetOnlyStub', field: 'Query.liftover' })
      )
    }
  )

  test('still rejects an invalid variant ID in PARQUET_ONLY mode', () => {
    config.PARQUET_ONLY = true

    expect(() => resolveLiftover({ source_variant_id: 'not-a-variant' })).toThrow(
      'Invalid variant ID'
    )
  })
})

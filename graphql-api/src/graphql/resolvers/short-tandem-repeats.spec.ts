import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import config from '../../config'
import logger from '../../logger'
import {
  fetchShortTandemRepeatsByGene,
  fetchShortTandemRepeatsByRegion,
} from '../../queries/short-tandem-repeat-queries'

import resolvers from './short-tandem-repeats'

jest.mock('../../config', () => ({ PARQUET_ONLY: false }))
jest.mock('../../logger', () => ({ warn: jest.fn() }))
jest.mock('../../queries/short-tandem-repeat-queries', () => ({
  fetchAllShortTandemRepeats: jest.fn(),
  fetchShortTandemRepeatById: jest.fn(),
  fetchShortTandemRepeatsByGene: jest.fn(),
  fetchShortTandemRepeatsByRegion: jest.fn(),
}))

const esClient = {}
const context = { esClient }
const args = { dataset: 'gnomad_r4' }
const gene = { gene_id: 'ENSG00000169174' }
const region = { reference_genome: 'GRCh38', chrom: '1', start: 100, stop: 200 }

beforeEach(() => {
  jest.clearAllMocks()
  config.PARQUET_ONLY = false
})

describe('Gene.short_tandem_repeats', () => {
  test('reads short tandem repeats from Elasticsearch', async () => {
    await resolvers.Gene.short_tandem_repeats(gene, args, context)

    expect(fetchShortTandemRepeatsByGene).toHaveBeenCalledWith(esClient, 'gnomad_r4', gene.gene_id)
  })

  test('returns no short tandem repeats and warns in PARQUET_ONLY mode', async () => {
    config.PARQUET_ONLY = true

    expect(await resolvers.Gene.short_tandem_repeats(gene, args, context)).toEqual([])
    expect(fetchShortTandemRepeatsByGene).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'parquetOnlyStub', field: 'Gene.short_tandem_repeats' })
    )
  })
})

describe('Region.short_tandem_repeats', () => {
  test('reads short tandem repeats from Elasticsearch', async () => {
    await resolvers.Region.short_tandem_repeats(region, args, context)

    expect(fetchShortTandemRepeatsByRegion).toHaveBeenCalledWith(esClient, 'gnomad_r4', region)
  })

  test('returns no short tandem repeats and warns in PARQUET_ONLY mode', async () => {
    config.PARQUET_ONLY = true

    expect(await resolvers.Region.short_tandem_repeats(region, args, context)).toEqual([])
    expect(fetchShortTandemRepeatsByRegion).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'parquetOnlyStub', field: 'Region.short_tandem_repeats' })
    )
  })
})

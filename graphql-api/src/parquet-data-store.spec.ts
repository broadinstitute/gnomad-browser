import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { openClinvarStore, openGeneStore, openGnomadV4Store } from '@gnomad/data-store'

import config from './config'
import logger from './logger'
import initializeParquetDataStoreIfEnabled from './parquet-data-store'

jest.mock('./config', () => ({
  PARQUET_DATA_STORE_ENABLED: true,
  PARQUET_DATA_ROOT: '/test/parquet',
  PARQUET_ONLY: true,
}))
jest.mock('./logger', () => ({ info: jest.fn(), warn: jest.fn() }))
jest.mock('@gnomad/data-store', () => ({
  openClinvarStore: jest.fn(async () => ({})),
  openGeneStore: jest.fn(async () => ({})),
  openGnomadV4Store: jest.fn(async () => ({})),
}))

beforeEach(() => {
  jest.clearAllMocks()
  config.PARQUET_DATA_STORE_ENABLED = true
  config.PARQUET_DATA_ROOT = '/test/parquet'
  config.PARQUET_ONLY = true
})

describe('Parquet data store initialization', () => {
  test('opens all three datasets from the same root and reports unavailable LoF curation', async () => {
    const store = await initializeParquetDataStoreIfEnabled()
    expect(openClinvarStore).toHaveBeenCalledWith('/test/parquet')
    expect(openGeneStore).toHaveBeenCalledWith('/test/parquet')
    expect(openGnomadV4Store).toHaveBeenCalledWith('/test/parquet')
    expect(store).toEqual({ clinvarGrch38: {}, geneModelsGrch38: {}, gnomadVariantsV4: {} })
    expect(logger.warn).toHaveBeenCalledWith({
      event: 'parquetAnnotationUnavailable',
      dataset: 'gnomad_variants_v4',
      annotation: 'lof_curation',
    })
    expect(logger.info).toHaveBeenCalledWith({
      event: 'parquetDataStoreInitialized',
      datasets: ['clinvar_variants_grch38', 'gene_models_grch38', 'gnomad_variants_v4'],
    })
  })

  test('does not open native stores when disabled', async () => {
    config.PARQUET_DATA_STORE_ENABLED = false
    expect(await initializeParquetDataStoreIfEnabled()).toBeNull()
    expect(openClinvarStore).not.toHaveBeenCalled()
    expect(openGeneStore).not.toHaveBeenCalled()
    expect(openGnomadV4Store).not.toHaveBeenCalled()
  })

  test('rejects an empty root before opening any stores', async () => {
    config.PARQUET_DATA_ROOT = ' '
    await expect(initializeParquetDataStoreIfEnabled()).rejects.toThrow(
      'PARQUET_DATA_ROOT is required'
    )
    expect(openClinvarStore).not.toHaveBeenCalled()
  })

  test('propagates gnomAD initialization failure instead of starting without the dataset', async () => {
    const error = new Error('gnomad_variants_v4 is missing')
    jest.mocked(openGnomadV4Store).mockRejectedValueOnce(error)
    await expect(initializeParquetDataStoreIfEnabled()).rejects.toBe(error)
    expect(logger.info).not.toHaveBeenCalled()
  })

  test('does not report LoF curation as unavailable when ES enrichment remains enabled', async () => {
    config.PARQUET_ONLY = false
    await initializeParquetDataStoreIfEnabled()
    expect(logger.warn).not.toHaveBeenCalled()
  })
})

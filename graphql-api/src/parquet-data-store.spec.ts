import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import {
  openClinvarStore,
  openCoverageStore,
  openGeneStore,
  openGnomadV4Store,
} from '@gnomad/data-store'

import config from './config'
import logger from './logger'
import initializeParquetDataStoreIfEnabled from './parquet-data-store'

jest.mock('./config', () => ({
  PARQUET_DATA_STORE_ENABLED: true,
  PARQUET_DATA_ROOT: '/test/parquet',
}))
jest.mock('./logger', () => ({ info: jest.fn(), warn: jest.fn() }))
// The addon is only built by the data-store CI, so the real package entry point may not exist here.
jest.mock(
  '@gnomad/data-store',
  () => ({
    openClinvarStore: jest.fn(async () => ({ dataset: 'clinvar' })),
    openCoverageStore: jest.fn(),
    openGeneStore: jest.fn(async () => ({ dataset: 'genes' })),
    openGnomadV4Store: jest.fn(async () => ({ dataset: 'gnomad_v4' })),
  }),
  { virtual: true }
)

beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(openCoverageStore)
    .mockImplementation(async (_root, dataset) => ({ dataset } as never))
  config.PARQUET_DATA_STORE_ENABLED = true
  config.PARQUET_DATA_ROOT = '/test/parquet'
})

describe('Parquet data store initialization', () => {
  test('opens every dataset from the configured root', async () => {
    const store = await initializeParquetDataStoreIfEnabled()

    expect(openClinvarStore).toHaveBeenCalledWith('/test/parquet')
    expect(openGeneStore).toHaveBeenCalledWith('/test/parquet')
    expect(openCoverageStore).toHaveBeenCalledWith('/test/parquet', 'gnomad_v3_genome')
    expect(openCoverageStore).toHaveBeenCalledWith('/test/parquet', 'gnomad_v4_exome')
    expect(openGnomadV4Store).toHaveBeenCalledWith('/test/parquet')
    expect(store).toEqual({
      clinvarGrch38: { dataset: 'clinvar' },
      geneModelsGrch38: { dataset: 'genes' },
      gnomadV3GenomeCoverage: { dataset: 'gnomad_v3_genome' },
      gnomadV4ExomeCoverage: { dataset: 'gnomad_v4_exome' },
      gnomadVariantsV4: { dataset: 'gnomad_v4' },
    })
    expect(logger.info).toHaveBeenCalledWith({
      event: 'parquetDataStoreInitialized',
      datasets: [
        'clinvar_variants_grch38',
        'gene_models_grch38',
        'gnomad_v3_genome_coverage',
        'gnomad_v4_exome_coverage',
        'gnomad_variants_v4',
      ],
    })
  })

  test('does not open native stores when disabled', async () => {
    config.PARQUET_DATA_STORE_ENABLED = false

    expect(await initializeParquetDataStoreIfEnabled()).toBeNull()
    expect(openClinvarStore).not.toHaveBeenCalled()
    expect(openGeneStore).not.toHaveBeenCalled()
    expect(openCoverageStore).not.toHaveBeenCalled()
    expect(openGnomadV4Store).not.toHaveBeenCalled()
  })

  test('rejects an empty root before opening any stores', async () => {
    config.PARQUET_DATA_ROOT = ' '

    await expect(initializeParquetDataStoreIfEnabled()).rejects.toThrow(
      'PARQUET_DATA_ROOT is required'
    )
    expect(openClinvarStore).not.toHaveBeenCalled()
    expect(openGeneStore).not.toHaveBeenCalled()
    expect(openCoverageStore).not.toHaveBeenCalled()
    expect(openGnomadV4Store).not.toHaveBeenCalled()
  })

  test('propagates an initialization failure instead of starting without the dataset', async () => {
    const error = new Error('clinvar_variants_grch38 is missing')
    jest.mocked(openClinvarStore).mockRejectedValueOnce(error)

    await expect(initializeParquetDataStoreIfEnabled()).rejects.toBe(error)
    expect(logger.info).not.toHaveBeenCalled()
  })

  test('fails to start when the gene dataset cannot be opened', async () => {
    const error = new Error('gene_models_grch38 is missing')
    jest.mocked(openGeneStore).mockRejectedValueOnce(error)

    await expect(initializeParquetDataStoreIfEnabled()).rejects.toBe(error)
    expect(logger.info).not.toHaveBeenCalled()
  })

  test('fails to start when the gnomAD v4 dataset cannot be opened', async () => {
    const error = new Error('gnomad_variants_v4 is missing')
    jest.mocked(openGnomadV4Store).mockRejectedValueOnce(error)

    await expect(initializeParquetDataStoreIfEnabled()).rejects.toBe(error)
    expect(logger.info).not.toHaveBeenCalled()
  })

  test.each(['gnomad_v3_genome', 'gnomad_v4_exome'])(
    'fails to start when the %s coverage dataset cannot be opened',
    async (missingDataset) => {
      const error = new Error(`${missingDataset} coverage is missing`)
      jest
        .mocked(openCoverageStore)
        .mockImplementation(async (_root, dataset) =>
          dataset === missingDataset ? Promise.reject(error) : ({ dataset } as never)
        )

      await expect(initializeParquetDataStoreIfEnabled()).rejects.toBe(error)
      expect(logger.info).not.toHaveBeenCalled()
    }
  )
})

import config from './config'

import type { ClinvarStore, CoverageStore, GeneStore, GnomadV4Store } from '@gnomad/data-store'
import logger from './logger'

export interface ParquetDataStore {
  clinvarGrch38: ClinvarStore
  geneModelsGrch38: GeneStore
  gnomadV4ExomeCoverage: CoverageStore
  gnomadVariantsV4: GnomadV4Store
}

type NativeDataStoreAddon = typeof import('@gnomad/data-store')

const loadNativeDataStoreAddon = (): NativeDataStoreAddon => {
  try {
    // eslint-disable-next-line global-require -- Avoid loading an unbuilt addon when disabled.
    return require('@gnomad/data-store')
  } catch (error) {
    throw Object.assign(
      new Error(
        'Parquet data store is enabled, but its native addon could not be loaded. ' +
          'Locally, run: pnpm --filter @gnomad/data-store build:native. ' +
          'In Docker, build the parquet-api target of api.dockerfile.'
      ),
      { cause: error }
    )
  }
}

const initializeParquetDataStoreIfEnabled = async (): Promise<ParquetDataStore | null> => {
  if (!config.PARQUET_DATA_STORE_ENABLED) {
    logger.info({
      event: 'parquetDataStoreDisabled',
    })
    return null
  }

  const parquetRoot = config.PARQUET_DATA_ROOT

  if (typeof parquetRoot !== 'string' || parquetRoot.trim() === '') {
    throw new Error('PARQUET_DATA_ROOT is required when PARQUET_DATA_STORE_ENABLED=true')
  }

  const addon = loadNativeDataStoreAddon()
  const [clinvarGrch38, geneModelsGrch38, gnomadV4ExomeCoverage, gnomadVariantsV4] =
    await Promise.all([
      addon.openClinvarStore(parquetRoot),
      addon.openGeneStore(parquetRoot),
      addon.openCoverageStore(parquetRoot, 'gnomad_v4_exome'),
      addon.openGnomadV4Store(parquetRoot),
    ])

  logger.info({
    event: 'parquetDataStoreInitialized',
    datasets: [
      'clinvar_variants_grch38',
      'gene_models_grch38',
      'gnomad_v4_exome_coverage',
      'gnomad_variants_v4',
    ],
  })

  return { clinvarGrch38, geneModelsGrch38, gnomadV4ExomeCoverage, gnomadVariantsV4 }
}

export default initializeParquetDataStoreIfEnabled

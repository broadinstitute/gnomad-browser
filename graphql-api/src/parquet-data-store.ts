import config from './config'

import type { ClinvarStore, GeneStore, GnomadV4Store } from '@gnomad/data-store'
import logger from './logger'

export interface ParquetDataStore {
  clinvarGrch38: ClinvarStore
  geneModelsGrch38: GeneStore
  gnomadVariantsV4: GnomadV4Store
}

// note: despite how it looks at first glance, this is a type, not a runtime import
type NativeDataStoreAddon = typeof import('@gnomad/data-store')

const loadNativeDataStoreAddon = (): NativeDataStoreAddon => {
  try {
    // eslint-disable-next-line global-require -- Avoid loading an unbuilt addon when disabled.
    return require('@gnomad/data-store')
  } catch (error) {
    throw Object.assign(
      new Error(
        'Parquet data store is enabled, but its native addon could not be loaded. ' +
          'Run: pnpm --filter @gnomad/data-store build:native'
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
  const clinvarGrch38 = await addon.openClinvarStore(parquetRoot)
  const geneModelsGrch38 = await addon.openGeneStore(parquetRoot)
  const gnomadVariantsV4 = await addon.openGnomadV4Store(parquetRoot)

  if (config.PARQUET_ONLY) {
    logger.warn({
      event: 'parquetAnnotationUnavailable',
      dataset: 'gnomad_variants_v4',
      annotation: 'lof_curation',
    })
  }

  logger.info({
    event: 'parquetDataStoreInitialized',
    datasets: ['clinvar_variants_grch38', 'gene_models_grch38', 'gnomad_variants_v4'],
  })

  return { clinvarGrch38, geneModelsGrch38, gnomadVariantsV4 }
}

export default initializeParquetDataStoreIfEnabled

import config from './config'

import type { ClinvarStore } from '@gnomad/data-store'
import logger from './logger'

export interface ParquetDataStore {
  clinvarGrch38: ClinvarStore
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

  const path = config.CLINVAR_GRCH38_PARQUET_PATH

  if (typeof path !== 'string' || path.trim() === '') {
    throw new Error('CLINVAR_GRCH38_PARQUET_PATH is required when PARQUET_DATA_STORE_ENABLED=true')
  }

  const addon = loadNativeDataStoreAddon()
  const clinvarGrch38 = await addon.openClinvarStore(path)

  logger.info({
    event: 'parquetDataStoreInitialized',
    datasets: ['clinvar_grch38'],
  })

  return { clinvarGrch38 }
}

export default initializeParquetDataStoreIfEnabled

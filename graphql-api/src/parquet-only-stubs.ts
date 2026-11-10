import logger from './logger'
import { getRequestContext } from './request-context'

// Central place to serve stubs from
// to allow pages to load without needing all datasets yet
export const PARQUET_ONLY_STUBS = {
  // The browser renders anything that isn't YYYY-MM-DD as a visible "Malformed date string".
  'BrowserMetadata.clinvar_release_date': 'unavailable in Parquet-only mode',
  'Gene.short_tandem_repeats': [],
  'Region.short_tandem_repeats': [],
} as const

export type ParquetOnlyStubbedField = keyof typeof PARQUET_ONLY_STUBS

export const resolveParquetOnlyStub = <Field extends ParquetOnlyStubbedField>(
  field: Field
): (typeof PARQUET_ONLY_STUBS)[Field] => {
  logger.warn({
    requestId: getRequestContext()?.requestId,
    event: 'parquetOnlyStub',
    field,
  })
  return PARQUET_ONLY_STUBS[field]
}

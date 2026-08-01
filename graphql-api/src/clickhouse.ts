import { createClient } from '@clickhouse/client'
import { DEFAULT_Y1_CLICKHOUSE_DATABASE, resolveY1ClickHouseConfig } from './y1_config'

const clickhouseUrl = process.env.CLICKHOUSE_URL || 'http://127.0.0.1:8123'

const readonlyClientOptions = {
  clickhouse_settings: { readonly: '1' as const },
  keep_alive: { enabled: true, idle_socket_ttl: 2000 },
}

export const clickhouseClient = createClient({
  // Default to 127.0.0.1 rather than localhost: on macOS `localhost` resolves to
  // ::1 (IPv6) first, and the ClickHouse container only listens on IPv4.
  url: clickhouseUrl,
  ...readonlyClientOptions,
})

export const isY1PilotEnabled = process.env.LR_Y1_ENABLED === 'true'
export const y1ClickhouseConfig = isY1PilotEnabled
  ? resolveY1ClickHouseConfig()
  : {
      // The disabled client must never inherit the generic/legacy URL. No query
      // reaches this non-routable endpoint while Y1 mode is disabled.
      url: 'http://y1-disabled.invalid',
      database: DEFAULT_Y1_CLICKHOUSE_DATABASE,
    }

// Y1 has one read-only connection and one fixed disposable database. Operators
// select the server by URL (the launcher turns a port into this URL); run IDs are
// discovered from the database at startup rather than supplied as configuration.
export const y1ClickhouseClient = createClient({
  url: y1ClickhouseConfig.url,
  database: y1ClickhouseConfig.database,
  ...readonlyClientOptions,
})

export const PHASED_METHYLATION_EVALUATION_DATABASE =
  'gnomad_lr_y1_scratch_phased_methylation_evaluation_v5_hg00097_chr22_47040000_47050000_v1'
export const isPhasedMethylationEvaluationEnabled =
  process.env.LR_PHASED_METHYLATION_EVALUATION_ENABLED === 'true'
const phasedMethylationEvaluationUrl =
  process.env.LR_PHASED_METHYLATION_EVALUATION_CLICKHOUSE_URL || ''
const phasedMethylationEvaluationUsername =
  process.env.LR_PHASED_METHYLATION_EVALUATION_CLICKHOUSE_USER || ''
const phasedMethylationEvaluationPassword =
  process.env.LR_PHASED_METHYLATION_EVALUATION_CLICKHOUSE_PASSWORD || ''
if (
  isPhasedMethylationEvaluationEnabled &&
  (!phasedMethylationEvaluationUrl ||
    !phasedMethylationEvaluationUsername ||
    !phasedMethylationEvaluationPassword)
) {
  throw new Error('Phased methylation evaluation requires its URL, user, and password')
}

// This read-only client is pinned to the one retained evaluation database. No
// environment variable can redirect the feature to another database or table.
export const phasedMethylationEvaluationClickhouseClient = createClient({
  url: phasedMethylationEvaluationUrl || clickhouseUrl,
  username: phasedMethylationEvaluationUsername || 'default',
  password: phasedMethylationEvaluationPassword,
  database: PHASED_METHYLATION_EVALUATION_DATABASE,
  ...readonlyClientOptions,
})

import { createClient } from '@clickhouse/client'

const clickhouseUrl = process.env.CLICKHOUSE_URL || 'http://127.0.0.1:8123'

export const clickhouseClient = createClient({
  // Default to 127.0.0.1 rather than localhost: on macOS `localhost` resolves to
  // ::1 (IPv6) first, and the ClickHouse container only listens on IPv4.
  url: clickhouseUrl,
  clickhouse_settings: { readonly: '1' },
  // Recycle idle keep-alive sockets aggressively. The client pools keep-alive
  // sockets, so if the ClickHouse server is restarted while the API stays up,
  // any pooled socket that gets reused points at a dead connection and every
  // ClickHouse-backed query (lr_variants, lr_coverage) throws until the pool
  // drains. Keeping the idle TTL well below the server keep-alive timeout means
  // sockets idle longer than this are discarded and a fresh connection is made,
  // so a server restart never wedges the API for more than the TTL window.
  keep_alive: {
    enabled: true,
    idle_socket_ttl: 2000,
  },
})

const y1Database = process.env.LR_Y1_CLICKHOUSE_DATABASE || ''
if (y1Database && !/^gnomad_lr_y1_[a-z0-9_]+$/.test(y1Database)) {
  throw new Error(`Unsafe LR Y1 ClickHouse database name: ${y1Database}`)
}

export const isY1PilotEnabled = process.env.LR_Y1_ENABLED === 'true'
export const isY1Chr22MixedProvenanceEnabled =
  process.env.LR_Y1_CHR22_MIXED_PROVENANCE_ENABLED === 'true'

if (isY1Chr22MixedProvenanceEnabled && !isY1PilotEnabled) {
  throw new Error('LR_Y1_CHR22_MIXED_PROVENANCE_ENABLED requires LR_Y1_ENABLED=true')
}
if (isY1PilotEnabled && !y1Database) {
  throw new Error('LR_Y1_ENABLED requires LR_Y1_CLICKHOUSE_DATABASE')
}

// The Y1 pilot is deliberately isolated from the legacy ClickHouse client.
// Enabling it requires an explicit database and run IDs; production defaults
// continue to query the legacy tables above.
const y1ClickhouseUrl = process.env.LR_Y1_CLICKHOUSE_URL || clickhouseUrl
export const y1ClickhouseClient = createClient({
  url: y1ClickhouseUrl,
  database: y1Database || 'default',
  clickhouse_settings: { readonly: '1' },
  keep_alive: {
    enabled: true,
    idle_socket_ttl: 2000,
  },
})

const prototypeAncillaryUrl = process.env.LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_URL || ''
const prototypeAncillaryDatabase =
  process.env.LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_DATABASE || ''
if (isY1Chr22MixedProvenanceEnabled) {
  if (!prototypeAncillaryUrl || !prototypeAncillaryDatabase) {
    throw new Error(
      'Mixed-provenance mode requires a separate prototype ancillary ClickHouse URL and database'
    )
  }
  if (!/^gnomad_lr_(?:y1_)?(?:legacy_)?prototype_[a-z0-9_]+$/.test(prototypeAncillaryDatabase)) {
    throw new Error(`Unsafe prototype ancillary ClickHouse database name: ${prototypeAncillaryDatabase}`)
  }
  if (prototypeAncillaryDatabase === y1Database || prototypeAncillaryUrl === y1ClickhouseUrl) {
    throw new Error('Prototype ancillary endpoint and database must both be distinct from Y1 primary')
  }
}

// This client is never a fallback. It is used only by the mixed-mode HGSVC
// ancillary allowlist after startup preflight has established a capability.
export const prototypeAncillaryClickhouseClient = createClient({
  url: prototypeAncillaryUrl || clickhouseUrl,
  database: prototypeAncillaryDatabase || 'default',
  clickhouse_settings: { readonly: '1' },
  keep_alive: { enabled: true, idle_socket_ttl: 2000 },
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
if (isPhasedMethylationEvaluationEnabled && (
  !phasedMethylationEvaluationUrl || !phasedMethylationEvaluationUsername ||
  !phasedMethylationEvaluationPassword
)) {
  throw new Error('Phased methylation evaluation requires its URL, user, and password')
}

// This read-only client is pinned to the one retained evaluation database. No
// environment variable can redirect the feature to another database or table.
export const phasedMethylationEvaluationClickhouseClient = createClient({
  url: phasedMethylationEvaluationUrl || clickhouseUrl,
  username: phasedMethylationEvaluationUsername || 'default',
  password: phasedMethylationEvaluationPassword,
  database: PHASED_METHYLATION_EVALUATION_DATABASE,
  clickhouse_settings: { readonly: '1' },
  keep_alive: { enabled: true, idle_socket_ttl: 2000 },
})

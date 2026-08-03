export const DEFAULT_Y1_CLICKHOUSE_DATABASE = 'gnomad_lr_y1_scratch_v5_current'

export type Y1Cohort = 'hgsvc_hprc' | 'aou'
export type Y1AncillaryModality = 'coverage' | 'str_histogram' | 'methylation'

export type Y1PrimaryRunMap = Map<Y1Cohort, Map<string, string>>

export type Y1AncillaryRoute = {
  modality: Y1AncillaryModality
  cohort: Y1Cohort
  database: string
  run_id: string
}

export type Y1ClickHouseConfig = {
  url: string
  database: string
}

const safeDatabase = (database: string) => {
  if (!/^gnomad_lr_y1_[a-z0-9_]+$/.test(database)) {
    throw new Error(`Unsafe LR Y1 ClickHouse database name: ${database}`)
  }
  return database
}

const safeRunId = (runId: unknown, label: string) => {
  if (typeof runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/.test(runId)) {
    throw new Error(`Unsafe LR Y1 run ID for ${label}`)
  }
  return runId
}

const normalizeChrom = (chrom: string) => (chrom.startsWith('chr') ? chrom : `chr${chrom}`)
const canonicalChroms = new Set([
  ...Array.from({ length: 22 }, (_, index) => `chr${index + 1}`),
  'chrX',
  'chrY',
])

const parseJsonObject = (value: string, label: string): Record<string, unknown> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`${label} must be valid JSON`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`)
  }
  return parsed as Record<string, unknown>
}

const requireExplicitUrl = (url: string | undefined) => {
  const selected = (url || '').trim()
  if (!selected) {
    throw new Error('LR Y1 mode requires an explicit LR_Y1_CLICKHOUSE_URL')
  }
  return selected
}

// The database override is deliberately Y1-specific and identifier-validated.
// When absent, startup retains the current fixed production database.
export const resolveY1ClickHouseConfig = (
  env: NodeJS.ProcessEnv = process.env
): Y1ClickHouseConfig => ({
  url: requireExplicitUrl(env.LR_Y1_CLICKHOUSE_URL),
  database: safeDatabase(
    (env.LR_Y1_CLICKHOUSE_DATABASE || DEFAULT_Y1_CLICKHOUSE_DATABASE).trim()
  ),
})

// Optional presentation routing is an exact cohort/chromosome -> run-ID map.
// Its absence selects the accepted_frozen discovery path without changing it.
export const resolveY1PrimaryRunMap = (
  env: NodeJS.ProcessEnv = process.env
): Y1PrimaryRunMap | null => {
  const raw = (env.LR_Y1_RUN_MAP || '').trim()
  if (!raw) return null
  const parsed = parseJsonObject(raw, 'LR_Y1_RUN_MAP')
  const result: Y1PrimaryRunMap = new Map()
  for (const cohort of ['hgsvc_hprc', 'aou'] as const) {
    const cohortValue = parsed[cohort]
    if (cohortValue != null) {
      if (typeof cohortValue !== 'object' || Array.isArray(cohortValue)) {
        throw new Error(`LR_Y1_RUN_MAP.${cohort} must be a JSON object`)
      }
      const runs = new Map<string, string>()
      for (const [rawChrom, runId] of Object.entries(cohortValue)) {
        const chrom = normalizeChrom(rawChrom)
        if (!canonicalChroms.has(chrom)) {
          throw new Error(`LR_Y1_RUN_MAP contains noncanonical chromosome ${rawChrom}`)
        }
        if (runs.has(chrom)) throw new Error(`LR_Y1_RUN_MAP duplicates ${cohort}/${chrom}`)
        runs.set(chrom, safeRunId(runId, `${cohort}/${chrom}`))
      }
      if (runs.size) result.set(cohort, runs)
    }
  }
  const unknown = Object.keys(parsed).filter(
    (key) => key !== 'hgsvc_hprc' && key !== 'aou'
  )
  if (unknown.length) throw new Error(`LR_Y1_RUN_MAP contains unknown cohorts: ${unknown.join(', ')}`)
  if (!result.size) throw new Error('LR_Y1_RUN_MAP contains zero routed runs')
  return result
}

// Ancillary routing is separate because the presentation campaign stores each
// cohort/modality in an isolated database. AoU methylation is intentionally not
// configurable: no AoU sample-total source exists.
export const resolveY1AncillaryRoutes = (
  env: NodeJS.ProcessEnv = process.env
): Y1AncillaryRoute[] => {
  const raw = (env.LR_Y1_ANCILLARY_ROUTES || '').trim()
  if (!raw) return []
  const parsed = parseJsonObject(raw, 'LR_Y1_ANCILLARY_ROUTES')
  const routes: Y1AncillaryRoute[] = []
  for (const modality of ['coverage', 'str_histogram', 'methylation'] as const) {
    const modalityValue = parsed[modality]
    if (modalityValue != null) {
      if (typeof modalityValue !== 'object' || Array.isArray(modalityValue)) {
        throw new Error(`LR_Y1_ANCILLARY_ROUTES.${modality} must be a JSON object`)
      }
      for (const [cohort, value] of Object.entries(modalityValue)) {
        if (cohort !== 'hgsvc_hprc' && cohort !== 'aou') {
          throw new Error(`LR_Y1_ANCILLARY_ROUTES contains unknown cohort ${cohort}`)
        }
        if (modality === 'methylation' && cohort === 'aou') {
          throw new Error('AoU methylation cannot be configured without an AoU source')
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(`LR_Y1_ANCILLARY_ROUTES.${modality}.${cohort} must be an object`)
        }
        const entry = value as Record<string, unknown>
        routes.push({
          modality,
          cohort,
          database: safeDatabase(String(entry.database || '')),
          run_id: safeRunId(entry.run_id, `${modality}/${cohort}`),
        })
        const unknownKeys = Object.keys(entry).filter((key) => key !== 'database' && key !== 'run_id')
        if (unknownKeys.length) {
          throw new Error(
            `LR_Y1_ANCILLARY_ROUTES.${modality}.${cohort} contains unknown keys: ${unknownKeys.join(', ')}`
          )
        }
      }
    }
  }
  const unknownModalities = Object.keys(parsed).filter(
    (key) => key !== 'coverage' && key !== 'str_histogram' && key !== 'methylation'
  )
  if (unknownModalities.length) {
    throw new Error(`LR_Y1_ANCILLARY_ROUTES contains unknown modalities: ${unknownModalities.join(', ')}`)
  }
  return routes
}

// Fixtures that need a different database inject a complete config rather than
// inheriting process environment.
export const resolveY1ClickHouseConfigForTests = (
  config: Y1ClickHouseConfig
): Y1ClickHouseConfig => ({
  url: requireExplicitUrl(config.url),
  database: safeDatabase(config.database),
})

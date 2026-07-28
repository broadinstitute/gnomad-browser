import fs from 'fs'
import logger from '../../logger'
import {
  isY1Chr22MixedProvenanceEnabled,
  isY1PilotEnabled,
  prototypeAncillaryClickhouseClient,
} from '../../clickhouse'

export type AncillaryModality = 'coverage' | 'methylation' | 'str_histogram' | 'mqtl'
export type AncillaryDecision = {
  available: boolean
  source: 'LEGACY_V1' | 'MIXED_PROVENANCE_PROTOTYPE' | 'UNAVAILABLE'
  reason: string | null
}

const allowedModalities = new Set<AncillaryModality>(['coverage', 'methylation', 'str_histogram'])
const configuredModalities = new Set(
  (process.env.LR_Y1_PROTOTYPE_ANCILLARY_MODALITIES || '')
    .split(',').map((value) => value.trim()).filter(Boolean) as AncillaryModality[]
)
for (const modality of configuredModalities) {
  if (!allowedModalities.has(modality)) {
    throw new Error(`Unsupported prototype ancillary modality: ${modality}`)
  }
}

const capabilities = new Map<AncillaryModality, AncillaryDecision>()

export type MethylationAvailabilityStatus =
  | 'AVAILABLE_COMPLETE'
  | 'UNAVAILABLE_INCOMPLETE'
  | 'UNAVAILABLE_NO_ASSAY_SOURCE'
  | 'UNAVAILABLE_NO_CHR22'

export type MethylationSampleAvailability = {
  sample_id: string
  available: boolean
  status: MethylationAvailabilityStatus
  reason: string | null
}

let methylationAvailability: MethylationSampleAvailability[] = []

export const typedMethylationStatus = (status: string): MethylationAvailabilityStatus => {
  const normalized = status.toUpperCase() as MethylationAvailabilityStatus
  if (![
    'AVAILABLE_COMPLETE',
    'UNAVAILABLE_INCOMPLETE',
    'UNAVAILABLE_NO_ASSAY_SOURCE',
    'UNAVAILABLE_NO_CHR22',
  ].includes(normalized)) {
    throw new Error(`Unknown methylation availability status: ${status}`)
  }
  return normalized
}

export const methylationSampleAvailability = (
  cohort: string | null | undefined
): MethylationSampleAvailability[] => (
  ancillaryDecision(cohort, 'methylation').available ? methylationAvailability : []
)

export const filterAvailableMethylationSampleIds = (
  requested: string[] | null | undefined,
  roster: MethylationSampleAvailability[]
) => {
  const availableIds = new Set(roster.filter((row) => row.available).map((row) => row.sample_id))
  return (requested || [...availableIds]).filter((sampleId) => availableIds.has(sampleId))
}

export const ancillaryDecision = (
  cohort: string | null | undefined,
  modality: AncillaryModality,
  y1Enabled = isY1PilotEnabled,
  mixedEnabled = isY1Chr22MixedProvenanceEnabled
): AncillaryDecision => {
  if (cohort === 'aou') {
    return { available: false, source: 'UNAVAILABLE', reason: 'AoU is summary-only' }
  }
  if (!y1Enabled) {
    return { available: true, source: 'LEGACY_V1', reason: null }
  }
  if (!mixedEnabled || modality === 'mqtl') {
    return { available: false, source: 'UNAVAILABLE', reason: 'Not authorized for Y1 serving' }
  }
  return capabilities.get(modality) || {
    available: false,
    source: 'UNAVAILABLE',
    reason: configuredModalities.has(modality) ? 'Startup preflight did not pass' : 'Not allowlisted',
  }
}

// Compatibility helper retained for callers/tests that only need a boolean.
export const isAncillaryUnavailableForCohort = (
  cohort: string | null | undefined,
  y1Enabled = isY1PilotEnabled,
  mixedEnabled = isY1Chr22MixedProvenanceEnabled,
  modality: AncillaryModality = 'methylation'
) => !ancillaryDecision(cohort, modality, y1Enabled, mixedEnabled).available

const queryRows = async (query: string, query_params: Record<string, unknown> = {}) => {
  const result = await prototypeAncillaryClickhouseClient.query({
    query, query_params, format: 'JSONEachRow',
  })
  return (await result.json()) as any[]
}

const requireTable = async (table: string, requiredColumns: string[]) => {
  const schema = await queryRows(
    `SELECT name FROM system.columns WHERE database = currentDatabase() AND table = {table:String}`,
    { table }
  )
  const columns = new Set(schema.map((row) => row.name))
  const missing = requiredColumns.filter((column) => !columns.has(column))
  if (missing.length) throw new Error(`${table} is missing columns: ${missing.join(', ')}`)
}

const preflightCoverage = async () => {
  await requireTable('lr_y1_coverage', [
    'ancillary_run_id', 'release', 'cohort', 'reference_genome', 'modality',
    'source_version', 'chrom', 'position', 'mean', 'median', 'is_source_zero',
  ])
  const rows = await queryRows(`
    SELECT count() AS n, uniqExact(position) AS positions, min(position) AS min_position,
           max(position) AS max_position, countIf(chrom != 'chr22') AS out_of_scope
    FROM lr_y1_coverage
    WHERE release = 'y1' AND cohort = 'hgsvc_hprc'
      AND reference_genome = 'GRCh38' AND modality = 'sequencing_coverage'
  `)
  const row = rows[0] || {}
  if (
    Number(row.n) !== 50_818_468 || Number(row.positions) !== 50_818_468 ||
    Number(row.min_position) !== 1 || Number(row.max_position) !== 50_818_468 ||
    Number(row.out_of_scope) !== 0
  ) throw new Error('lr_y1_coverage does not match the pinned contiguous chr22 prototype')
}

const preflightStrHistogram = async () => {
  await requireTable('lr_str_histograms', [
    'chrom', 'position', 'end_position', 'motif', 'y1_source_variant_id',
    'mapping_status', 'source_label', 'source_receipt',
  ])
  const rows = await queryRows(`
    SELECT count() AS n, uniqExact(y1_source_variant_id) AS variants,
           countIf(chrom != 'chr22' OR mapping_status != 'available_exact'
             OR empty(source_label) OR empty(source_receipt)) AS invalid
    FROM lr_str_histograms
  `)
  if (Number(rows[0]?.n) !== 35_005 || Number(rows[0]?.variants) !== 35_005 || Number(rows[0]?.invalid) !== 0) {
    throw new Error('lr_str_histograms does not match the 35,005-row exact-key prototype')
  }
}

const preflightMethylation = async () => {
  const detailTable = 'lr_methylation_canonical_prototype'
  const summaryTable = 'lr_methylation_summary_canonical_prototype'
  const availabilityTable = 'lr_methylation_sample_availability_canonical_prototype'
  await requireTable(detailTable, ['chrom', 'pos1', 'pos2', 'methylation', 'coverage', 'sample_id', 'source_label'])
  await requireTable(summaryTable, [
    'chrom', 'pos1', 'pos2', 'mean_methylation', 'mean_coverage', 'observed_sample_count',
    'available_prototype_sample_count', 'std_methylation', 'min_methylation', 'max_methylation', 'source_label',
  ])
  await requireTable(availabilityTable, ['sample_id', 'availability', 'included', 'reason', 'source_label'])
  const allowlistPath = process.env.LR_Y1_PROTOTYPE_METHYLATION_SAMPLE_ALLOWLIST || ''
  if (!allowlistPath) throw new Error('Methylation requires a pinned available-sample allowlist file')
  const allowlist = new Set(
    fs.readFileSync(allowlistPath, 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
  )
  if (allowlist.size !== 210) throw new Error('Methylation allowlist must contain exactly 210 available samples')
  const availability = await queryRows(`
    SELECT sample_id, availability, included, reason
    FROM ${availabilityTable}
    ORDER BY sample_id
  `)
  const typedAvailability = availability.map((row) => ({
    sample_id: String(row.sample_id),
    available: Number(row.included) === 1,
    status: typedMethylationStatus(String(row.availability)),
    reason: String(row.reason || '').trim() || null,
  }))
  const available = availability.filter((row) => Number(row.included) === 1)
  const invalidUnavailable = availability.filter(
    (row) => Number(row.included) === 0 && (!row.availability || !String(row.availability).startsWith('unavailable_') || !String(row.reason).trim())
  )
  const observed = new Set(available.map((row) => row.sample_id as string))
  const identityMismatch = [...allowlist].some((sample) => !observed.has(sample)) ||
    [...observed].some((sample) => !allowlist.has(sample))
  if (availability.length !== 292 || available.length !== 210 || invalidUnavailable.length || identityMismatch) {
    throw new Error(
      `Methylation availability mismatch (roster=${availability.length}, available=${available.length}, ` +
      `invalid_unavailable=${invalidUnavailable.length}, identity_mismatch=${identityMismatch})`
    )
  }
  const counts = await queryRows(`
    SELECT
      (SELECT count() FROM ${detailTable}) AS detail_rows,
      (SELECT uniqExact(sample_id) FROM ${detailTable}) AS detail_samples,
      (SELECT count() FROM ${summaryTable}) AS summary_rows,
      (SELECT sum(observed_sample_count) FROM ${summaryTable}) AS summarized_rows,
      (SELECT countIf(available_prototype_sample_count != 210) FROM ${summaryTable}) AS bad_available_count
  `)
  const count = counts[0] || {}
  if (
    Number(count.detail_rows) !== 124_477_729 || Number(count.detail_samples) !== 210 ||
    Number(count.summary_rows) !== 655_358 || Number(count.summarized_rows) !== 124_477_729 ||
    Number(count.bad_available_count) !== 0
  ) throw new Error('Canonical methylation detail/summary counts do not match the pinned 210-sample prototype')
  methylationAvailability = typedAvailability
}

export const preflightPrototypeAncillaries = async () => {
  capabilities.clear()
  methylationAvailability = []
  if (!isY1Chr22MixedProvenanceEnabled) return
  const checks: Partial<Record<AncillaryModality, () => Promise<void>>> = {
    coverage: preflightCoverage,
    methylation: preflightMethylation,
    str_histogram: preflightStrHistogram,
  }
  const failures: string[] = []
  for (const modality of configuredModalities) {
    try {
      await checks[modality]!()
      capabilities.set(modality, { available: true, source: 'MIXED_PROVENANCE_PROTOTYPE', reason: null })
      logger.info(`Prototype ancillary preflight PASS: ${modality}`)
    } catch (error: any) {
      const reason = `Preflight failed: ${error.message}`
      capabilities.set(modality, { available: false, source: 'UNAVAILABLE', reason })
      failures.push(`${modality}: ${reason}`)
      logger.error(`Prototype ancillary preflight FAIL: ${modality}: ${reason}`)
    }
  }
  const isDefaultAllThree = allowedModalities.size === configuredModalities.size &&
    [...allowedModalities].every((modality) => configuredModalities.has(modality))
  if (failures.length && isDefaultAllThree) {
    throw new Error(`Required all-modality ancillary preflight failed: ${failures.join('; ')}`)
  }
  if (failures.length) {
    logger.warn(`GraphQL API starting with degraded ancillary capabilities: ${failures.join('; ')}`)
  }
}

export const prototypeAncillaryCapabilities = () => new Map(capabilities)

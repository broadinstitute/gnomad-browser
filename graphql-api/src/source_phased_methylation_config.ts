import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export const SOURCE_PHASED_METHYLATION_TABLE =
  'lr_y1_methylation_source_haplotype_presentation'
export const SOURCE_PHASED_COMPLETION_RECEIPT_SHA256 =
  'f259273f4c66ae18f80884cfbb6640a603e0708765a059a68e75bb1b85d23f85'
export const SOURCE_PHASED_SOURCE_MANIFEST_SHA256 =
  'cd12abd8ebef56f55d0c18c5d8db60bfe5672869a990c90932168d603cb2da69'
export const SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256 =
  '7aee998adbb40b50d920c81061dcec7437db04fd8d4c72ff12dfc40abe160c9a'

export type SourcePhasedMethylationContigReceipt = {
  chrom: string
  rows: number
  min_pos1: number
  max_pos2: number
  samples: number
  source_haplotypes: number
}

export type SourcePhasedMethylationServingReceipt = {
  schema_version: 1
  status: 'source_labelled_serving_approved'
  serving_mode: 'source_labelled_only'
  serving_pointer: true
  route_run_id: string
  database: string
  table: typeof SOURCE_PHASED_METHYLATION_TABLE
  cohort: 'hgsvc_hprc'
  reference_genome: 'GRCh38'
  scope: 'full_genome'
  completion_receipt_sha256: typeof SOURCE_PHASED_COMPLETION_RECEIPT_SHA256
  source_manifest_sha256: typeof SOURCE_PHASED_SOURCE_MANIFEST_SHA256
  browser_primary_vcf_manifest_bundle_sha256: typeof SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256
  detail_rows: number
  accepted_tasks: number
  failed_attempts: 0
  source_sample_count: number
  source_haplotype_values: [1, 2]
  source_sample_ids: string[]
  contigs: SourcePhasedMethylationContigReceipt[]
  vcf_orientation_joined: false
  orientation_status: 'unconfirmed_for_exact_browser_vcf'
  phase_set_semantics: 'source_track_has_no_phase_set'
  operator_confirmation: string
  missing_orientation_evidence: string
}

export type SourcePhasedMethylationRoute = {
  database: string
  run_id: string
  receipt_path: string
  receipt: SourcePhasedMethylationServingReceipt
}

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (value: Record<string, unknown>, keys: string[], label: string) => {
  const unknown = Object.keys(value).filter((key) => !keys.includes(key))
  const missing = keys.filter((key) => !(key in value))
  if (unknown.length || missing.length) {
    throw new Error(
      `${label} has invalid keys (missing=${missing.join(',') || 'none'}, unknown=${
        unknown.join(',') || 'none'
      })`
    )
  }
}

const nonemptyString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty`)
  return value
}

const positiveInteger = (value: unknown, label: string) => {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error(`${label} must be a positive integer`)
  }
  return Number(value)
}

const safeDatabase = (value: unknown) => {
  const database = nonemptyString(value, 'source-phased methylation database')
  if (!/^gnomad_lr_y1_[a-z0-9_]+$/.test(database)) {
    throw new Error(`Unsafe source-phased methylation database: ${database}`)
  }
  return database
}

const safeRunId = (value: unknown) => {
  const runId = nonemptyString(value, 'source-phased methylation run ID')
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/.test(runId)) {
    throw new Error('Unsafe source-phased methylation run ID')
  }
  return runId
}

const sha256File = (path: string, label: string) => {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex')
  } catch (error: any) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`)
  }
}

export const readSourcePhasedMethylationServingReceipt = (
  path: string
): SourcePhasedMethylationServingReceipt => {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error: any) {
    throw new Error(`Cannot read source-phased methylation receipt ${path}: ${error.message}`)
  }
  const receipt = object(raw, 'source-phased methylation receipt')
  exactKeys(
    receipt,
    [
      'schema_version',
      'status',
      'serving_mode',
      'serving_pointer',
      'route_run_id',
      'database',
      'table',
      'cohort',
      'reference_genome',
      'scope',
      'completion_receipt_sha256',
      'source_manifest_sha256',
      'browser_primary_vcf_manifest_bundle_sha256',
      'detail_rows',
      'accepted_tasks',
      'failed_attempts',
      'source_sample_count',
      'source_haplotype_values',
      'source_sample_ids',
      'contigs',
      'vcf_orientation_joined',
      'orientation_status',
      'phase_set_semantics',
      'operator_confirmation',
      'missing_orientation_evidence',
    ],
    'source-phased methylation receipt'
  )
  if (
    receipt.schema_version !== 1 ||
    receipt.status !== 'source_labelled_serving_approved' ||
    receipt.serving_mode !== 'source_labelled_only' ||
    receipt.serving_pointer !== true ||
    receipt.table !== SOURCE_PHASED_METHYLATION_TABLE ||
    receipt.cohort !== 'hgsvc_hprc' ||
    receipt.reference_genome !== 'GRCh38' ||
    receipt.scope !== 'full_genome' ||
    receipt.completion_receipt_sha256 !== SOURCE_PHASED_COMPLETION_RECEIPT_SHA256 ||
    receipt.source_manifest_sha256 !== SOURCE_PHASED_SOURCE_MANIFEST_SHA256 ||
    receipt.browser_primary_vcf_manifest_bundle_sha256 !== SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256 ||
    receipt.failed_attempts !== 0 ||
    receipt.vcf_orientation_joined !== false ||
    receipt.orientation_status !== 'unconfirmed_for_exact_browser_vcf' ||
    receipt.phase_set_semantics !== 'source_track_has_no_phase_set'
  ) {
    throw new Error('Source-phased methylation receipt is not the approved source-labelled contract')
  }

  const database = safeDatabase(receipt.database)
  const routeRunId = safeRunId(receipt.route_run_id)
  const detailRows = positiveInteger(receipt.detail_rows, 'receipt.detail_rows')
  const acceptedTasks = positiveInteger(receipt.accepted_tasks, 'receipt.accepted_tasks')
  const sourceSampleCount = positiveInteger(receipt.source_sample_count, 'receipt.source_sample_count')
  if (
    detailRows !== 12_162_269_986 ||
    acceptedTasks !== 10_392 ||
    sourceSampleCount !== 231 ||
    JSON.stringify(receipt.source_haplotype_values) !== '[1,2]' ||
    !Array.isArray(receipt.source_sample_ids) ||
    receipt.source_sample_ids.length !== sourceSampleCount
  ) {
    throw new Error('Source-phased methylation receipt has unexpected campaign totals')
  }
  const sourceSampleIds = receipt.source_sample_ids.map((value, index) =>
    nonemptyString(value, `receipt.source_sample_ids[${index}]`)
  )
  const sortedSampleIds = [...sourceSampleIds].sort()
  if (
    new Set(sourceSampleIds).size !== sourceSampleCount ||
    JSON.stringify(sourceSampleIds) !== JSON.stringify(sortedSampleIds)
  ) {
    throw new Error('Source-phased methylation source sample IDs must be unique and sorted')
  }
  if (!Array.isArray(receipt.contigs) || receipt.contigs.length !== 23) {
    throw new Error('Source-phased methylation receipt must contain 23 nonempty contigs')
  }
  const contigs = receipt.contigs.map((value, index) => {
    const row = object(value, `receipt.contigs[${index}]`)
    exactKeys(
      row,
      ['chrom', 'rows', 'min_pos1', 'max_pos2', 'samples', 'source_haplotypes'],
      `receipt.contigs[${index}]`
    )
    const parsed = {
      chrom: nonemptyString(row.chrom, `receipt.contigs[${index}].chrom`),
      rows: positiveInteger(row.rows, `receipt.contigs[${index}].rows`),
      min_pos1: positiveInteger(row.min_pos1, `receipt.contigs[${index}].min_pos1`),
      max_pos2: positiveInteger(row.max_pos2, `receipt.contigs[${index}].max_pos2`),
      samples: positiveInteger(row.samples, `receipt.contigs[${index}].samples`),
      source_haplotypes: positiveInteger(
        row.source_haplotypes,
        `receipt.contigs[${index}].source_haplotypes`
      ),
    }
    if (parsed.source_haplotypes !== 2 || (parsed.chrom !== 'chrX' && parsed.samples !== 231)) {
      throw new Error(`Source-phased methylation receipt has invalid shape for ${parsed.chrom}`)
    }
    return parsed
  })
  const expectedContigs = [
    ...Array.from({ length: 22 }, (_, index) => `chr${index + 1}`),
    'chrX',
  ].sort()
  if (
    JSON.stringify(contigs.map((row) => row.chrom).sort()) !== JSON.stringify(expectedContigs) ||
    contigs.find((row) => row.chrom === 'chrX')?.samples !== 114 ||
    new Set(contigs.map((row) => row.chrom)).size !== contigs.length ||
    contigs.reduce((total, row) => total + row.rows, 0) !== detailRows
  ) {
    throw new Error('Source-phased methylation contigs do not reconcile to campaign totals')
  }
  nonemptyString(receipt.operator_confirmation, 'receipt.operator_confirmation')
  nonemptyString(receipt.missing_orientation_evidence, 'receipt.missing_orientation_evidence')

  return {
    ...(receipt as unknown as SourcePhasedMethylationServingReceipt),
    database,
    route_run_id: routeRunId,
    detail_rows: detailRows,
    accepted_tasks: acceptedTasks,
    source_sample_count: sourceSampleCount,
    source_sample_ids: sourceSampleIds,
    contigs,
  }
}

export const resolveSourcePhasedMethylationRoute = (
  env: NodeJS.ProcessEnv = process.env
): SourcePhasedMethylationRoute | null => {
  const raw = (env.LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE || '').trim()
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE must be valid JSON')
  }
  const route = object(parsed, 'LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE')
  exactKeys(route, ['database', 'run_id', 'receipt_path'], 'LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE')
  const database = safeDatabase(route.database)
  const run_id = safeRunId(route.run_id)
  const receipt_path = nonemptyString(route.receipt_path, 'source-phased methylation receipt path')
  const receipt = readSourcePhasedMethylationServingReceipt(receipt_path)
  if (receipt.database !== database || receipt.route_run_id !== run_id) {
    throw new Error('Source-phased methylation route does not exactly match its serving receipt')
  }
  const primaryManifestPath = nonemptyString(
    env.LR_Y1_PRIMARY_MANIFEST_PATH,
    'LR_Y1_PRIMARY_MANIFEST_PATH'
  )
  if (
    sha256File(primaryManifestPath, 'LR Y1 primary manifest bundle') !==
    receipt.browser_primary_vcf_manifest_bundle_sha256
  ) {
    throw new Error('Source-phased methylation receipt does not bind the configured browser VCF bundle')
  }
  return { database, run_id, receipt_path, receipt }
}

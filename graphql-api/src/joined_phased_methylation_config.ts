import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import {
  readSourcePhasedMethylationServingReceipt,
  SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256,
  SOURCE_PHASED_COMPLETION_RECEIPT_SHA256,
  SOURCE_PHASED_METHYLATION_DATABASE,
  SOURCE_PHASED_METHYLATION_RUN_ID,
  SOURCE_PHASED_METHYLATION_TABLE,
  SOURCE_PHASED_SERVING_RECEIPT_SHA256,
  SOURCE_PHASED_SOURCE_MANIFEST_SHA256,
  type SourcePhasedMethylationRoute,
} from './source_phased_methylation_config'

export const JOINED_PHASED_ORIENTATION_RECEIPT_SHA256 =
  'e3d7c819e0cb8fb759d8ce1611eec1228ae3a40d6f9407cbbfbe50551809e460'
export const JOINED_PHASED_ORIENTATION_ROSTER_SHA256 =
  '836a1da4062879a27543d61971ea381b42dc5c8f13752c970c890e66d8d07a70'
const JOINED_PHASED_APPROVAL_STATEMENT =
  'Across all source-present HGSVC/HPRC samples and chr1-chr22 in the exact pinned browser VCF bundle, methylation source HAP1 is the first phased GT value (VCF strand 1) and HAP2 is the second phased GT value (VCF strand 2).'
const JOINED_PHASED_APPROVAL_STATEMENT_SHA256 =
  '108dbe49d6305f34fe9559b821912613c1748ecff65850261f0e2051023de6e1'
const JOINED_PHASED_APPROVAL_ARTIFACT_SHA256 =
  'ac8224a72ae98298e55be7debde87bd40c39840cd691a4fa169ce653d5a61df6'
export const JOINED_PHASED_MAX_SAMPLES = 25
export const JOINED_PHASED_MAX_RECORDS = 250_000

export type JoinedSourceStatus = 'source_present' | 'no_methylation_output' | 'source_marked_skip'

export type JoinedOrientationRosterEntry = {
  sample_id: string
  source_status: JoinedSourceStatus
}

export type JoinedBrowserEntry = {
  chrom: string
  run_id: string
  manifest_sha256: string
  carrier_loading_status: 'available'
  vcf: ImmutableBrowserObject
  tbi: ImmutableBrowserObject
}

type ImmutableBrowserObject = {
  uri: string
  generation: string
  size_bytes: number
  checksum_algorithm: 'md5_base64'
  checksum: string
}

export type JoinedPhasedMethylationOrientationReceipt = {
  schema_version: 1
  receipt_id: string
  status: 'operator_assumption_approved'
  issued_at: string
  approval_basis: {
    kind: 'operator_direct_mapping_assumption'
    statement: typeof JOINED_PHASED_APPROVAL_STATEMENT
    statement_sha256: typeof JOINED_PHASED_APPROVAL_STATEMENT_SHA256
    scope: string
    approved_role: 'gnomAD-LR operator'
    approved_at: string
    decision_artifact_ref: string
    decision_artifact_sha256: typeof JOINED_PHASED_APPROVAL_ARTIFACT_SHA256
    operator_instructed_assume_yes: true
    independently_machine_verified_lineage: false
    intermediate_objects_available_for_verification: false
    cryptographic_human_signature: false
    production_release_gate: string
  }
  source_product: {
    raw_serving_receipt_sha256: typeof SOURCE_PHASED_SERVING_RECEIPT_SHA256
    completion_receipt_sha256: typeof SOURCE_PHASED_COMPLETION_RECEIPT_SHA256
    completion_receipt_archived_generation: string
    source_manifest_sha256: typeof SOURCE_PHASED_SOURCE_MANIFEST_SHA256
    source_manifest_content_sha256: string
    pinned_original_object_inventory_sha256: string
    loaded_mirror_ledger_sha256: string
    loaded_mirror_ledger_content_sha256: string
    task_request_sha256: string
    database: typeof SOURCE_PHASED_METHYLATION_DATABASE
    table: typeof SOURCE_PHASED_METHYLATION_TABLE
    route_run_id: typeof SOURCE_PHASED_METHYLATION_RUN_ID
    object_count: 924
    accepted_tasks: 10392
    detail_rows: 12162269986
    source_present_samples: 231
  }
  browser_product: {
    primary_manifest_bundle_sha256: typeof SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256
    cohort: 'hgsvc_hprc'
    reference_genome: 'GRCh38'
    entries: JoinedBrowserEntry[]
  }
  mapping_contract: {
    scope: 'CHROMOSOME_WIDE'
    source_hap1_vcf_strand: 1
    source_hap2_vcf_strand: 2
    phase_set_semantics: 'NULL_BECAUSE_MAPPING_IS_CHROMOSOME_WIDE'
    parental_homolog_claim: false
    canonical_browser_ab_derived_at_render_time: true
  }
  coverage: {
    supported_cohort: 'hgsvc_hprc'
    supported_contigs: string[]
    roster: JoinedOrientationRosterEntry[]
    roster_count: 292
    source_present_count: 231
    no_output_count: 60
    source_marked_skip_count: 1
    unsupported_contigs: ['chrX', 'chrY']
  }
  exclusions: string[]
  integrity: {
    algorithm: 'sha256'
    receipt_strategy: string
    referenced_artifact_strategy: string
    self_hash_embedded: false
  }
}

export type JoinedPhasedMethylationRoute = {
  database: typeof SOURCE_PHASED_METHYLATION_DATABASE
  run_id: typeof SOURCE_PHASED_METHYLATION_RUN_ID
  raw_receipt_path: string
  orientation_receipt_path: string
  orientation_receipt_sha256: typeof JOINED_PHASED_ORIENTATION_RECEIPT_SHA256
  receipt: JoinedPhasedMethylationOrientationReceipt
  source_route: SourcePhasedMethylationRoute
}

const object = (value: unknown, label: string): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label} must be an object`)
  return value as Record<string, any>
}
const exactKeys = (value: Record<string, any>, keys: string[], label: string) => {
  const unknown = Object.keys(value).filter((key) => !keys.includes(key))
  const missing = keys.filter((key) => !(key in value))
  if (unknown.length || missing.length)
    throw new Error(
      `${label} has invalid keys (missing=${missing.join(',') || 'none'}, unknown=${
        unknown.join(',') || 'none'
      })`
    )
}
const string = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty`)
  return value
}
const sha256File = (path: string, label: string) => {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex')
  } catch (error: any) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`)
  }
}
const sha = (value: unknown, label: string) => {
  const parsed = string(value, label)
  if (!/^[a-f0-9]{64}$/.test(parsed)) throw new Error(`${label} must be a SHA-256`)
  return parsed
}

export const readJoinedPhasedMethylationOrientationReceipt = (
  path: string
): JoinedPhasedMethylationOrientationReceipt => {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error: any) {
    throw new Error(`Cannot read joined methylation orientation receipt ${path}: ${error.message}`)
  }
  const receipt = object(raw, 'joined methylation orientation receipt')
  exactKeys(
    receipt,
    [
      'approval_basis',
      'browser_product',
      'coverage',
      'exclusions',
      'integrity',
      'issued_at',
      'mapping_contract',
      'receipt_id',
      'schema_version',
      'source_product',
      'status',
    ],
    'joined methylation orientation receipt'
  )
  const approval = object(receipt.approval_basis, 'receipt.approval_basis')
  exactKeys(
    approval,
    [
      'approved_at',
      'approved_role',
      'cryptographic_human_signature',
      'decision_artifact_ref',
      'decision_artifact_sha256',
      'independently_machine_verified_lineage',
      'intermediate_objects_available_for_verification',
      'kind',
      'operator_instructed_assume_yes',
      'production_release_gate',
      'scope',
      'statement',
      'statement_sha256',
    ],
    'receipt.approval_basis'
  )
  const source = object(receipt.source_product, 'receipt.source_product')
  exactKeys(
    source,
    [
      'accepted_tasks',
      'completion_receipt_archived_generation',
      'completion_receipt_sha256',
      'database',
      'detail_rows',
      'loaded_mirror_ledger_content_sha256',
      'loaded_mirror_ledger_sha256',
      'object_count',
      'pinned_original_object_inventory_sha256',
      'raw_serving_receipt_sha256',
      'route_run_id',
      'source_manifest_content_sha256',
      'source_manifest_sha256',
      'source_present_samples',
      'table',
      'task_request_sha256',
    ],
    'receipt.source_product'
  )
  const browser = object(receipt.browser_product, 'receipt.browser_product')
  exactKeys(
    browser,
    ['cohort', 'entries', 'primary_manifest_bundle_sha256', 'reference_genome'],
    'receipt.browser_product'
  )
  const mapping = object(receipt.mapping_contract, 'receipt.mapping_contract')
  exactKeys(
    mapping,
    [
      'canonical_browser_ab_derived_at_render_time',
      'parental_homolog_claim',
      'phase_set_semantics',
      'scope',
      'source_hap1_vcf_strand',
      'source_hap2_vcf_strand',
    ],
    'receipt.mapping_contract'
  )
  const coverage = object(receipt.coverage, 'receipt.coverage')
  exactKeys(
    coverage,
    [
      'no_output_count',
      'roster',
      'roster_count',
      'source_marked_skip_count',
      'source_present_count',
      'supported_cohort',
      'supported_contigs',
      'unsupported_contigs',
    ],
    'receipt.coverage'
  )
  const integrity = object(receipt.integrity, 'receipt.integrity')
  exactKeys(
    integrity,
    ['algorithm', 'receipt_strategy', 'referenced_artifact_strategy', 'self_hash_embedded'],
    'receipt.integrity'
  )

  if (
    receipt.schema_version !== 1 ||
    receipt.status !== 'operator_assumption_approved' ||
    approval.kind !== 'operator_direct_mapping_assumption' ||
    approval.operator_instructed_assume_yes !== true ||
    approval.independently_machine_verified_lineage !== false ||
    approval.intermediate_objects_available_for_verification !== false ||
    approval.cryptographic_human_signature !== false ||
    approval.approved_role !== 'gnomAD-LR operator' ||
    approval.statement !== JOINED_PHASED_APPROVAL_STATEMENT ||
    approval.statement_sha256 !== JOINED_PHASED_APPROVAL_STATEMENT_SHA256 ||
    approval.decision_artifact_sha256 !== JOINED_PHASED_APPROVAL_ARTIFACT_SHA256
  )
    throw new Error('Joined methylation receipt lacks the exact operator-assumption approval basis')
  string(receipt.receipt_id, 'receipt.receipt_id')
  string(receipt.issued_at, 'receipt.issued_at')
  string(approval.statement, 'receipt.approval_basis.statement')
  string(approval.scope, 'receipt.approval_basis.scope')
  string(approval.approved_at, 'receipt.approval_basis.approved_at')
  string(approval.decision_artifact_ref, 'receipt.approval_basis.decision_artifact_ref')
  string(approval.production_release_gate, 'receipt.approval_basis.production_release_gate')
  if (
    !approval.scope.includes(SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256) ||
    approval.decision_artifact_ref !==
      'flow://rolling/implement-operator-approved-direct-methylation-ori-ecf9c6ce/briefing-1786042659.xml' ||
    approval.approved_at !== '2026-08-06T14:57:45.89893-04:00'
  )
    throw new Error(
      'Joined methylation receipt approval provenance is not the exact recorded decision'
    )
  if (
    source.raw_serving_receipt_sha256 !== SOURCE_PHASED_SERVING_RECEIPT_SHA256 ||
    source.completion_receipt_sha256 !== SOURCE_PHASED_COMPLETION_RECEIPT_SHA256 ||
    source.source_manifest_sha256 !== SOURCE_PHASED_SOURCE_MANIFEST_SHA256 ||
    source.database !== SOURCE_PHASED_METHYLATION_DATABASE ||
    source.table !== SOURCE_PHASED_METHYLATION_TABLE ||
    source.route_run_id !== SOURCE_PHASED_METHYLATION_RUN_ID ||
    source.object_count !== 924 ||
    source.accepted_tasks !== 10_392 ||
    source.detail_rows !== 12_162_269_986 ||
    source.source_present_samples !== 231
  )
    throw new Error('Joined methylation receipt does not bind the exact raw source product')
  ;[
    'source_manifest_content_sha256',
    'pinned_original_object_inventory_sha256',
    'loaded_mirror_ledger_sha256',
    'loaded_mirror_ledger_content_sha256',
    'task_request_sha256',
  ].forEach((key) => sha(source[key], `receipt.source_product.${key}`))
  if (
    browser.primary_manifest_bundle_sha256 !== SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256 ||
    browser.cohort !== 'hgsvc_hprc' ||
    browser.reference_genome !== 'GRCh38'
  )
    throw new Error('Joined methylation receipt does not bind the exact browser product')
  if (
    mapping.scope !== 'CHROMOSOME_WIDE' ||
    mapping.source_hap1_vcf_strand !== 1 ||
    mapping.source_hap2_vcf_strand !== 2 ||
    mapping.phase_set_semantics !== 'NULL_BECAUSE_MAPPING_IS_CHROMOSOME_WIDE' ||
    mapping.parental_homolog_claim !== false ||
    mapping.canonical_browser_ab_derived_at_render_time !== true
  )
    throw new Error(
      'Joined methylation receipt does not approve the exact direct chromosome-wide permutation'
    )

  const supportedContigs = Array.from({ length: 22 }, (_, i) => `chr${i + 1}`)
  if (
    coverage.supported_cohort !== 'hgsvc_hprc' ||
    JSON.stringify(coverage.supported_contigs) !== JSON.stringify(supportedContigs) ||
    JSON.stringify(coverage.unsupported_contigs) !== '["chrX","chrY"]' ||
    coverage.roster_count !== 292 ||
    coverage.source_present_count !== 231 ||
    coverage.no_output_count !== 60 ||
    coverage.source_marked_skip_count !== 1
  )
    throw new Error('Joined methylation receipt has invalid coverage scope')
  if (!Array.isArray(coverage.roster) || coverage.roster.length !== 292)
    throw new Error('Joined methylation receipt must contain the complete 292-sample roster')
  const roster = coverage.roster.map((value: unknown, index: number) => {
    const row = object(value, `receipt.coverage.roster[${index}]`)
    exactKeys(row, ['sample_id', 'source_status'], `receipt.coverage.roster[${index}]`)
    const sample_id = string(row.sample_id, `receipt.coverage.roster[${index}].sample_id`)
    if (
      !['source_present', 'no_methylation_output', 'source_marked_skip'].includes(row.source_status)
    )
      throw new Error(`Invalid source status for ${sample_id}`)
    return { sample_id, source_status: row.source_status as JoinedSourceStatus }
  })
  if (
    new Set(roster.map(({ sample_id }) => sample_id)).size !== 292 ||
    JSON.stringify(roster.map(({ sample_id }) => sample_id)) !==
      JSON.stringify(roster.map(({ sample_id }) => sample_id).sort())
  )
    throw new Error('Joined methylation roster must be unique and sorted')
  if (
    createHash('sha256').update(JSON.stringify(roster)).digest('hex') !==
    JOINED_PHASED_ORIENTATION_ROSTER_SHA256
  )
    throw new Error('Joined methylation exact 292-sample roster/classification mismatch')
  const counts = new Map<JoinedSourceStatus, number>()
  roster.forEach(({ source_status }) =>
    counts.set(source_status, (counts.get(source_status) || 0) + 1)
  )
  if (
    counts.get('source_present') !== 231 ||
    counts.get('no_methylation_output') !== 60 ||
    counts.get('source_marked_skip') !== 1
  )
    throw new Error('Joined methylation roster statuses do not reconcile')

  if (!Array.isArray(browser.entries) || browser.entries.length !== 22)
    throw new Error('Joined methylation receipt must bind 22 browser carrier manifests')
  const entries = browser.entries.map((value: unknown, index: number) => {
    const row = object(value, `receipt.browser_product.entries[${index}]`)
    exactKeys(
      row,
      ['carrier_loading_status', 'chrom', 'manifest_sha256', 'run_id', 'tbi', 'vcf'],
      `receipt.browser_product.entries[${index}]`
    )
    if (row.chrom !== supportedContigs[index] || row.carrier_loading_status !== 'available')
      throw new Error(
        'Joined methylation browser entries must exactly cover chr1-chr22 with carriers'
      )
    sha(row.manifest_sha256, `browser entry ${row.chrom} manifest`)
    string(row.run_id, `browser entry ${row.chrom} run`)
    for (const kind of ['vcf', 'tbi']) {
      const item = object(row[kind], `browser entry ${row.chrom}.${kind}`)
      exactKeys(
        item,
        ['checksum', 'checksum_algorithm', 'generation', 'size_bytes', 'uri'],
        `browser entry ${row.chrom}.${kind}`
      )
      if (
        item.checksum_algorithm !== 'md5_base64' ||
        !/^[1-9][0-9]*$/.test(item.generation) ||
        !Number.isSafeInteger(item.size_bytes) ||
        item.size_bytes < 1
      )
        throw new Error(`Invalid immutable ${kind} identity for ${row.chrom}`)
      string(item.uri, `${row.chrom}.${kind}.uri`)
      string(item.checksum, `${row.chrom}.${kind}.checksum`)
    }
    return row as JoinedBrowserEntry
  })
  if (
    !Array.isArray(receipt.exclusions) ||
    ![
      'aou',
      'source_absent',
      'sample_total',
      'cross_cohort',
      'fallback',
      'chrX',
      'chrY',
      'maternal_or_paternal_identity',
    ].every((x) => receipt.exclusions.includes(x))
  )
    throw new Error('Joined methylation receipt lacks explicit exclusions')
  if (integrity.algorithm !== 'sha256' || integrity.self_hash_embedded !== false)
    throw new Error('Joined methylation receipt has invalid integrity strategy')
  string(integrity.receipt_strategy, 'receipt.integrity.receipt_strategy')
  string(integrity.referenced_artifact_strategy, 'receipt.integrity.referenced_artifact_strategy')
  return {
    ...(receipt as JoinedPhasedMethylationOrientationReceipt),
    browser_product: { ...browser, entries } as any,
    coverage: { ...coverage, roster } as any,
  }
}

export const reconcileJoinedOrientationRoster = (
  receipt: JoinedPhasedMethylationOrientationReceipt,
  rawReceipt: SourcePhasedMethylationRoute['receipt']
) => {
  const orientationPresent = receipt.coverage.roster
    .filter((row) => row.source_status === 'source_present')
    .map((row) => row.sample_id)
  if (JSON.stringify(orientationPresent) !== JSON.stringify(rawReceipt.source_sample_ids))
    throw new Error(
      'Joined methylation source-present roster does not exactly match the admitted raw serving receipt'
    )
  const rawPresent = new Set(rawReceipt.source_sample_ids)
  for (const row of receipt.coverage.roster) {
    if ((row.source_status === 'source_present') !== rawPresent.has(row.sample_id))
      throw new Error(`Joined methylation source status mismatch for ${row.sample_id}`)
  }
}

export const resolveJoinedPhasedMethylationRoute = (
  env: NodeJS.ProcessEnv = process.env
): JoinedPhasedMethylationRoute | null => {
  const raw = (env.LR_Y1_JOINED_PHASED_METHYLATION_ROUTE || '').trim()
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('LR_Y1_JOINED_PHASED_METHYLATION_ROUTE must be valid JSON')
  }
  const route = object(parsed, 'LR_Y1_JOINED_PHASED_METHYLATION_ROUTE')
  exactKeys(
    route,
    [
      'database',
      'expected_orientation_receipt_sha256',
      'orientation_receipt_path',
      'raw_receipt_path',
      'run_id',
    ],
    'LR_Y1_JOINED_PHASED_METHYLATION_ROUTE'
  )
  const database = string(route.database, 'joined methylation database')
  const run_id = string(route.run_id, 'joined methylation run ID')
  const raw_receipt_path = string(route.raw_receipt_path, 'joined methylation raw receipt path')
  const orientation_receipt_path = string(
    route.orientation_receipt_path,
    'joined methylation orientation receipt path'
  )
  if (
    database !== SOURCE_PHASED_METHYLATION_DATABASE ||
    run_id !== SOURCE_PHASED_METHYLATION_RUN_ID ||
    route.expected_orientation_receipt_sha256 !== JOINED_PHASED_ORIENTATION_RECEIPT_SHA256 ||
    sha256File(raw_receipt_path, 'raw serving receipt') !== SOURCE_PHASED_SERVING_RECEIPT_SHA256 ||
    sha256File(orientation_receipt_path, 'orientation receipt') !==
      JOINED_PHASED_ORIENTATION_RECEIPT_SHA256
  )
    throw new Error('Joined methylation route is not the exact approved receipt/product')
  const primaryPath = string(env.LR_Y1_PRIMARY_MANIFEST_PATH, 'LR_Y1_PRIMARY_MANIFEST_PATH')
  if (
    sha256File(primaryPath, 'LR Y1 primary manifest bundle') !==
    SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256
  )
    throw new Error('Joined methylation route does not bind the configured browser VCF bundle')
  const sourceReceipt = readSourcePhasedMethylationServingReceipt(raw_receipt_path)
  const receipt = readJoinedPhasedMethylationOrientationReceipt(orientation_receipt_path)
  reconcileJoinedOrientationRoster(receipt, sourceReceipt)
  return {
    database: database as any,
    run_id: run_id as any,
    raw_receipt_path,
    orientation_receipt_path,
    orientation_receipt_sha256: JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
    receipt,
    source_route: {
      database: database as any,
      run_id: run_id as any,
      receipt_path: raw_receipt_path,
      receipt: sourceReceipt,
    },
  }
}

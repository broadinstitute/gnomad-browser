import {
  STR_CONTEXT_PROJECTION_VERSION,
  strContextDigest,
  isSupportedContextPrimaryDatabase,
  validateContextNamespaces,
} from './str_context_identity'
import type { Y1AncillaryReceipt } from './y1_admission_config'
import type { Y1AncillaryRoute, Y1Cohort } from './y1_config'

export { STR_CONTEXT_PROJECTION_VERSION, strContextDigest } from './str_context_identity'

// This candidate contract admits only raw, neutrally labelled observations, never primary binding.
export const STR_CONTEXT_COUNT_KEYS = [
  'source_rows',
  'canonical_rows',
  'distinct_contexts',
  'mapping_rows',
  'available_rows',
  'absent_rows',
  'ambiguous_rows',
  'compound_rows',
  'referenced_source_rows',
  'allele_available_rows',
  'pair_available_rows',
  'pair_missing_rows',
  'pair_invalid_rows',
  'equal_context_rows',
  'wider_context_rows',
  'vc_populated_rows',
  'primary_binding_not_established_rows',
  'primary_an_not_established_rows',
  'duplicate_source_keys',
  'duplicate_context_keys',
  'duplicate_mapping_keys',
  'orphan_mappings',
] as const
export type StrContextCounts = Record<(typeof STR_CONTEXT_COUNT_KEYS)[number], number>
export type StrContextReceipt = {
  schema_version: 2
  source_format: 'str_context_completion_v2'
  status: 'candidate_validated'
  candidate_only: true
  database: string
  run_id: string
  cohort: Y1Cohort
  modality: 'str_histogram'
  reference_genome: 'GRCh38'
  source: {
    uri: string
    generation: string
    byte_size: number
    md5_base64: string
    runtime_uri: string
    runtime_generation: string
    runtime_byte_size: number
    runtime_md5_base64: string
  }
  capture: {
    database: string
    run_id: string
    contract: 'updated_histogram_source_v1'
    parser_version: string
    header_sha256: string
    receipt_sha256: string
    source_map_sha256: string
    task_id: string
    worker_success: true
    eof_observed: true
    complete_body_identity_verified: true
    gcs_metadata_verified: true
    bytes_read: number
    computed_md5_base64: string
    data_rows_examined: number
    validated_rows: number
    rows_insert_acknowledged: number
    physical_rows: number
    unique_source_keys: number
    min_ordinal: number
    max_ordinal: number
    writer_fenced_and_revoked: true
  }
  projection: {
    instance_id: string
    version: typeof STR_CONTEXT_PROJECTION_VERSION
    rules_sha256: string
    coordinate_contract: 'SOURCE_NATIVE_EQUALS_CANONICAL_START0_END0'
    coordinate_evidence_sha256: string
    neutral_display_contract: 'SOURCE_SIZE_AND_ORIGINAL_PAIRS_V1'
    units: 'UNKNOWN'
    producer_version: 'UNKNOWN'
  }
  primary_snapshot: {
    database: string
    bundle_digest: string
    runs: {
      chrom: string
      run_id: string
      manifest_sha256: string
      accepted_task_attempt_digest: string
    }[]
  }
  counts: StrContextCounts
  contigs: ({ chrom: string } & StrContextCounts)[]
  writer_fenced_and_revoked: true
  receipt_digest: string
}

const object = (value: any, keys: readonly string[], label: string): any => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !(key in value))
  ) {
    throw new Error(`Invalid context receipt ${label} keys`)
  }
  return value
}
const text = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`Invalid context receipt ${label}`)
}
const digest = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    throw new Error(`Invalid context receipt ${label} digest`)
}
const integer = (value: unknown, label: string, min = 0) => {
  if (!Number.isSafeInteger(value) || Number(value) < min)
    throw new Error(`Invalid context receipt ${label} count`)
}
const checkCounts = (value: any, label: string) => {
  object(value, STR_CONTEXT_COUNT_KEYS, label)
  STR_CONTEXT_COUNT_KEYS.forEach((key) => integer(value[key], `${label}.${key}`))
  if (
    value.source_rows !== value.canonical_rows ||
    value.distinct_contexts !== value.source_rows ||
    value.mapping_rows !==
      value.available_rows + value.absent_rows + value.ambiguous_rows + value.compound_rows ||
    value.pair_available_rows + value.pair_missing_rows + value.pair_invalid_rows !==
      value.canonical_rows ||
    value.allele_available_rows > value.canonical_rows ||
    value.equal_context_rows + value.wider_context_rows !== value.canonical_rows ||
    value.vc_populated_rows > value.canonical_rows ||
    value.referenced_source_rows > value.available_rows ||
    value.referenced_source_rows > value.canonical_rows ||
    (value.available_rows > 0 && value.referenced_source_rows === 0) ||
    value.primary_binding_not_established_rows !== value.mapping_rows ||
    value.primary_an_not_established_rows !== value.mapping_rows ||
    [
      'duplicate_source_keys',
      'duplicate_context_keys',
      'duplicate_mapping_keys',
      'orphan_mappings',
    ].some((key) => value[key] !== 0)
  ) {
    throw new Error(`Inconsistent context receipt ${label}`)
  }
}

// This parser checks the sealed envelope, not external evidence. Admission/generation must
// resolve validateStrContextSourceMap against pinned local artifacts, compare checked-in
// rules, and reconcile physical tables + the *currently selected* primary snapshot.
export const parseStrContextReceipt = (
  input: unknown,
  expected: { database: string; run_id: string; cohort: Y1Cohort; modality: string }
): StrContextReceipt => {
  const r = object(
    input,
    [
      'schema_version',
      'source_format',
      'status',
      'candidate_only',
      'database',
      'run_id',
      'cohort',
      'modality',
      'reference_genome',
      'source',
      'capture',
      'projection',
      'primary_snapshot',
      'counts',
      'contigs',
      'writer_fenced_and_revoked',
      'receipt_digest',
    ],
    'root'
  )
  if (
    r.schema_version !== 2 ||
    r.source_format !== 'str_context_completion_v2' ||
    r.status !== 'candidate_validated' ||
    r.candidate_only !== true ||
    r.modality !== 'str_histogram' ||
    r.reference_genome !== 'GRCh38' ||
    r.writer_fenced_and_revoked !== true ||
    !/^[a-z0-9_]{1,80}$/.test(r.run_id) ||
    !['aou', 'hgsvc_hprc'].includes(r.cohort) ||
    !['database', 'run_id', 'cohort', 'modality'].every((key) => r[key] === (expected as any)[key])
  ) {
    throw new Error('Context receipt is not a matching fenced candidate product')
  }
  validateContextNamespaces(r)
  text(r.run_id, 'run_id')
  const s = object(
    r.source,
    [
      'uri',
      'generation',
      'byte_size',
      'md5_base64',
      'runtime_uri',
      'runtime_generation',
      'runtime_byte_size',
      'runtime_md5_base64',
    ],
    'source'
  )
  for (const prefix of ['', 'runtime_']) {
    if (
      typeof s[`${prefix}uri`] !== 'string' ||
      !/^gs:\/\/[^/]+\/.+/.test(s[`${prefix}uri`]) ||
      !/^[1-9][0-9]*$/.test(s[`${prefix}generation`]) ||
      !/^[A-Za-z0-9+/]{22}==$/.test(s[`${prefix}md5_base64`])
    )
      throw new Error('Invalid context source identity')
    integer(s[`${prefix}byte_size`], 'source bytes', 1)
  }
  if (s.byte_size !== s.runtime_byte_size || s.md5_base64 !== s.runtime_md5_base64) {
    throw new Error('Context runtime mirror identity differs from source')
  }
  const c = object(
    r.capture,
    [
      'database',
      'run_id',
      'contract',
      'parser_version',
      'header_sha256',
      'receipt_sha256',
      'source_map_sha256',
      'task_id',
      'worker_success',
      'eof_observed',
      'complete_body_identity_verified',
      'gcs_metadata_verified',
      'bytes_read',
      'computed_md5_base64',
      'data_rows_examined',
      'validated_rows',
      'rows_insert_acknowledged',
      'physical_rows',
      'unique_source_keys',
      'min_ordinal',
      'max_ordinal',
      'writer_fenced_and_revoked',
    ],
    'capture'
  )
  text(c.parser_version, 'parser version')
  text(c.task_id, 'capture task')
  digest(c.header_sha256, 'header')
  digest(c.receipt_sha256, 'capture receipt')
  digest(c.source_map_sha256, 'raw sourceMap')
  checkCounts(r.counts, 'counts')
  integer(r.counts.source_rows, 'source_rows', 1)
  if (
    c.contract !== 'updated_histogram_source_v1' ||
    c.parser_version !== 'updated_histogram_source_v1' ||
    [
      'worker_success',
      'eof_observed',
      'complete_body_identity_verified',
      'gcs_metadata_verified',
      'writer_fenced_and_revoked',
    ].some((key) => c[key] !== true) ||
    c.bytes_read !== s.byte_size ||
    c.computed_md5_base64 !== s.md5_base64 ||
    c.min_ordinal !== 1 ||
    [
      'data_rows_examined',
      'validated_rows',
      'rows_insert_acknowledged',
      'physical_rows',
      'unique_source_keys',
      'max_ordinal',
    ].some((key) => c[key] !== r.counts.source_rows)
  ) {
    throw new Error('Context capture does not establish whole-object physical identity')
  }
  const p = object(
    r.projection,
    [
      'instance_id',
      'version',
      'rules_sha256',
      'coordinate_contract',
      'coordinate_evidence_sha256',
      'neutral_display_contract',
      'units',
      'producer_version',
    ],
    'projection'
  )
  if (
    p.version !== STR_CONTEXT_PROJECTION_VERSION ||
    p.coordinate_contract !== 'SOURCE_NATIVE_EQUALS_CANONICAL_START0_END0' ||
    p.neutral_display_contract !== 'SOURCE_SIZE_AND_ORIGINAL_PAIRS_V1' ||
    p.units !== 'UNKNOWN' ||
    p.producer_version !== 'UNKNOWN'
  )
    throw new Error('Unsupported context projection contract')
  digest(p.rules_sha256, 'projection rules')
  digest(p.coordinate_evidence_sha256, 'coordinate evidence')
  const primary = object(
    r.primary_snapshot,
    ['database', 'bundle_digest', 'runs'],
    'primary_snapshot'
  )
  if (!isSupportedContextPrimaryDatabase(primary.database)) {
    throw new Error('Context primary snapshot must be an isolated candidate')
  }
  if (!Array.isArray(primary.runs) || primary.runs.length !== 24)
    throw new Error('Context primary snapshot requires 24 selected contigs')
  const chroms = new Set<string>()
  for (const run of primary.runs) {
    object(
      run,
      ['chrom', 'run_id', 'manifest_sha256', 'accepted_task_attempt_digest'],
      'primary run'
    )
    if (!/^chr([1-9]|1[0-9]|2[0-2]|X|Y)$/.test(run.chrom) || chroms.has(run.chrom))
      throw new Error('Invalid context primary contigs')
    chroms.add(run.chrom)
    text(run.run_id, 'primary run')
    digest(run.manifest_sha256, 'primary manifest')
    digest(run.accepted_task_attempt_digest, 'accepted attempts')
  }
  digest(primary.bundle_digest, 'primary bundle')
  if (
    primary.bundle_digest !==
    strContextDigest({
      database: primary.database,
      runs: [...primary.runs].sort((a, b) => a.chrom.localeCompare(b.chrom)),
    })
  ) {
    throw new Error('Context primary bundle digest mismatch')
  }
  if (!Array.isArray(r.contigs) || r.contigs.length !== 24)
    throw new Error('Context reconciliation requires 24 contigs')
  const seen = new Set<string>()
  for (const contig of r.contigs) {
    object(contig, ['chrom', ...STR_CONTEXT_COUNT_KEYS], 'contig')
    if (!chroms.has(contig.chrom) || seen.has(contig.chrom))
      throw new Error('Invalid context reconciliation contigs')
    seen.add(contig.chrom)
    const { chrom, ...counts } = contig
    checkCounts(counts, `contig ${chrom}`)
  }
  for (const key of STR_CONTEXT_COUNT_KEYS) {
    if (r.contigs.reduce((sum: number, row: any) => sum + row[key], 0) !== r.counts[key]) {
      throw new Error(`Context per-contig ${key} does not conserve global count`)
    }
  }
  digest(r.receipt_digest, 'receipt')
  const { receipt_digest, ...body } = r
  if (receipt_digest !== strContextDigest(body)) throw new Error('Context receipt digest mismatch')
  return r as StrContextReceipt
}

/** v2.3 keeps the v2.2 physical tuple unchanged. Original fields are provenance only. */
export const runtimeSourceIdentity = (source: StrContextReceipt['source']) => ({
  uri: source.runtime_uri,
  generation: source.runtime_generation,
  size_bytes: source.runtime_byte_size,
  md5_base64: source.runtime_md5_base64,
})

export const contextReceipt = (route: Y1AncillaryRoute): StrContextReceipt => {
  if (route.receipt.source_format !== 'str_context_completion_v2')
    throw new Error('Not a context-v2 route')
  const receipt = route.receipt.reconciliation as unknown as StrContextReceipt
  if (receipt.projection?.version !== STR_CONTEXT_PROJECTION_VERSION)
    throw new Error('Unsupported context projection contract; older versions are not reinterpreted')
  validateContextNamespaces(receipt)
  if (
    route.database !== receipt.database ||
    route.run_id !== receipt.capture.run_id ||
    route.cohort !== receipt.cohort
  )
    throw new Error('Context route does not match capture/projection identity')
  return receipt
}

export const normalizeStrContextReceipt = (receipt: StrContextReceipt): Y1AncillaryReceipt => ({
  schema_version: 1,
  status: 'completed',
  database: receipt.database,
  run_id: receipt.run_id,
  cohort: receipt.cohort,
  modality: 'str_histogram',
  source_format: 'str_context_completion_v2',
  job_uuid: null,
  receipts: { expected: 1, accepted: 1, failed_attempts: 0, rejects: 0 },
  reconciliation: receipt as unknown as Record<string, unknown>,
})

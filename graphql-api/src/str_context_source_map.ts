import { createHash } from 'node:crypto'
import { constants, closeSync, fstatSync, openSync, readSync } from 'node:fs'
import { TextDecoder } from 'node:util'
import { strContextDigest } from './str_context_identity'

/**
 * Local-only str-context-v2.3 original -> runtime -> capture DB/run identity gate. This is NOT GCS
 * authentication: SHA256 only pins bytes. verificationPath + verificationSha256
 * MUST come from independently trusted operator configuration, not the candidate
 * receipt. The operator attests generation-qualified metadata, successful create-
 * only copy (or an explicit direct read), and that the named capture receipt/task
 * captured this runtime object. Forging both a file and its trusted pin defeats
 * this trust model. No network, IAM, scientific, projection or serving admission
 * is performed here. The actual backend receipt embedded in the newly pinned
 * operator-v2 artifact is canonically hashed and validated, not inferred from
 * a hash-shaped claim. Existing sourceMap/metadata bytes are never rewritten.
 *
 * Verification JSON (all keys required; no additional keys except GCS metadata):
 * {schema_version:2, verification_kind:'str_context_source_map_operator_v2',
 *  source_map_sha256, captures:[{
 *    cohort, database, run_id, task_id, receipt_sha256, backend_receipt, expected_source_rows,
 *    original:Identity, runtime:Identity,
 *    metadata:[{cohort,kind:'original'|'runtime',pinned_generation_verified:true,
 *               metadata:<GCS JSON object, including id and mediaLink>}],
 *    read_evidence:{kind:'create_only_mirror',source_immutable_uri,
 *      destination_immutable_uri,if_generation_match:'0',status:'success'}
 *      OR {kind:'direct_read',immutable_uri,status:'success'}
 *  }]}
 * Identity uses exactly uri,generation,size_bytes,md5_base64,crc32c_base64,
 * immutable_uri. Existing histogram-mirror-manifest.json bytes and existing
 * original-runtime-metadata-verified.json records need no conversion. Each
 * capture binds the full identities and expected row count, not just a digest
 * with the right shape. direct_read requires original == runtime in every field.
 */
export type StrContextSourceMapArtifacts = {
  sourceMapPath: string
  verificationPath: string
  verificationSha256: string
}

export type StrContextSourceMapReceiptLike = {
  cohort: string
  run_id: string
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
  counts?: { source_rows: number; allele_available_rows: number }
  capture: {
    database: string
    run_id: string
    source_map_sha256: string
    receipt_sha256: string
    task_id: string
    physical_rows?: number
  }
}

type JsonObject = Record<string, any>
const fail: (label: string) => never = (label) => {
  throw new Error(`Invalid STR context source map: ${label}`)
}
const object = (value: unknown, label: string): JsonObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label)
  return value as JsonObject
}
const keys = (value: unknown, required: string[], label: string, optional: string[] = []) => {
  const o = object(value, label)
  if (
    required.some((key) => !Object.prototype.hasOwnProperty.call(o, key)) ||
    Object.keys(o).some((key) => !required.includes(key) && !optional.includes(key))
  )
    fail(`${label} keys`)
  return o
}
const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) fail(label)
  return value as string
}
const digest = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(`${label} SHA256`)
  return value as string
}
const count = (value: unknown, label: string) => {
  if (!Number.isSafeInteger(value) || Number(value) < 0) fail(`${label} count`)
}
const equal = (a: unknown, b: unknown, label: string) => {
  if (a !== b) fail(`${label} mismatch`)
}
const list = (value: unknown, label: string): any[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) fail(label)
  return value as any[]
}
const checksum = (value: unknown, bytes: number, label: string) => {
  if (typeof value !== 'string') fail(label)
  const decoded = Buffer.from(value as string, 'base64')
  if (decoded.length !== bytes || decoded.toString('base64') !== value) fail(label)
}

// Read at most 1 MiB + one sentinel byte, even if the file grows during reading.
// O_NONBLOCK and descriptor fstat also reject FIFOs/devices without blocking.
const pinnedJson = (path: unknown, sha: unknown, label: string): unknown => {
  const pin = digest(sha, label)
  // eslint-disable-next-line no-bitwise -- OS open flags must be combined, not interpreted as arithmetic.
  const fd = openSync(text(path, `${label} path`), constants.O_RDONLY | constants.O_NONBLOCK)
  try {
    const max = 1024 * 1024
    const stat = fstatSync(fd)
    if (!stat.isFile() || stat.size > max) fail(`${label} must be a regular file <= 1 MiB`)
    const bytes = Buffer.alloc(max + 1)
    let length = 0
    while (length < bytes.length) {
      const n = readSync(fd, bytes, length, bytes.length - length, null)
      if (!n) break
      length += n
    }
    if (length > max) fail(`${label} exceeds 1 MiB`)
    const raw = bytes.subarray(0, length)
    equal(createHash('sha256').update(raw).digest('hex'), pin, `${label} raw SHA256`)
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw))
  } finally {
    closeSync(fd)
  }
}

const IDENTITY_KEYS = [
  'uri',
  'generation',
  'size_bytes',
  'md5_base64',
  'crc32c_base64',
  'immutable_uri',
]
const identity = (value: unknown, label: string): JsonObject => {
  const i = keys(value, IDENTITY_KEYS, label)
  // URI is an unqualified object name, never a URL/query/fragment alias.
  if (typeof i.uri !== 'string' || !/^gs:\/\/[a-z0-9][a-z0-9._-]*\/[^?#\s]+$/.test(i.uri))
    fail(`${label} URI`)
  if (typeof i.generation !== 'string' || !/^[1-9][0-9]*$/.test(i.generation))
    fail(`${label} generation`)
  count(i.size_bytes, `${label} size_bytes`)
  checksum(i.md5_base64, 16, `${label} MD5`)
  checksum(i.crc32c_base64, 4, `${label} CRC32C`)
  equal(i.immutable_uri, `${i.uri}#${i.generation}`, `${label} immutable_uri`)
  return i
}
const sameIdentity = (a: JsonObject, b: JsonObject, label: string) => {
  IDENTITY_KEYS.forEach((key) => equal(a[key], b[key], `${label}.${key}`))
}
const sameBytes = (a: JsonObject, b: JsonObject, label: string) => {
  ;['size_bytes', 'md5_base64', 'crc32c_base64'].forEach((key) =>
    equal(a[key], b[key], `${label} equivalence ${key}`)
  )
}

const metadata = (records: unknown, entry: JsonObject) => {
  const seen = new Set<string>()
  for (const value of list(records, 'metadata')) {
    const r = keys(
      value,
      ['cohort', 'kind', 'metadata', 'pinned_generation_verified'],
      'metadata record'
    )
    equal(r.cohort, entry.cohort, 'metadata cohort')
    if (!['original', 'runtime'].includes(r.kind) || seen.has(r.kind)) fail('metadata roles')
    seen.add(r.kind)
    equal(r.pinned_generation_verified, true, 'metadata pinned_generation_verified')
    const i = entry[r.kind]
    const m = object(r.metadata, 'GCS metadata')
    const slash = i.uri.indexOf('/', 5)
    const bucket = i.uri.slice(5, slash)
    const name = i.uri.slice(slash + 1)
    equal(m.kind, 'storage#object', 'metadata kind')
    equal(m.bucket, bucket, 'metadata bucket')
    equal(m.name, name, 'metadata name')
    equal(m.generation, i.generation, 'metadata generation')
    equal(m.id, `${bucket}/${name}/${i.generation}`, 'metadata generation-qualified id')
    equal(m.size, String(i.size_bytes), 'metadata size')
    equal(m.md5Hash, i.md5_base64, 'metadata MD5')
    equal(m.crc32c, i.crc32c_base64, 'metadata CRC32C')
    const url = new URL(text(m.mediaLink, 'metadata mediaLink'))
    equal(url.origin, 'https://storage.googleapis.com', 'metadata mediaLink origin')
    equal(
      url.pathname,
      `/download/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}`,
      'metadata mediaLink object'
    )
    equal(
      url.searchParams.getAll('generation').length,
      1,
      'metadata mediaLink generation cardinality'
    )
    equal(url.searchParams.get('generation'), i.generation, 'metadata mediaLink generation')
    equal(url.searchParams.getAll('alt').length, 1, 'metadata mediaLink alt cardinality')
    equal(url.searchParams.get('alt'), 'media', 'metadata mediaLink alt')
    if (
      url.username ||
      url.password ||
      url.hash ||
      [...url.searchParams.keys()].some((k) => !['generation', 'alt'].includes(k))
    )
      fail('metadata mediaLink')
  }
  if (seen.size !== 2) fail('metadata requires both roles')
}

const readEvidence = (value: unknown, entry: JsonObject) => {
  const e = object(value, 'read_evidence')
  const direct = IDENTITY_KEYS.every((key) => entry.original[key] === entry.runtime[key])
  if (e.kind === 'direct_read') {
    keys(e, ['kind', 'immutable_uri', 'status'], 'direct_read evidence')
    if (!direct) fail('direct_read requires original == runtime')
    equal(e.immutable_uri, entry.original.immutable_uri, 'direct_read immutable_uri')
  } else if (e.kind === 'create_only_mirror') {
    keys(
      e,
      [
        'kind',
        'source_immutable_uri',
        'destination_immutable_uri',
        'if_generation_match',
        'status',
      ],
      'mirror evidence'
    )
    if (direct) fail('direct object requires explicit direct_read evidence')
    equal(e.source_immutable_uri, entry.original.immutable_uri, 'mirror source')
    equal(e.destination_immutable_uri, entry.runtime.immutable_uri, 'mirror destination')
    equal(e.if_generation_match, '0', 'mirror create-only precondition')
  } else fail('read_evidence kind')
  equal(e.status, 'success', 'read_evidence status')
}

export const validateStrContextSourceMap = (
  receiptLike: StrContextSourceMapReceiptLike,
  artifacts: StrContextSourceMapArtifacts
): void => {
  const r = object(receiptLike, 'receiptLike')
  const source = object(r.source, 'source')
  const capture = object(r.capture, 'capture')
  const a = keys(
    artifacts,
    ['sourceMapPath', 'verificationPath', 'verificationSha256'],
    'artifacts'
  )
  text(r.cohort, 'cohort')
  text(r.run_id, 'run_id')
  text(capture.database, 'capture database')
  equal(
    capture.database,
    `gnomad_lr_y1_scratch_histogram_${r.cohort}_${r.run_id}`,
    'capture database'
  )
  equal(capture.run_id, r.run_id, 'capture run_id')
  text(capture.task_id, 'capture task_id')
  digest(capture.receipt_sha256, 'capture receipt')
  const mapSha = digest(capture.source_map_sha256, 'source map')
  const map = keys(
    pinnedJson(a.sourceMapPath, mapSha, 'source map'),
    ['schema_version', 'objects'],
    'source map',
    ['observed_at', 'actual_pool_sa_read_proof']
  )
  equal(map.schema_version, 1, 'source map schema_version')
  if ('observed_at' in map) text(map.observed_at, 'source map observed_at')
  if ('actual_pool_sa_read_proof' in map)
    text(map.actual_pool_sa_read_proof, 'source map actual_pool_sa_read_proof')
  const entries = new Map<string, JsonObject>()
  for (const value of list(map.objects, 'source map objects')) {
    const entry = keys(
      value,
      ['cohort', 'original', 'runtime', 'expected_source_rows', 'verification'],
      'source map object'
    )
    const cohort = text(entry.cohort, 'map cohort')
    if (entries.has(cohort)) fail('duplicate source map cohort')
    identity(entry.original, 'map original')
    identity(entry.runtime, 'map runtime')
    sameBytes(entry.original, entry.runtime, 'map')
    count(entry.expected_source_rows, 'map expected_source_rows')
    text(entry.verification, 'map verification description') // Descriptive only; never evidence.
    entries.set(cohort, entry)
  }
  const entry = entries.get(r.cohort)
  if (!entry) fail('receipt cohort missing from source map')
  for (const [role, prefix] of [
    ['original', ''],
    ['runtime', 'runtime_'],
  ]) {
    for (const [field, mapField] of [
      ['uri', 'uri'],
      ['generation', 'generation'],
      ['byte_size', 'size_bytes'],
      ['md5_base64', 'md5_base64'],
    ]) {
      equal(source[`${prefix}${field}`], entry[role][mapField], `source ${role} ${field}`)
    }
  }
  if (Object.prototype.hasOwnProperty.call(capture, 'physical_rows')) {
    count(capture.physical_rows, 'capture physical_rows')
    equal(capture.physical_rows, entry.expected_source_rows, 'physical_rows')
  }
  const verification = keys(
    pinnedJson(a.verificationPath, a.verificationSha256, 'operator verification'),
    ['schema_version', 'verification_kind', 'source_map_sha256', 'captures'],
    'operator verification'
  )
  equal(verification.schema_version, 2, 'operator schema_version')
  equal(
    verification.verification_kind,
    'str_context_source_map_operator_v2',
    'operator verification_kind'
  )
  equal(verification.source_map_sha256, mapSha, 'operator source_map_sha256 linkage')
  const seen = new Set<string>()
  let matched = false
  for (const value of list(verification.captures, 'operator captures')) {
    const v = keys(
      value,
      [
        'cohort',
        'database',
        'run_id',
        'task_id',
        'receipt_sha256',
        'backend_receipt',
        'expected_source_rows',
        'original',
        'runtime',
        'metadata',
        'read_evidence',
      ],
      'operator capture'
    )
    text(v.cohort, 'operator cohort')
    text(v.run_id, 'operator run_id')
    text(v.task_id, 'operator task_id')
    digest(v.receipt_sha256, 'operator receipt_sha256')
    const captureKey = JSON.stringify([v.cohort, v.run_id, v.task_id])
    if (seen.has(captureKey)) fail('duplicate operator capture linkage')
    seen.add(captureKey)
    const mapped = entries.get(v.cohort)
    if (!mapped) fail('operator cohort missing from source map')
    sameIdentity(identity(v.original, 'operator original'), mapped.original, 'operator original')
    sameIdentity(identity(v.runtime, 'operator runtime'), mapped.runtime, 'operator runtime')
    equal(v.expected_source_rows, mapped.expected_source_rows, 'operator expected_source_rows')
    metadata(v.metadata, v)
    readEvidence(v.read_evidence, v)
    equal(
      v.database,
      `gnomad_lr_y1_scratch_histogram_${v.cohort}_${v.run_id}`,
      'operator capture database'
    )
    const backend = keys(
      v.backend_receipt,
      [
        'contract',
        'database',
        'cohort',
        'run_id',
        'task_id',
        'source_uri',
        'source_generation',
        'source_size_bytes',
        'source_md5_base64',
        'computed_md5_base64',
        'status',
        'completeness',
        'diagnostic',
        'gcs_metadata_verified',
        'eof_observed',
        'complete_body_identity_verified',
        'partial_writes_possible',
        'bytes_read',
        'data_rows_examined',
        'validated_rows',
        'rows_insert_attempted',
        'rows_insert_acknowledged',
        'zero_called_rows',
      ],
      'backend receipt'
    )
    equal(strContextDigest(backend), v.receipt_sha256, 'backend receipt canonical digest')
    for (const [key, expected] of Object.entries({
      contract: 'updated_histogram_source_v1',
      database: v.database,
      cohort: v.cohort,
      run_id: v.run_id,
      task_id: v.task_id,
      source_uri: v.runtime.uri,
      source_generation: v.runtime.generation,
      source_md5_base64: v.runtime.md5_base64,
      computed_md5_base64: v.runtime.md5_base64,
      status: 'complete_success',
      completeness: 'full',
      diagnostic: '',
      gcs_metadata_verified: true,
      eof_observed: true,
      complete_body_identity_verified: true,
      partial_writes_possible: false,
    }))
      equal(backend[key], expected, `backend receipt ${key}`)
    for (const [key, expected] of Object.entries({
      source_size_bytes: v.runtime.size_bytes,
      bytes_read: v.runtime.size_bytes,
      data_rows_examined: v.expected_source_rows,
      validated_rows: v.expected_source_rows,
      rows_insert_attempted: v.expected_source_rows,
      rows_insert_acknowledged: v.expected_source_rows,
    })) {
      if (
        typeof backend[key] !== 'number' &&
        !(typeof backend[key] === 'string' && /^(0|[1-9][0-9]*)$/.test(backend[key]))
      )
        fail(`backend receipt ${key} count`)
      count(Number(backend[key]), `backend receipt ${key}`)
      equal(Number(backend[key]), expected, `backend receipt ${key}`)
    }
    if (
      typeof backend.zero_called_rows !== 'number' &&
      !(
        typeof backend.zero_called_rows === 'string' &&
        /^(0|[1-9][0-9]*)$/.test(backend.zero_called_rows)
      )
    )
      fail('backend receipt zero_called_rows count')
    const zeroRows = Number(backend.zero_called_rows)
    count(zeroRows, 'backend receipt zero_called_rows')
    if (zeroRows > v.expected_source_rows)
      fail('backend receipt zero_called_rows exceeds validated rows')
    if (v.cohort === r.cohort && v.run_id === r.run_id && v.task_id === capture.task_id) {
      if (r.counts !== undefined) {
        const counts = object(r.counts, 'projection counts')
        count(counts.source_rows, 'projection source_rows')
        count(counts.allele_available_rows, 'projection allele_available_rows')
        equal(counts.source_rows, v.expected_source_rows, 'projection source_rows')
        equal(
          zeroRows,
          counts.source_rows - counts.allele_available_rows,
          'backend zero_called_rows projection reconciliation'
        )
      }
      equal(v.database, capture.database, 'operator capture database linkage')
      equal(v.receipt_sha256, capture.receipt_sha256, 'operator capture receipt digest linkage')
      matched = true
    }
  }
  if (!matched) fail('no operator capture matches cohort/run/task linkage')
}

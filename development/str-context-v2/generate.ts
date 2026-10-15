/* eslint-disable no-restricted-syntax, no-console -- Node-only streaming CLI: native async iterators and console diagnostics, no browser regenerator. */
// Offline only: no ClickHouse client, network, shell commands, or receipt authoring.
import { createHash } from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs'
import { once } from 'node:events'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { parseTrLocusId } from '../../dataset-metadata/longReadTrLocusId'
import {
  STR_CONTEXT_COUNT_KEYS,
  STR_CONTEXT_PROJECTION_VERSION,
  StrContextCounts,
  StrContextReceipt,
  parseStrContextReceipt,
  strContextDigest,
  runtimeSourceIdentity,
} from '../../graphql-api/src/str_context_admission'
import { validateStrContextSourceMap } from '../../graphql-api/src/str_context_source_map'
import {
  isSupportedContextPrimaryDatabase,
  validateContextNamespaces,
} from '../../graphql-api/src/str_context_identity'

const CHROMS = Array.from({ length: 22 }, (_, i) => `chr${i + 1}`).concat(['chrX', 'chrY'])
const CAPTURE_COLUMNS = [
  'contract',
  'cohort',
  'run_id',
  'task_id',
  'source_uri',
  'source_generation',
  'source_size_bytes',
  'source_md5_base64',
  'row_ordinal',
  'locus_id',
  'motif',
  'chrom',
  'locus_start',
  'locus_end',
  'source_interval',
  'context_chrom',
  'context_start',
  'context_end',
  'source_vc',
  'num_called_alleles',
  'unique_allele_lengths',
  'source_header',
  'source_fields',
]
const targetColumns = [
  'canonical_locus_id',
  'cohort',
  'reference_genome',
  'primary_database',
  'primary_snapshot_digest',
  'primary_run_id',
]
const check: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message)
}
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const uint = (value: unknown, label: string, max = Number.MAX_SAFE_INTEGER): number => {
  check(
    typeof value === 'number' || (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)),
    `Invalid ${label}`
  )
  const n = Number(value)
  check(Number.isSafeInteger(n) && n >= 0 && n <= max, `Invalid ${label}`)
  return n
}
const keys = (value: any, expected: string[], label: string) => {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === expected.length &&
      expected.every((k) => Object.prototype.hasOwnProperty.call(value, k)),
    `Invalid ${label} keys`
  )
}
const empty = (value: string) => value === '' || value === '.'
const newCounts = () =>
  Object.fromEntries(STR_CONTEXT_COUNT_KEYS.map((key) => [key, 0])) as StrContextCounts
const interval = (value: unknown) => {
  check(typeof value === 'string', 'Invalid source interval')
  const m = /^([1-9]|1\d|2[0-2]|X|Y):(\d+)-(\d+)$/.exec(value)
  check(m, 'Invalid source interval')
  const start = uint(m[2], 'interval start', 0xffffffff)
  const end = uint(m[3], 'interval end', 0xffffffff)
  check(start < end, 'Invalid interval ordering')
  return { chrom: m[1], start, end }
}

export type ProjectionManifest = {
  database: string
  run_id: string
  cohort: 'hgsvc_hprc' | 'aou'
  reference_genome: 'GRCh38'
  source: StrContextReceipt['source']
  projection: StrContextReceipt['projection']
  primary_snapshot: StrContextReceipt['primary_snapshot']
  // Operator-supplied evidence pointers are NOT verified by this offline utility.
  evidence: {
    writer_fence_sha256: string
    worker_success_sha256: string
    primary_export_sha256: string
    source_map_sha256: string
  }
  // Local artifacts are read and checked; operator verification remains an external trust gate.
  source_map_artifacts: {
    sourceMapPath: string
    verificationPath: string
    verificationSha256: string
  }
  capture: {
    database: string
    run_id: string
    parser_version: string
    header_sha256: string
    receipt_sha256: string
  }
  capture_receipt: Record<string, any>
  exports: { capture_sha256: string; targets_sha256: string }
}

/** Bounded identity diagnostic shared by receipt and every physical row. Passing this
 * alone is NOT projection/admission: map, EOF, counts, primary and evidence gates follow. */
export function validatePhysicalCaptureIdentity(
  row: Record<string, unknown>,
  expected: {
    version: string
    source: StrContextReceipt['source']
    cohort: string
    run_id: string
    task_id: string
  }
) {
  check(expected.version === STR_CONTEXT_PROJECTION_VERSION, 'Unsupported projection rules')
  const physical = runtimeSourceIdentity(expected.source)
  for (const [key, value] of Object.entries({
    contract: 'updated_histogram_source_v1',
    cohort: expected.cohort,
    run_id: expected.run_id,
    task_id: expected.task_id,
    source_uri: physical.uri,
    source_generation: physical.generation,
    source_md5_base64: physical.md5_base64,
  }))
    check(row[key] === value, `Capture ${key} mismatch`)
  check(uint(row.source_size_bytes, 'source bytes') === physical.size_bytes, 'Source size mismatch')
}

function validateManifest(m: ProjectionManifest) {
  check(
    m && ['hgsvc_hprc', 'aou'].includes(m.cohort) && /^[a-z0-9_]{1,80}$/.test(m.run_id),
    'Invalid campaign'
  )
  validateContextNamespaces(m)
  check(m.reference_genome === 'GRCh38', 'Invalid candidate/reference')
  const rules = sha(readFileSync(join(__dirname, 'contract.json')))
  check(
    m.projection.version === STR_CONTEXT_PROJECTION_VERSION &&
      m.projection.rules_sha256 === rules &&
      m.projection.coordinate_contract === 'SOURCE_NATIVE_EQUALS_CANONICAL_START0_END0' &&
      m.projection.neutral_display_contract === 'SOURCE_SIZE_AND_ORIGINAL_PAIRS_V1' &&
      m.projection.units === 'UNKNOWN' &&
      m.projection.producer_version === 'UNKNOWN',
    'Unsupported projection rules'
  )
  for (const value of [
    m.projection.coordinate_evidence_sha256,
    ...Object.values(m.evidence),
    m.capture.header_sha256,
    m.capture.receipt_sha256,
    ...Object.values(m.exports),
  ]) {
    check(
      typeof value === 'string' && /^[a-f0-9]{64}$/.test(value),
      'Missing evidence/export digest'
    )
  }
  check(
    m.capture.parser_version === 'updated_histogram_source_v1' &&
      m.evidence.writer_fence_sha256 &&
      m.evidence.worker_success_sha256 &&
      m.evidence.primary_export_sha256 &&
      /^[a-f0-9]{64}$/.test(m.evidence.source_map_sha256),
    'Missing prerequisite evidence or unsupported capture parser'
  )
  const source = m.source
  for (const prefix of ['', 'runtime_'] as const) {
    check(
      /^gs:\/\/[^/]+\/.+/.test(source[`${prefix}uri`]) &&
        /^[1-9][0-9]*$/.test(source[`${prefix}generation`]) &&
        /^[A-Za-z0-9+/]{22}==$/.test(source[`${prefix}md5_base64`]) &&
        uint(source[`${prefix}byte_size`], 'source bytes') > 0,
      'Invalid source identity'
    )
  }
  check(
    source.byte_size === source.runtime_byte_size &&
      source.md5_base64 === source.runtime_md5_base64,
    'Runtime mirror mismatch'
  )
  const r = m.capture_receipt
  const physical = runtimeSourceIdentity(source)
  check(strContextDigest(r) === m.capture.receipt_sha256, 'Capture receipt digest mismatch')
  validateStrContextSourceMap(
    {
      cohort: m.cohort,
      run_id: m.run_id,
      source,
      capture: {
        database: m.capture.database,
        run_id: m.capture.run_id,
        source_map_sha256: m.evidence.source_map_sha256,
        receipt_sha256: m.capture.receipt_sha256,
        task_id: r.task_id,
        physical_rows: uint(r.validated_rows, 'validated rows'),
      },
    },
    m.source_map_artifacts
  )
  validatePhysicalCaptureIdentity(r, {
    version: m.projection.version,
    source,
    cohort: m.cohort,
    run_id: m.run_id,
    task_id: r.task_id,
  })
  const expected = {
    database: m.capture.database,
    status: 'complete_success',
    completeness: 'full',
    diagnostic: '',
    gcs_metadata_verified: true,
    eof_observed: true,
    complete_body_identity_verified: true,
    partial_writes_possible: false,
    computed_md5_base64: physical.md5_base64,
  }
  for (const [key, value] of Object.entries(expected))
    check(r[key] === value, `Capture receipt ${key} mismatch`)
  check(typeof r.task_id === 'string' && r.task_id.length > 0, 'Missing capture task')
  check(
    uint(r.source_size_bytes, 'source bytes') === physical.size_bytes &&
      uint(r.bytes_read, 'bytes read') === physical.size_bytes,
    'Capture byte count mismatch'
  )
  const n = uint(r.validated_rows, 'validated rows')
  check(
    n > 0 &&
      ['data_rows_examined', 'rows_insert_attempted', 'rows_insert_acknowledged'].every(
        (k) => uint(r[k], k) === n
      ),
    'Incomplete capture rows'
  )
  check(uint(r.zero_called_rows, 'zero rows') <= n, 'Invalid zero-call count')
  const p = m.primary_snapshot
  check(isSupportedContextPrimaryDatabase(p.database), 'Invalid primary database')
  check(
    p.runs.length === 24 && new Set(p.runs.map((run) => run.chrom)).size === 24,
    'Primary requires 24 unique contigs'
  )
  for (const run of p.runs)
    check(
      CHROMS.includes(run.chrom) &&
        typeof run.run_id === 'string' &&
        run.run_id &&
        /^[a-f0-9]{64}$/.test(run.manifest_sha256) &&
        /^[a-f0-9]{64}$/.test(run.accepted_task_attempt_digest),
      'Invalid primary run'
    )
  check(
    p.bundle_digest ===
      strContextDigest({
        database: p.database,
        runs: [...p.runs].sort((a, b) => a.chrom.localeCompare(b.chrom)),
      }),
    'Primary snapshot digest mismatch'
  )
  return n
}

async function scan(
  path: string,
  expectedDigest: string,
  visit: (row: any) => Promise<void> | void
) {
  const stream = createReadStream(path)
  const hash = createHash('sha256')
  stream.on('data', (data) => hash.update(data))
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  // readline does not forward input-stream errors.
  stream.on('error', () => lines.close())
  try {
    for await (const line of lines) {
      check(line.length > 0, 'Blank JSONL row')
      await visit(JSON.parse(line))
    }
    check(!stream.errored, 'Input stream failed')
    check(hash.digest('hex') === expectedDigest, 'Export SHA256 mismatch')
  } finally {
    lines.close()
    stream.destroy()
  }
}

/** Counts are unsigned observations, not scientific acceptance. An optional already sealed
 * operator receipt is checked, never generated. Output directory must not exist.
 */
export async function generate(
  manifest: ProjectionManifest,
  capturePath: string,
  targetPath: string,
  outputDir: string,
  receiptInput?: unknown
) {
  const expectedRows = validateManifest(manifest)
  const physical = runtimeSourceIdentity(manifest.source)
  const receipt =
    receiptInput === undefined
      ? null
      : parseStrContextReceipt(receiptInput, {
          database: manifest.database,
          run_id: manifest.run_id,
          cohort: manifest.cohort,
          modality: 'str_histogram',
        })
  if (receipt) {
    for (const key of ['source', 'projection', 'primary_snapshot'] as const) {
      check(
        strContextDigest(receipt[key]) === strContextDigest(manifest[key]),
        `Receipt ${key} mismatch`
      )
    }
    check(
      receipt.capture.database === manifest.capture.database &&
        receipt.capture.run_id === manifest.capture.run_id &&
        receipt.capture.source_map_sha256 === manifest.evidence.source_map_sha256 &&
        receipt.capture.receipt_sha256 === manifest.capture.receipt_sha256 &&
        receipt.capture.header_sha256 === manifest.capture.header_sha256 &&
        receipt.capture.parser_version === manifest.capture.parser_version &&
        receipt.capture.task_id === manifest.capture_receipt.task_id,
      'Receipt capture mismatch'
    )
  }
  mkdirSync(outputDir) // Exclusive new directory; partial failures are never silently reused.
  const streams = ['histograms.jsonl', 'mapping.jsonl'].map((file) =>
    createWriteStream(join(outputDir, file), { flags: 'wx' })
  )
  const hashes = streams.map(() => createHash('sha256'))
  let outputError: Error | null = null
  streams.forEach((stream) =>
    stream.on('error', (error) => {
      outputError = error
    })
  )
  const emit = async (index: number, row: any) => {
    if (outputError) throw outputError
    const line = `${JSON.stringify(row)}\n`
    hashes[index].update(line)
    if (!streams[index].write(line)) await once(streams[index], 'drain')
  }
  const contigs = CHROMS.map((chrom) => ({ chrom, ...newCounts() }))
  const byChrom = new Map(contigs.map((c) => [c.chrom.slice(3), c]))
  const contexts = new Set<string>()
  // Keep only mapping indexes, not multi-GB source payloads, in memory.
  const named = new Map<string, { count: number; ordinal: string }>()
  const targets = new Set<string>()
  const references = new Set<string>()
  let rowCount = 0
  let zeroCount = 0
  const stamp = {
    projection_version: STR_CONTEXT_PROJECTION_VERSION,
    receipt_digest: receipt?.receipt_digest || '',
  }
  try {
    await scan(capturePath, manifest.exports.capture_sha256, async (row) => {
      keys(row, CAPTURE_COLUMNS, 'capture')
      rowCount += 1
      // Export sorted by ordinal; complete sequence detects duplicates, gaps and mixed runs.
      check(
        uint(row.row_ordinal, 'row ordinal') === rowCount,
        'Duplicate/missing/out-of-order physical ordinal'
      )
      validatePhysicalCaptureIdentity(row, {
        version: manifest.projection.version,
        source: manifest.source,
        cohort: manifest.cohort,
        run_id: manifest.run_id,
        task_id: manifest.capture_receipt.task_id,
      })
      const locus = parseTrLocusId(row.locus_id)
      check(
        locus && locus.components.length === 1 && locus.canonicalId === row.locus_id,
        'Source is not one canonical named component'
      )
      const component = locus.components[0]
      check(
        /^[ACGTN]+$/.test(component.motif) &&
          component.chrom === row.chrom &&
          component.motif === row.motif &&
          component.start0 === uint(row.locus_start, 'locus start', 0xffffffff) &&
          component.end0 === uint(row.locus_end, 'locus end', 0xffffffff),
        'Source component mismatch'
      )
      const context = interval(row.source_interval)
      check(
        context.chrom === row.chrom &&
          context.start <= component.start0 &&
          context.end >= component.end0 &&
          context.chrom === row.context_chrom &&
          context.start === uint(row.context_start, 'context start') &&
          context.end === uint(row.context_end, 'context end'),
        'Context containment/helper mismatch'
      )
      check(
        Array.isArray(row.source_header) &&
          row.source_header.every((h: unknown) => typeof h === 'string') &&
          new Set(row.source_header).size === row.source_header.length &&
          strContextDigest(row.source_header) === manifest.capture.header_sha256,
        'Header mismatch'
      )
      keys(row.source_fields, row.source_header, 'source fields')
      check(
        Object.values(row.source_fields).every((cell) => typeof cell === 'string'),
        'Non-string source field'
      )
      const fields = row.source_fields
      check(
        fields.LocusId === row.locus_id &&
          fields.Motif === row.motif &&
          fields.Interval === row.source_interval &&
          typeof fields.VC === 'string' &&
          (empty(fields.VC) ? null : fields.VC) === row.source_vc,
        'Raw helper mismatch'
      )
      if (!empty(fields.VC)) interval(fields.VC)
      check(
        uint(fields.NumCalledAlleles, 'raw AN', 0xffffffff) ===
          uint(row.num_called_alleles, 'AN', 0xffffffff) &&
          uint(fields.UniqueAlleleLengths, 'raw unique', 0xffffffff) ===
            uint(row.unique_allele_lengths, 'unique', 0xffffffff),
        'Count helper mismatch'
      )
      check(
        typeof fields.AlleleSizeHistogram === 'string' &&
          typeof fields.BiallelicHistogram === 'string',
        'Missing captured histogram'
      )
      const key = JSON.stringify([
        row.cohort,
        row.run_id,
        row.source_uri,
        row.source_generation,
        row.locus_id,
        row.source_interval,
        fields.VC,
      ])
      check(
        !contexts.has(key),
        'Duplicate logical context (even identical payload requires reconciliation)'
      )
      contexts.add(key)
      const prior = named.get(row.locus_id)
      named.set(row.locus_id, { count: (prior?.count || 0) + 1, ordinal: String(row.row_ordinal) })
      const c = byChrom.get(row.chrom)!
      c.source_rows += 1
      c.canonical_rows += 1
      c.distinct_contexts += 1
      if (Number(row.num_called_alleles) > 0) c.allele_available_rows += 1
      else zeroCount += 1
      if (empty(fields.BiallelicHistogram)) c.pair_missing_rows += 1
      else c.pair_available_rows += 1
      if (context.start === component.start0 && context.end === component.end0)
        c.equal_context_rows += 1
      else c.wider_context_rows += 1
      if (!empty(fields.VC)) c.vc_populated_rows += 1
      const projected = { ...row, ...stamp }
      // Serving API is bounded at 200 KiB; fail rather than truncate captured fields.
      check(
        Buffer.byteLength(JSON.stringify(projected)) <= 200 * 1024,
        'Source row exceeds serving payload bound'
      )
      await emit(0, projected)
    })
    check(
      rowCount === expectedRows &&
        zeroCount === uint(manifest.capture_receipt.zero_called_rows, 'zero rows'),
      'Capture row-count reconciliation failed'
    )
    await scan(targetPath, manifest.exports.targets_sha256, async (target) => {
      keys(target, targetColumns, 'target')
      const locus = parseTrLocusId(target.canonical_locus_id)
      check(
        locus && locus.canonicalId === target.canonical_locus_id,
        'Target must use authoritative canonical ID'
      )
      // Parser guarantees same contig for every component; no named-component choice for compounds.
      const chroms = new Set(locus.components.map((component) => component.chrom))
      check(chroms.size === 1, 'Compound components must share a chromosome')
      const chrom = [...chroms][0]
      check(
        target.cohort === manifest.cohort &&
          target.reference_genome === manifest.reference_genome &&
          target.primary_database === manifest.primary_snapshot.database &&
          target.primary_snapshot_digest === manifest.primary_snapshot.bundle_digest &&
          target.primary_run_id ===
            manifest.primary_snapshot.runs.find((run) => run.chrom === `chr${chrom}`)?.run_id,
        'Target snapshot mismatch'
      )
      check(!targets.has(target.canonical_locus_id), 'Duplicate canonical target')
      targets.add(target.canonical_locus_id)
      const single = locus.components.length === 1
      const component = single ? locus.components[0] : null
      const eligible = single ? named.get(locus.canonicalId) : undefined
      const n = eligible?.count || 0
      let status = 'unavailable_ambiguous'
      if (!single) status = 'unavailable_compound'
      else if (n === 0) status = 'unavailable_no_context'
      else if (n === 1) status = 'available_source_context'
      const selected = single && n === 1
      const c = byChrom.get(chrom)!
      c.mapping_rows += 1
      c.primary_binding_not_established_rows += 1
      c.primary_an_not_established_rows += 1
      if (!single) c.compound_rows += 1
      else if (n === 0) c.absent_rows += 1
      else if (n > 1) c.ambiguous_rows += 1
      else {
        c.available_rows += 1
        if (!references.has(eligible!.ordinal)) {
          references.add(eligible!.ordinal)
          c.referenced_source_rows += 1
        }
      }
      await emit(1, {
        cohort: manifest.cohort,
        ancillary_run_id: manifest.run_id,
        primary_database: manifest.primary_snapshot.database,
        primary_snapshot_digest: manifest.primary_snapshot.bundle_digest,
        canonical_locus_id: locus.canonicalId,
        component_index: single ? 0 : 0xffffffff,
        chrom,
        named_start: component?.start0 ?? null,
        named_end: component?.end0 ?? null,
        motif: component?.motif ?? null,
        mapping_status: status,
        context_count: n,
        source_uri: selected ? physical.uri : null,
        source_generation: selected ? physical.generation : null,
        source_row_ordinal: selected ? eligible!.ordinal : null,
        primary_binding_status: 'NOT_ESTABLISHED',
        primary_an_concordance: 'NOT_ESTABLISHED',
        ...stamp,
      })
    })
    const counts = newCounts()
    STR_CONTEXT_COUNT_KEYS.forEach((key) => {
      counts[key] = contigs.reduce((sum, c) => sum + c[key], 0)
    })
    if (receipt) {
      check(
        strContextDigest(receipt.counts) === strContextDigest(counts),
        'Receipt global counts mismatch'
      )
      check(
        strContextDigest([...receipt.contigs].sort((a, b) => a.chrom.localeCompare(b.chrom))) ===
          strContextDigest([...contigs].sort((a, b) => a.chrom.localeCompare(b.chrom))),
        'Receipt contig counts mismatch'
      )
    }
    await Promise.all(
      streams.map(async (stream) => {
        stream.end()
        await once(stream, 'finish')
      })
    )
    if (outputError) throw outputError
    const report = {
      artifact_kind: 'unsigned_offline_projection_observations',
      scientific_acceptance: false,
      insert_ready: receipt !== null,
      receipt_digest: receipt?.receipt_digest || null,
      manifest_sha256: strContextDigest(manifest),
      database: manifest.database,
      run_id: manifest.run_id,
      cohort: manifest.cohort,
      capture: manifest.capture,
      source: manifest.source,
      evidence: manifest.evidence,
      source_map_verification_sha256: manifest.source_map_artifacts.verificationSha256,
      projection: manifest.projection,
      primary_snapshot: manifest.primary_snapshot,
      exports: manifest.exports,
      counts,
      contigs,
      outputs: {
        histograms_sha256: hashes[0].digest('hex'),
        mapping_sha256: hashes[1].digest('hex'),
      },
    }
    // This is the sole completion marker, written only after all validation and file flushes.
    writeFileSync(join(outputDir, 'observations.json'), `${JSON.stringify(report, null, 2)}\n`, {
      flag: 'wx',
    })
    return report
  } catch (error) {
    streams.forEach((stream) => stream.destroy())
    throw error
  }
}

if (require.main === module) {
  const [manifestPath, capturePath, targetPath, outputDir, receiptPath, ...extra] =
    process.argv.slice(2)
  if (!outputDir || extra.length) {
    console.error(
      'Usage: ts-node generate.ts MANIFEST.json CAPTURE.jsonl TARGETS.jsonl NEW_OUTPUT_DIR [OPERATOR_RECEIPT.json]'
    )
    process.exitCode = 1
  } else {
    generate(
      JSON.parse(readFileSync(manifestPath, 'utf8')),
      capturePath,
      targetPath,
      outputDir,
      receiptPath ? JSON.parse(readFileSync(receiptPath, 'utf8')) : undefined
    )
      .then(() =>
        console.log(
          'Offline projection complete; inspect observations.json. No remote state changed.'
        )
      )
      .catch((error) => {
        console.error(error.message)
        process.exitCode = 1
      })
  }
}

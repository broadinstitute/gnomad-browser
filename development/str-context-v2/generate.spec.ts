import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generate, ProjectionManifest } from './generate'
import { strContextDigest } from '../../graphql-api/src/str_context_admission'
import { writeSourceMapFixture } from '../../graphql-api/src/__fixtures__/str_context_source_map'

const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex')
const hex = 'a'.repeat(64)
const source = {
  uri: 'gs://test-only/capture.tsv',
  generation: '1',
  byte_size: 100,
  md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
  runtime_uri: 'gs://test-only/mirror.tsv',
  runtime_generation: '2',
  runtime_byte_size: 100,
  runtime_md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
}
const runs = Array.from({ length: 22 }, (_, i) => `chr${i + 1}`)
  .concat(['chrX', 'chrY'])
  .map((chrom) => ({
    chrom,
    run_id: 'test_primary',
    manifest_sha256: hex,
    accepted_task_attempt_digest: hex,
  }))
const primary = { database: 'gnomad_lr_y1_scratch_v5_test_only', runs, bundle_digest: '' }
primary.bundle_digest = strContextDigest({
  database: primary.database,
  runs: [...runs].sort((a, b) => a.chrom.localeCompare(b.chrom)),
})
const makeRow = (ordinal = 1, locus = '22-10-20-NGC', context = '22:8-25', vc = '', called = 1) => {
  const [chrom, start, end, motif] = locus.split('-')
  const fields = {
    LocusId: locus,
    Motif: motif,
    Interval: context,
    VC: vc,
    NumCalledAlleles: String(called),
    UniqueAlleleLengths: String(called ? 1 : 0),
    AlleleSizeHistogram: called ? '0x:1' : '',
    BiallelicHistogram: called ? '0/0:1' : '.',
    AlleleSizeHistogram__nfe_unknown: called ? '0x:1' : '',
    BiallelicHistogram__nfe_unknown: called ? '0/0:1' : '.',
    HemiAlleleMax: '.',
    ShortAlleleMean: '0.000000000000001',
  }
  const m = /^(.*):(\d+)-(\d+)$/.exec(context)!
  return {
    contract: 'updated_histogram_source_v1',
    cohort: 'hgsvc_hprc',
    run_id: 'test_only',
    task_id: 'task_0',
    source_uri: source.runtime_uri,
    source_generation: source.runtime_generation,
    source_size_bytes: source.byte_size,
    source_md5_base64: source.md5_base64,
    row_ordinal: String(ordinal),
    locus_id: locus,
    motif,
    chrom,
    locus_start: Number(start),
    locus_end: Number(end),
    source_interval: context,
    context_chrom: m[1],
    context_start: Number(m[2]),
    context_end: Number(m[3]),
    source_vc: vc === '' || vc === '.' ? null : vc,
    num_called_alleles: called,
    unique_allele_lengths: called ? 1 : 0,
    source_header: Object.keys(fields),
    source_fields: fields,
  }
}
const target = (canonical_locus_id = '22-10-20-NGC') => ({
  canonical_locus_id,
  cohort: 'hgsvc_hprc',
  reference_genome: 'GRCh38',
  primary_database: primary.database,
  primary_snapshot_digest: primary.bundle_digest,
  primary_run_id: 'test_primary',
})
const readJsonl = (path: string) =>
  readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'str-context-test-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function fixture(rows = [makeRow()], targets = [target()], sourceOverride = source) {
  const capture = `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`
  const targetData = `${targets.map((row) => JSON.stringify(row)).join('\n')}\n`
  const capturePath = join(root, 'capture.jsonl')
  const targetPath = join(root, 'targets.jsonl')
  writeFileSync(capturePath, capture)
  writeFileSync(targetPath, targetData)
  const receipt = {
    contract: 'updated_histogram_source_v1',
    cohort: 'hgsvc_hprc',
    run_id: 'test_only',
    task_id: 'task_0',
    source_uri: sourceOverride.runtime_uri,
    source_generation: sourceOverride.runtime_generation,
    source_size_bytes: 100,
    source_md5_base64: sourceOverride.md5_base64,
    database: 'gnomad_lr_y1_scratch_histogram_hgsvc_hprc_test_only',
    status: 'complete_success',
    completeness: 'full',
    diagnostic: '',
    gcs_metadata_verified: true,
    eof_observed: true,
    complete_body_identity_verified: true,
    bytes_read: 100,
    computed_md5_base64: sourceOverride.md5_base64,
    data_rows_examined: rows.length,
    validated_rows: rows.length,
    zero_called_rows: rows.filter((r) => r.num_called_alleles === 0).length,
    rows_insert_attempted: rows.length,
    rows_insert_acknowledged: rows.length,
    partial_writes_possible: false,
  }
  const map = writeSourceMapFixture(
    root,
    {
      cohort: 'hgsvc_hprc',
      run_id: 'test_only',
      source: sourceOverride,
      capture: {
        database: receipt.database,
        run_id: receipt.run_id,
        receipt_sha256: strContextDigest(receipt),
        task_id: 'task_0',
        physical_rows: rows.length,
      },
    },
    receipt
  )
  const manifest: ProjectionManifest = {
    database: 'gnomad_lr_y1_scratch_histogram_projection_hgsvc_hprc_test_attempt1',
    run_id: 'test_only',
    cohort: 'hgsvc_hprc',
    reference_genome: 'GRCh38',
    source: sourceOverride,
    primary_snapshot: primary,
    projection: {
      version: 'str-context-v2.3',
      instance_id: 'test_attempt1',
      rules_sha256: sha(readFileSync(join(__dirname, 'contract.json'))),
      coordinate_contract: 'SOURCE_NATIVE_EQUALS_CANONICAL_START0_END0',
      coordinate_evidence_sha256: hex,
      neutral_display_contract: 'SOURCE_SIZE_AND_ORIGINAL_PAIRS_V1',
      units: 'UNKNOWN',
      producer_version: 'UNKNOWN',
    },
    evidence: {
      writer_fence_sha256: hex,
      worker_success_sha256: hex,
      primary_export_sha256: hex,
      source_map_sha256: map.sourceMapSha256,
    },
    source_map_artifacts: map.artifacts,
    capture: {
      database: receipt.database,
      run_id: receipt.run_id,
      parser_version: 'updated_histogram_source_v1',
      header_sha256: strContextDigest(rows[0].source_header),
      receipt_sha256: strContextDigest(receipt),
    },
    capture_receipt: receipt,
    exports: { capture_sha256: sha(capture), targets_sha256: sha(targetData) },
  }
  return { manifest, capturePath, targetPath, out: join(root, 'out') }
}

it('preserves every original field, raw blank VC, zero bins, unknown-sex diagonal encoding, and source AN', async () => {
  const row = makeRow()
  const f = fixture([row])
  const report = await generate(f.manifest, f.capturePath, f.targetPath, f.out)
  expect(report.insert_ready).toBe(false)
  expect(report.scientific_acceptance).toBe(false)
  expect(readJsonl(join(f.out, 'histograms.jsonl'))).toEqual([
    { ...row, projection_version: 'str-context-v2.3', receipt_digest: '' },
  ])
  const mapping = readJsonl(join(f.out, 'mapping.jsonl'))[0]
  expect(mapping).toMatchObject({
    mapping_status: 'available_source_context',
    source_row_ordinal: '1',
    source_uri: source.runtime_uri,
    source_generation: source.runtime_generation,
    context_count: 1,
    primary_binding_status: 'NOT_ESTABLISHED',
    primary_an_concordance: 'NOT_ESTABLISHED',
  })
  expect(report.counts).toMatchObject({
    source_rows: 1,
    canonical_rows: 1,
    wider_context_rows: 1,
    vc_populated_rows: 0,
    pair_available_rows: 1,
    allele_available_rows: 1,
    referenced_source_rows: 1,
  })
  expect(report.contigs).toHaveLength(24)
})

it('counts zero/one/multiple contexts and refuses compound first-component mapping; N is literal', async () => {
  const f = fixture(
    [
      makeRow(),
      makeRow(2, '22-10-20-NGC', '22:7-26', '22:9-24'),
      makeRow(3, 'Y-30-40-GCN', 'Y:30-40'),
      makeRow(4, 'X-30-40-AC', 'X:30-40', '.', 0),
    ],
    [
      target(),
      target('22-10-20-AGC'),
      target('22-10-20-NGC+22-30-40-AC'),
      target('Y-30-40-GCN'),
      target('X-30-40-AC'),
    ]
  )
  const report = await generate(f.manifest, f.capturePath, f.targetPath, f.out)
  const mapped = readJsonl(join(f.out, 'mapping.jsonl'))
  expect(mapped.map((row) => row.mapping_status)).toEqual([
    'unavailable_ambiguous',
    'unavailable_no_context',
    'unavailable_compound',
    'available_source_context',
    'available_source_context',
  ])
  expect(mapped.slice(0, 3).every((row) => row.source_row_ordinal === null)).toBe(true)
  expect(mapped[2]).toMatchObject({
    named_start: null,
    named_end: null,
    motif: null,
    component_index: 4294967295,
  })
  expect(report.counts).toMatchObject({
    mapping_rows: 5,
    available_rows: 2,
    absent_rows: 1,
    ambiguous_rows: 1,
    compound_rows: 1,
    source_rows: 4,
    pair_missing_rows: 1,
    allele_available_rows: 3,
    vc_populated_rows: 1,
  })
})

it.each([
  'physical',
  'logical',
  'target',
  'ordinal_gap',
  'source',
  'target_snapshot',
  'raw_helper',
  'header',
  'export_digest',
])('fails closed on %s mismatch with no completion marker', async (kind) => {
  const rows = [makeRow()]
  const targets = [target()]
  if (kind === 'physical') rows.push(makeRow(1, '22-30-40-AC', '22:30-40'))
  if (kind === 'logical') rows.push(makeRow(2))
  if (kind === 'target') targets.push(target())
  if (kind === 'ordinal_gap') rows[0].row_ordinal = '2'
  if (kind === 'source') rows[0].source_generation = '999'
  if (kind === 'target_snapshot') targets[0].primary_snapshot_digest = 'b'.repeat(64)
  if (kind === 'raw_helper') rows[0].source_fields.VC = '22:10-20'
  const f = fixture(rows, targets)
  if (kind === 'header') f.manifest.capture.header_sha256 = hex
  if (kind === 'export_digest') f.manifest.exports.capture_sha256 = hex
  await expect(generate(f.manifest, f.capturePath, f.targetPath, f.out)).rejects.toThrow()
  expect(existsSync(join(f.out, 'observations.json'))).toBe(false)
})

it('retains an available allele distribution when original pairs are missing', async () => {
  const row = makeRow()
  row.source_fields.BiallelicHistogram = '.'
  row.source_fields.BiallelicHistogram__nfe_unknown = ''
  const f = fixture([row])
  const report = await generate(f.manifest, f.capturePath, f.targetPath, f.out)
  expect(report.counts).toMatchObject({
    available_rows: 1,
    allele_available_rows: 1,
    pair_available_rows: 0,
    pair_missing_rows: 1,
  })
  expect(readJsonl(join(f.out, 'histograms.jsonl'))[0].source_fields).toEqual(row.source_fields)
})

it('requires external coordinate evidence, exact contract bytes and successful complete capture', async () => {
  const f = fixture()
  f.manifest.projection.coordinate_evidence_sha256 = ''
  await expect(generate(f.manifest, f.capturePath, f.targetPath, f.out)).rejects.toThrow()
  f.manifest.projection.coordinate_evidence_sha256 = hex
  f.manifest.projection.rules_sha256 = hex
  await expect(generate(f.manifest, f.capturePath, f.targetPath, f.out)).rejects.toThrow(
    'projection rules'
  )
  f.manifest.projection.rules_sha256 = sha(readFileSync(join(__dirname, 'contract.json')))
  f.manifest.capture_receipt.status = 'failed_partial'
  f.manifest.capture.receipt_sha256 = strContextDigest(f.manifest.capture_receipt)
  await expect(generate(f.manifest, f.capturePath, f.targetPath, f.out)).rejects.toThrow() // sealed external capture digest also rejects the mutation
})

it('only stamps an operator receipt matching recomputed counts, source and primary snapshot', async () => {
  const f = fixture()
  const report = await generate(f.manifest, f.capturePath, f.targetPath, f.out)
  const body = {
    schema_version: 2,
    source_format: 'str_context_completion_v2',
    status: 'candidate_validated',
    candidate_only: true,
    database: f.manifest.database,
    run_id: f.manifest.run_id,
    cohort: f.manifest.cohort,
    modality: 'str_histogram',
    reference_genome: 'GRCh38',
    source,
    projection: f.manifest.projection,
    primary_snapshot: primary,
    counts: report.counts,
    contigs: report.contigs,
    capture: {
      contract: 'updated_histogram_source_v1',
      ...f.manifest.capture,
      source_map_sha256: f.manifest.evidence.source_map_sha256,
      task_id: 'task_0',
      worker_success: true,
      eof_observed: true,
      complete_body_identity_verified: true,
      gcs_metadata_verified: true,
      bytes_read: 100,
      computed_md5_base64: source.md5_base64,
      data_rows_examined: 1,
      validated_rows: 1,
      rows_insert_acknowledged: 1,
      physical_rows: 1,
      unique_source_keys: 1,
      min_ordinal: 1,
      max_ordinal: 1,
      writer_fenced_and_revoked: true,
    },
    writer_fenced_and_revoked: true,
  }
  const receipt = { ...body, receipt_digest: strContextDigest(body) }
  const sealed = join(root, 'sealed')
  const sealedReport = await generate(f.manifest, f.capturePath, f.targetPath, sealed, receipt)
  expect(sealedReport.insert_ready).toBe(true)
  expect(readJsonl(join(sealed, 'histograms.jsonl'))[0].receipt_digest).toBe(receipt.receipt_digest)
  expect(readJsonl(join(sealed, 'mapping.jsonl'))[0].receipt_digest).toBe(receipt.receipt_digest)
  const wrong = {
    ...body,
    counts: { ...body.counts, allele_available_rows: 0 },
    contigs: body.contigs.map((c) => ({ ...c, allele_available_rows: 0 })),
  }
  await expect(
    generate(f.manifest, f.capturePath, f.targetPath, join(root, 'wrong'), {
      ...wrong,
      receipt_digest: strContextDigest(wrong),
    })
  ).rejects.toThrow('global counts mismatch')
  await expect(generate(f.manifest, f.capturePath, f.targetPath, f.out)).rejects.toThrow() // no overwrite/retry
})

it.each([
  'original',
  'mixed',
  'generation',
  'cohort',
  'task',
  'run',
  'truncated',
  'header_order',
  'missing_column',
  'extra_column',
])('rejects %s anywhere in the whole mirrored export', async (kind) => {
  const rows = [makeRow(), makeRow(2, '22-30-40-AC', '22:30-40', '.')]
  const second: any = rows[1]
  if (kind === 'original') {
    second.source_uri = source.uri
    second.source_generation = source.generation
  }
  if (kind === 'mixed') second.source_generation = source.generation
  if (kind === 'generation') second.source_generation = '999'
  if (kind === 'cohort') second.cohort = 'aou'
  if (kind === 'task') second.task_id = 'other'
  if (kind === 'run') second.run_id = 'other'
  if (kind === 'header_order') second.source_header.reverse()
  if (kind === 'missing_column') delete second.source_vc
  if (kind === 'extra_column') second.extra = ''
  const f = fixture(rows)
  if (kind === 'truncated') {
    const bytes = `${JSON.stringify(rows[0])}\n`
    writeFileSync(f.capturePath, bytes)
    f.manifest.exports.capture_sha256 = sha(bytes)
  }
  await expect(generate(f.manifest, f.capturePath, f.targetPath, f.out)).rejects.toThrow()
  expect(existsSync(join(f.out, 'observations.json'))).toBe(false)
})

it('runs the full synthetic direct-read fixture only with explicit direct mapping evidence', async () => {
  const direct = { ...source, runtime_uri: source.uri, runtime_generation: source.generation }
  const row = { ...makeRow(), source_uri: source.uri, source_generation: source.generation }
  const f = fixture([row], [target()], direct)
  await generate(f.manifest, f.capturePath, f.targetPath, f.out)
  expect(readJsonl(join(f.out, 'histograms.jsonl'))[0]).toMatchObject(row)
  expect(readJsonl(join(f.out, 'mapping.jsonl'))[0]).toMatchObject({
    source_uri: source.uri,
    source_generation: source.generation,
  })
})

it('does not reinterpret v2.1 for mirrored captures', async () => {
  const f = fixture()
  ;(f.manifest.projection as any).version = 'str-context-v2.1'
  await expect(generate(f.manifest, f.capturePath, f.targetPath, f.out)).rejects.toThrow(
    'projection rules'
  )
})

it('preserves UInt64 decimal strings and all 23 columns plus only the two existing stamps', async () => {
  const row: any = makeRow()
  row.source_size_bytes = String(row.source_size_bytes)
  const f = fixture([row])
  await generate(f.manifest, f.capturePath, f.targetPath, f.out)
  const projected = readJsonl(join(f.out, 'histograms.jsonl'))[0]
  expect(Object.keys(row)).toHaveLength(23)
  expect(Object.keys(projected)).toHaveLength(25)
  expect(projected.source_header).toEqual(row.source_header)
  expect(projected.source_fields).toEqual(row.source_fields)
  expect(projected.source_size_bytes).toBe('100')
  expect(projected.row_ordinal).toBe('1')
})

it('resolves sourceMap/evidence before producing output, not just a hash-shaped manifest value', async () => {
  const f = fixture()
  f.manifest.source_map_artifacts.sourceMapPath = join(root, 'missing-map')
  await expect(generate(f.manifest, f.capturePath, f.targetPath, f.out)).rejects.toThrow()
  expect(existsSync(f.out)).toBe(false)
})

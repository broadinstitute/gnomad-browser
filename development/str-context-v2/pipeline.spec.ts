/* eslint-disable no-restricted-syntax, no-await-in-loop -- Offline full-contig synthetic pipeline; sequential mocked pointer checks. */
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generate, ProjectionManifest } from './generate'
import {
  strContextDigest,
  normalizeStrContextReceipt,
  parseStrContextReceipt,
  runtimeSourceIdentity,
} from '../../graphql-api/src/str_context_admission'
import { isSupportedContextPrimaryDatabase } from '../../graphql-api/src/str_context_identity'
import { writeSourceMapFixture } from '../../graphql-api/src/__fixtures__/str_context_source_map'
import {
  preflightStrContext,
  strContextColumnShapes,
  STR_CONTEXT_RULES_SHA256,
} from '../../graphql-api/src/graphql/resolvers/str-context-preflight'
import { getY1SourceSnapshot } from '../../graphql-api/src/queries/long_read_y1_provenance'
import {
  fetchSourceContextHistogram,
  sourceContextCacheKey,
  SourceContextIdentity,
} from '../../graphql-api/src/queries/long_read_tr_histograms_v2'

const mockQuery = jest.fn()
jest.mock('../../graphql-api/src/queries/long_read_y1_provenance', () => ({
  getY1SourceSnapshot: jest.fn(),
}))
jest.mock('../../graphql-api/src/cache', () => ({ withCache: (fn: any) => fn }))
jest.mock('../../graphql-api/src/clickhouse', () => ({
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))
const sha = (raw: string | Buffer) => createHash('sha256').update(raw).digest('hex')
const hex = 'a'.repeat(64)
const chroms = Array.from({ length: 22 }, (_, i) => String(i + 1)).concat(['X', 'Y'])
const jsonl = (rows: unknown[]) => `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`
const readRows = (path: string) =>
  readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'str-v23-pipeline-'))
  mockQuery.mockReset()
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

function fixture(cohort: 'aou' | 'hgsvc_hprc', version: 5 | 6) {
  const source = {
    uri: `gs://synthetic/${cohort}/original`,
    generation: '1',
    byte_size: 100,
    md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
    runtime_uri: `gs://synthetic/${cohort}/runtime`,
    runtime_generation: '2',
    runtime_byte_size: 100,
    runtime_md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
  }
  const run = 'synthetic_capture'
  const captureDB = `gnomad_lr_y1_scratch_histogram_${cohort}_${run}`
  const instance = 'synthetic_attempt2'
  const primary = {
    database:
      version === 6
        ? 'gnomad_lr_y1_scratch_v6_refresh_20260923_nullable_af'
        : 'gnomad_lr_y1_scratch_v5_refresh_20260923',
    runs: chroms.map((chrom) => ({
      chrom: `chr${chrom}`,
      run_id: `primary_${cohort}_${chrom}`,
      manifest_sha256: hex,
      accepted_task_attempt_digest: hex,
    })),
    bundle_digest: '',
  }
  primary.bundle_digest = strContextDigest({
    database: primary.database,
    runs: [...primary.runs].sort((a, b) => a.chrom.localeCompare(b.chrom)),
  })
  const rows = chroms.map((chrom, i) => {
    const fields = {
      LocusId: `${chrom}-10-20-NGC`,
      Motif: 'NGC',
      Interval: `${chrom}:10-20`,
      VC: '',
      NumCalledAlleles: '2',
      UniqueAlleleLengths: '1',
      AlleleSizeHistogram: '0x:2',
      BiallelicHistogram: '0/0:1',
      AlleleSizeHistogram__nfe_unknown: '0x:2',
      BiallelicHistogram__nfe_unknown: '0/0:1',
    }
    return {
      contract: 'updated_histogram_source_v1',
      cohort,
      run_id: run,
      task_id: 'task_0',
      source_uri: source.runtime_uri,
      source_generation: source.runtime_generation,
      source_size_bytes: '100',
      source_md5_base64: source.md5_base64,
      row_ordinal: String(i + 1),
      locus_id: fields.LocusId,
      motif: 'NGC',
      chrom,
      locus_start: 10,
      locus_end: 20,
      source_interval: fields.Interval,
      context_chrom: chrom,
      context_start: 10,
      context_end: 20,
      source_vc: null,
      num_called_alleles: 2,
      unique_allele_lengths: 1,
      source_header: Object.keys(fields),
      source_fields: fields,
    }
  })
  const backend = {
    contract: 'updated_histogram_source_v1',
    database: captureDB,
    cohort,
    run_id: run,
    task_id: 'task_0',
    source_uri: source.runtime_uri,
    source_generation: source.runtime_generation,
    source_size_bytes: 100,
    source_md5_base64: source.md5_base64,
    computed_md5_base64: source.md5_base64,
    status: 'complete_success',
    completeness: 'full',
    diagnostic: '',
    gcs_metadata_verified: true,
    eof_observed: true,
    complete_body_identity_verified: true,
    partial_writes_possible: false,
    bytes_read: 100,
    data_rows_examined: 24,
    validated_rows: 24,
    rows_insert_attempted: 24,
    rows_insert_acknowledged: 24,
    zero_called_rows: 0,
  }
  const map = writeSourceMapFixture(
    root,
    {
      cohort,
      run_id: run,
      source,
      capture: {
        database: captureDB,
        run_id: run,
        task_id: 'task_0',
        receipt_sha256: strContextDigest(backend),
        physical_rows: 24,
      },
    },
    backend
  )
  const targets = rows.map((row, i) => ({
    canonical_locus_id: row.locus_id,
    cohort,
    reference_genome: 'GRCh38',
    primary_database: primary.database,
    primary_snapshot_digest: primary.bundle_digest,
    primary_run_id: primary.runs[i].run_id,
  }))
  const capturePath = join(root, 'capture.jsonl')
  const targetPath = join(root, 'targets.jsonl')
  writeFileSync(capturePath, jsonl(rows))
  writeFileSync(targetPath, jsonl(targets))
  const manifest: ProjectionManifest = {
    database: `gnomad_lr_y1_scratch_histogram_projection_${cohort}_${instance}`,
    run_id: run,
    cohort,
    reference_genome: 'GRCh38',
    source,
    primary_snapshot: primary,
    projection: {
      version: 'str-context-v2.3',
      instance_id: instance,
      rules_sha256: sha(readFileSync(join(__dirname, 'contract.json'))),
      coordinate_contract: 'SOURCE_NATIVE_EQUALS_CANONICAL_START0_END0',
      coordinate_evidence_sha256: hex,
      neutral_display_contract: 'SOURCE_SIZE_AND_ORIGINAL_PAIRS_V1',
      units: 'UNKNOWN',
      producer_version: 'UNKNOWN',
    },
    capture: {
      database: captureDB,
      run_id: run,
      parser_version: 'updated_histogram_source_v1',
      header_sha256: strContextDigest(rows[0].source_header),
      receipt_sha256: strContextDigest(backend),
    },
    capture_receipt: backend,
    source_map_artifacts: map.artifacts,
    evidence: {
      source_map_sha256: map.sourceMapSha256,
      writer_fence_sha256: hex,
      worker_success_sha256: hex,
      primary_export_sha256: hex,
    },
    exports: { capture_sha256: sha(jsonl(rows)), targets_sha256: sha(jsonl(targets)) },
  }
  return { manifest, rows, capturePath, targetPath }
}

it.each([
  ['aou', 5],
  ['aou', 6],
  ['hgsvc_hprc', 5],
  ['hgsvc_hprc', 6],
] as const)(
  'SYNTHETIC %s v%i full 24-contig generator -> sealed envelope -> preflight -> query alignment',
  async (cohort, version) => {
    const f = fixture(cohort, version)
    const m = f.manifest
    expect(m.projection.rules_sha256).toBe(STR_CONTEXT_RULES_SHA256)
    const observations = await generate(m, f.capturePath, f.targetPath, join(root, 'unsealed'))
    expect(observations.counts.source_rows).toBe(24)
    const body = {
      schema_version: 2,
      source_format: 'str_context_completion_v2',
      status: 'candidate_validated',
      candidate_only: true,
      database: m.database,
      run_id: m.run_id,
      cohort,
      modality: 'str_histogram',
      reference_genome: 'GRCh38',
      source: m.source,
      projection: m.projection,
      primary_snapshot: m.primary_snapshot,
      counts: observations.counts,
      contigs: observations.contigs,
      capture: {
        ...m.capture,
        contract: 'updated_histogram_source_v1',
        source_map_sha256: m.evidence.source_map_sha256,
        task_id: 'task_0',
        worker_success: true,
        eof_observed: true,
        complete_body_identity_verified: true,
        gcs_metadata_verified: true,
        bytes_read: 100,
        computed_md5_base64: m.source.runtime_md5_base64,
        data_rows_examined: 24,
        validated_rows: 24,
        rows_insert_acknowledged: 24,
        physical_rows: 24,
        unique_source_keys: 24,
        min_ordinal: 1,
        max_ordinal: 24,
        writer_fenced_and_revoked: true,
      },
      writer_fenced_and_revoked: true,
    }
    const receipt = parseStrContextReceipt(
      { ...body, receipt_digest: strContextDigest(body) },
      { ...m, modality: 'str_histogram' }
    )
    await generate(m, f.capturePath, f.targetPath, join(root, 'sealed'), receipt)
    const hist = readRows(join(root, 'sealed/histograms.jsonl'))
    const mappings = readRows(join(root, 'sealed/mapping.jsonl'))
    expect(hist).toEqual(
      f.rows.map((row) => ({
        ...row,
        projection_version: 'str-context-v2.3',
        receipt_digest: receipt.receipt_digest,
      }))
    )
    expect(hist.every((r) => Object.keys(r).length === 25)).toBe(true)
    const route: any = {
      database: m.database,
      run_id: m.run_id,
      cohort,
      modality: 'str_histogram',
      receipt: normalizeStrContextReceipt(receipt),
      source_map_artifacts: m.source_map_artifacts,
    }
    ;(getY1SourceSnapshot as jest.Mock).mockImplementation(async (_cohort, chrom) => {
      const run = m.primary_snapshot.runs.find((r) => r.chrom === chrom)!
      return {
        database: m.primary_snapshot.database,
        cohort,
        reference_genome: 'GRCh38',
        chrom,
        run_id: run.run_id,
        primary_manifest_sha256: run.manifest_sha256,
        accepted_task_attempt_digest: run.accepted_task_attempt_digest,
      }
    })
    const preflightQuery = jest.fn(async (selectedRoute, sql: string, params: any) => {
      expect(selectedRoute.database).toBe(m.database)
      expect(selectedRoute.database).not.toBe(m.capture.database)
      expect(params.run).toBe(m.capture.run_id)
      expect(params.uri).toBe(m.source.runtime_uri)
      if (sql.includes('system.columns'))
        return Object.entries(strContextColumnShapes).flatMap(([table, columns]) =>
          Object.entries(columns).map(([name, type]) => ({ table, name, type }))
        )
      if (sql.includes('system.tables'))
        return Object.keys(strContextColumnShapes).map((name) => ({ name, engine: 'MergeTree' }))
      if (sql.includes('min(row_ordinal)'))
        return [
          { rows: 24, min_ordinal: 1, max_ordinal: 24, physical_keys: 24, contexts: 24, exact: 24 },
        ]
      if (sql.includes('AS mismatches')) return [{ mismatches: 0 }]
      if (sql.includes('AS mapping_rows'))
        return chroms.map((chrom) => ({
          contig: `chr${chrom}`,
          mapping_rows: 1,
          target_keys: 1,
          available_rows: 1,
          absent_rows: 0,
          ambiguous_rows: 0,
          compound_rows: 0,
          referenced_source_rows: 1,
          exact: 1,
          invalid: 0,
        }))
      if (sql.includes('AS canonical_rows'))
        return chroms.map((chrom) => ({
          contig: `chr${chrom}`,
          canonical_rows: 1,
          allele_available_rows: 1,
          pair_available_rows: 1,
          equal_context_rows: 1,
          wider_context_rows: 0,
          vc_populated_rows: 0,
          invalid: 0,
        }))
      throw new Error(`unexpected SQL ${sql}`)
    })
    await preflightStrContext(route, preflightQuery)
    for (const [i, chrom] of chroms.entries()) {
      const identity: SourceContextIdentity = {
        cohort,
        ancillaryDatabase: m.database,
        ancillaryRunId: m.run_id,
        captureDatabase: m.capture.database,
        projectionInstanceId: m.projection.instance_id,
        source: runtimeSourceIdentity(m.source),
        projectionVersion: m.projection.version,
        receiptDigest: receipt.receipt_digest,
        receiptIdentity: {
          receipt,
          sourceMapVerificationSha256: m.source_map_artifacts.verificationSha256,
        },
        captureTaskId: 'task_0',
        primaryDatabase: m.primary_snapshot.database,
        primarySnapshotDigest: m.primary_snapshot.bundle_digest,
        primaryRunId: m.primary_snapshot.runs[i].run_id,
        sourceRecords: [],
        component: { chrom, start0: 10, end0: 20, motif: 'NGC' },
      }
      mockQuery.mockImplementation(async ({ query, query_params }: any) => {
        expect(query_params.ancillaryRunId).toBe(m.capture.run_id)
        if (query.includes('FROM lr_y1_str_context_mapping_v2'))
          return { json: async () => [mappings[i]] }
        expect(query).toContain('run_id = {ancillaryRunId:String}')
        expect(query_params.sourceUri).toBe(m.source.runtime_uri)
        expect(query_params.sourceRowOrdinal).toBe(String(i + 1))
        return { json: async () => [hist[i]] }
      })
      expect((await fetchSourceContextHistogram(identity, route)).status).toBe(
        'AVAILABLE_SOURCE_CONTEXT'
      )
      const key = sourceContextCacheKey(identity)
      for (const field of [
        'captureDatabase',
        'ancillaryDatabase',
        'ancillaryRunId',
        'projectionInstanceId',
      ] as const) {
        expect(sourceContextCacheKey({ ...identity, [field]: 'wrong' })).not.toBe(key)
        expect(() => fetchSourceContextHistogram({ ...identity, [field]: 'wrong' }, route)).toThrow(
          /scope/
        )
      }
      expect(() =>
        fetchSourceContextHistogram(identity, { ...route, database: m.capture.database })
      ).toThrow(/route/)
      mockQuery.mockResolvedValueOnce({
        json: async () => [{ ...mappings[i], ancillary_run_id: m.projection.instance_id }],
      })
      await expect(fetchSourceContextHistogram(identity, route)).rejects.toThrow(
        /mapping ancillary_run_id/
      )
      mockQuery
        .mockResolvedValueOnce({ json: async () => [mappings[i]] })
        .mockResolvedValueOnce({ json: async () => [{ ...hist[i], row_ordinal: '999' }] })
      await expect(fetchSourceContextHistogram(identity, route)).rejects.toThrow(/ordinal/)
    }
  }
)

it.each([
  'gnomad_lr_y1_scratch_v7_refresh',
  'gnomad_lr_y1_scratch_v4_refresh',
  'gnomad_lr_y1_scratch_v6_current',
  'gnomad_lr_y1_scratch_v6_refresh_current',
  'gnomad_lr_y1_scratch_v5_live',
  'gnomad_lr_y1_scratch_v6_live_refresh',
  'gnomad_lr_y1_live_v6_refresh',
  'other_scratch_v6_refresh',
])('rejects primary namespace %s in helper and generator', async (database) => {
  expect(isSupportedContextPrimaryDatabase(database)).toBe(false)
  const f = fixture('aou', 6)
  f.manifest.primary_snapshot.database = database
  await expect(
    generate(f.manifest, f.capturePath, f.targetPath, join(root, 'bad'))
  ).rejects.toThrow(/primary database/)
})

it.each([
  'old_version',
  'unknown_version',
  'capture_overlap',
  'cross_cohort',
  'arbitrary_projection',
  'current_projection',
  'wrong_capture_db',
  'wrong_capture_run',
  'relabel_root_run',
  'backend_digest',
  'wrong_source_map',
])('fails closed on %s before output', async (kind) => {
  const f = fixture('aou', 6)
  const m: any = f.manifest
  if (kind === 'old_version') m.projection.version = 'str-context-v2.2'
  if (kind === 'unknown_version') m.projection.version = 'str-context-v9'
  if (kind === 'capture_overlap') m.database = m.capture.database
  if (kind === 'cross_cohort') m.database = m.database.replace('_aou_', '_hgsvc_hprc_')
  if (kind === 'arbitrary_projection') m.database = 'arbitrary_database'
  if (kind === 'current_projection') {
    m.projection.instance_id = 'current'
    m.database = 'gnomad_lr_y1_scratch_histogram_projection_aou_current'
  }
  if (kind === 'wrong_capture_db') m.capture.database += '_other'
  if (kind === 'wrong_capture_run') m.capture.run_id = m.projection.instance_id
  if (kind === 'relabel_root_run') {
    m.run_id = m.projection.instance_id
    m.capture.run_id = m.run_id
    m.capture.database = `gnomad_lr_y1_scratch_histogram_aou_${m.run_id}`
  }
  if (kind === 'backend_digest') m.capture.receipt_sha256 = 'b'.repeat(64)
  if (kind === 'wrong_source_map') m.evidence.source_map_sha256 = 'b'.repeat(64)
  await expect(generate(m, f.capturePath, f.targetPath, join(root, 'bad'))).rejects.toThrow()
})

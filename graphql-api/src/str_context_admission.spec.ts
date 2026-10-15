/* eslint-disable no-param-reassign -- Fixtures deliberately mutate one invariant at a time. */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  STR_CONTEXT_COUNT_KEYS,
  normalizeStrContextReceipt,
  parseStrContextReceipt,
  strContextDigest,
} from './str_context_admission'
import { readY1AncillaryReceipt } from './y1_admission_config'
import { resolveY1AncillaryRoutes } from './y1_config'
import {
  preflightStrContext,
  strContextColumnShapes,
  STR_CONTEXT_RULES_SHA256,
} from './graphql/resolvers/str-context-preflight'
import { getY1SourceSnapshot } from './queries/long_read_y1_provenance'
import { writeSourceMapFixture } from './__fixtures__/str_context_source_map'

jest.mock('./queries/long_read_y1_provenance', () => ({ getY1SourceSnapshot: jest.fn() }))

const digest = 'a'.repeat(64)
export const contextReceiptFixture = (): any => {
  const counts: any = Object.fromEntries(STR_CONTEXT_COUNT_KEYS.map((key) => [key, 0]))
  Object.assign(counts, {
    source_rows: 1,
    canonical_rows: 1,
    distinct_contexts: 1,
    mapping_rows: 1,
    available_rows: 1,
    referenced_source_rows: 1,
    allele_available_rows: 1,
    pair_available_rows: 1,
    equal_context_rows: 1,
    primary_binding_not_established_rows: 1,
    primary_an_not_established_rows: 1,
  })
  const chroms = [...Array.from({ length: 22 }, (_, i) => `chr${i + 1}`), 'chrX', 'chrY']
  const primary = {
    database: 'gnomad_lr_y1_scratch_v5_fixture',
    runs: chroms.map((chrom) => ({
      chrom,
      run_id: `fixture_${chrom}`,
      manifest_sha256: digest,
      accepted_task_attempt_digest: digest,
    })),
  }
  const receipt: any = {
    schema_version: 2,
    source_format: 'str_context_completion_v2',
    status: 'candidate_validated',
    candidate_only: true,
    database: 'gnomad_lr_y1_scratch_histogram_projection_aou_fixture_attempt1',
    run_id: 'fixture',
    cohort: 'aou',
    modality: 'str_histogram',
    reference_genome: 'GRCh38',
    source: {
      uri: 'gs://fixture/source',
      generation: '123',
      byte_size: 100,
      md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
      runtime_uri: 'gs://fixture/runtime',
      runtime_generation: '456',
      runtime_byte_size: 100,
      runtime_md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
    },
    capture: {
      database: 'gnomad_lr_y1_scratch_histogram_aou_fixture',
      run_id: 'fixture',
      contract: 'updated_histogram_source_v1',
      parser_version: 'updated_histogram_source_v1',
      header_sha256: digest,
      receipt_sha256: digest,
      source_map_sha256: digest,
      task_id: 'custom_0',
      worker_success: true,
      eof_observed: true,
      complete_body_identity_verified: true,
      gcs_metadata_verified: true,
      bytes_read: 100,
      computed_md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
      data_rows_examined: 1,
      validated_rows: 1,
      rows_insert_acknowledged: 1,
      physical_rows: 1,
      unique_source_keys: 1,
      min_ordinal: 1,
      max_ordinal: 1,
      writer_fenced_and_revoked: true,
    },
    projection: {
      version: 'str-context-v2.3',
      instance_id: 'fixture_attempt1',
      rules_sha256: digest,
      coordinate_contract: 'SOURCE_NATIVE_EQUALS_CANONICAL_START0_END0',
      coordinate_evidence_sha256: digest,
      neutral_display_contract: 'SOURCE_SIZE_AND_ORIGINAL_PAIRS_V1',
      units: 'UNKNOWN',
      producer_version: 'UNKNOWN',
    },
    primary_snapshot: {
      ...primary,
      bundle_digest: strContextDigest({
        ...primary,
        runs: [...primary.runs].sort((a, b) => a.chrom.localeCompare(b.chrom)),
      }),
    },
    counts,
    contigs: chroms.map((chrom) => ({
      chrom,
      ...Object.fromEntries(
        STR_CONTEXT_COUNT_KEYS.map((key) => [key, chrom === 'chr1' ? counts[key] : 0])
      ),
    })),
    writer_fenced_and_revoked: true,
  }
  receipt.receipt_digest = strContextDigest(receipt)
  return receipt
}
const seal = (receipt: any) => {
  delete receipt.receipt_digest
  receipt.receipt_digest = strContextDigest(receipt)
  return receipt
}
const expected = (r: any) => ({
  database: r.database,
  run_id: r.run_id,
  cohort: r.cohort,
  modality: r.modality,
})

describe('candidate-only context-v2 receipt', () => {
  test.each([
    ['gnomad_lr_y1_scratch_v5_refresh_20260923', true],
    ['gnomad_lr_y1_scratch_v6_refresh_20260923_nullable_af', true],
    ['gnomad_lr_y1_scratch_v7_refresh_20260923', false],
    ['gnomad_lr_y1_scratch_v6_current', false],
    ['gnomad_lr_y1_scratch_v6_refresh_live', false],
    ['other_scratch_v6_refresh', false],
  ])('primary name %s admission syntax only', (database, accepted) => {
    const r = contextReceiptFixture()
    r.primary_snapshot.database = database
    r.primary_snapshot.bundle_digest = strContextDigest({
      database,
      runs: [...r.primary_snapshot.runs].sort((a: any, b: any) => a.chrom.localeCompare(b.chrom)),
    })
    const parse = () => parseStrContextReceipt(seal(r), expected(r))
    if (accepted) expect(parse).not.toThrow()
    else expect(parse).toThrow(/isolated candidate/)
  })
  test.each([
    'old_version',
    'unknown_version',
    'capture_overlap',
    'cross_cohort',
    'capture_run',
    'capture_database',
    'root_run',
    'instance',
    'live_alias',
  ])('rejects namespace/version %s even after resealing', (kind) => {
    const r = contextReceiptFixture()
    if (kind === 'old_version') r.projection.version = 'str-context-v2.2'
    if (kind === 'unknown_version') r.projection.version = 'str-context-v9'
    if (kind === 'capture_overlap') r.database = r.capture.database
    if (kind === 'cross_cohort') r.database = r.database.replace('_aou_', '_hgsvc_hprc_')
    if (kind === 'capture_run') r.capture.run_id = 'other'
    if (kind === 'capture_database') r.capture.database = 'other'
    if (kind === 'root_run') r.run_id = r.projection.instance_id
    if (kind === 'instance') r.projection.instance_id = 'other'
    if (kind === 'live_alias') {
      r.projection.instance_id = 'live'
      r.database = 'gnomad_lr_y1_scratch_histogram_projection_aou_live'
    }
    expect(() => parseStrContextReceipt(seal(r), expected(r))).toThrow()
  })
  test('accepts complete neutral contract, not an exact primary scientific claim', () => {
    const r = contextReceiptFixture()
    expect(parseStrContextReceipt(r, expected(r))).toEqual(r)
  })
  test.each([
    [
      'raw capture only',
      (r: any) => {
        r.source_format = 'updated_histogram_source_v1'
      },
    ],
    [
      'old schema',
      (r: any) => {
        r.schema_version = 1
      },
    ],
    [
      'production',
      (r: any) => {
        r.candidate_only = false
      },
    ],
    [
      'mutable source',
      (r: any) => {
        r.source.generation = ''
      },
    ],
    [
      'mirror bytes',
      (r: any) => {
        r.source.runtime_byte_size = 99
      },
    ],
    [
      'partial EOF',
      (r: any) => {
        r.capture.eof_observed = false
      },
    ],
    [
      'worker failure',
      (r: any) => {
        r.capture.worker_success = false
      },
    ],
    [
      'physical rows',
      (r: any) => {
        r.capture.physical_rows = 2
      },
    ],
    [
      'ordinal hole',
      (r: any) => {
        r.capture.max_ordinal = 2
      },
    ],
    [
      'context duplicate',
      (r: any) => {
        r.counts.duplicate_context_keys = 1
      },
    ],
    [
      'counts',
      (r: any) => {
        r.counts.available_rows = 2
      },
    ],
    [
      'per-contig',
      (r: any) => {
        r.contigs[0].source_rows = 2
      },
    ],
    [
      'old v2.1 is not reinterpreted',
      (r: any) => {
        r.projection.version = 'str-context-v2.1'
      },
    ],
    [
      'invented LPS',
      (r: any) => {
        r.projection.units = 'LPS'
      },
    ],
    [
      'stale bundle',
      (r: any) => {
        r.primary_snapshot.runs[0].run_id = 'other'
      },
    ],
    [
      'missing selected run',
      (r: any) => {
        r.primary_snapshot.runs.pop()
      },
    ],
    [
      'unexpected fields',
      (r: any) => {
        r.scientifically_accepted = true
      },
    ],
  ])('rejects %s even with recalculated outer digest', (_label, mutate) => {
    const r = contextReceiptFixture()
    ;(mutate as (value: any) => void)(r)
    seal(r)
    expect(() => parseStrContextReceipt(r, expected(r))).toThrow()
  })
  test('binds the actual route and receipt bytes', () => {
    const r = contextReceiptFixture()
    expect(() => parseStrContextReceipt(r, { ...expected(r), run_id: 'other' })).toThrow()
    r.source.uri = 'gs://other/source'
    expect(() => parseStrContextReceipt(r, expected(r))).toThrow('digest mismatch')
  })
  test('config requires explicit candidate opt-in; v2 never becomes generic presentation', () => {
    const directory = mkdtempSync(join(tmpdir(), 'str-context-receipt-'))
    try {
      const r = contextReceiptFixture()
      const map = writeSourceMapFixture(directory, r)
      r.capture.source_map_sha256 = map.sourceMapSha256
      seal(r)
      const path = join(directory, 'receipt.json')
      writeFileSync(path, JSON.stringify(r))
      expect(readY1AncillaryReceipt(path, expected(r)).source_format).toBe(
        'str_context_completion_v2'
      )
      const env = {
        LR_Y1_ANCILLARY_ROUTES: JSON.stringify({
          str_histogram: {
            aou: {
              database: r.database,
              run_id: r.run_id,
              receipt_path: path,
              source_map_artifacts: map.artifacts,
            },
          },
        }),
      }
      expect(() => resolveY1AncillaryRoutes(env)).toThrow('CANDIDATE_ENABLED')
      expect(
        resolveY1AncillaryRoutes({ ...env, LR_Y1_STR_CONTEXT_CANDIDATE_ENABLED: 'true' })
      ).toHaveLength(1)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

describe('context-v2 physical admission', () => {
  let directory: string
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'str-context-preflight-'))
  })
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
  })
  const setup = (drift = '') => {
    const receipt = contextReceiptFixture()
    receipt.projection.rules_sha256 = STR_CONTEXT_RULES_SHA256
    const map = writeSourceMapFixture(directory, receipt)
    receipt.capture.source_map_sha256 = map.sourceMapSha256
    seal(receipt)
    const route: any = {
      ...expected(receipt),
      receipt_path: '/candidate-only-fixture',
      receipt: normalizeStrContextReceipt(receipt),
      source_map_artifacts: map.artifacts,
    }
    ;(getY1SourceSnapshot as jest.Mock).mockImplementation(async (_cohort, chrom) => {
      const run = receipt.primary_snapshot.runs.find((r: any) => r.chrom === chrom)
      return {
        database: receipt.primary_snapshot.database,
        run_id: run.run_id,
        cohort: 'aou',
        reference_genome: 'GRCh38',
        primary_manifest_sha256: run.manifest_sha256,
        accepted_task_attempt_digest:
          drift === 'primary' ? 'b'.repeat(64) : run.accepted_task_attempt_digest,
      }
    })
    const query = jest.fn(async (_route, sql: string, params?: Record<string, unknown>) => {
      expect(params).toMatchObject({
        uri: receipt.source.runtime_uri,
        generation: receipt.source.runtime_generation,
      })
      if (sql.includes('system.columns'))
        return Object.entries(strContextColumnShapes).flatMap(([table, cols]) =>
          Object.entries(cols).map(([name, type]) => ({
            table,
            name,
            type: drift === 'types' && name === 'source_vc' ? 'String' : type,
          }))
        )
      if (sql.includes('system.tables'))
        return Object.keys(strContextColumnShapes).map((name) => ({
          name,
          engine: drift === 'engine' ? 'ReplacingMergeTree' : 'MergeTree',
        }))
      if (sql.includes('min(row_ordinal)'))
        return [
          {
            rows: 1,
            min_ordinal: 1,
            max_ordinal: drift === 'ordinals' ? 2 : 1,
            physical_keys: drift === 'duplicates' ? 0 : 1,
            contexts: drift === 'contexts' ? 0 : 1,
            exact: drift === 'identity' ? 0 : 1,
          },
        ]
      if (sql.includes('AS mismatches')) return [{ mismatches: drift === 'join' ? 1 : 0 }]
      if (sql.includes('AS mapping_rows'))
        return [
          {
            contig: 'chr1',
            mapping_rows: 1,
            target_keys: drift === 'targets' ? 0 : 1,
            available_rows: 1,
            absent_rows: 0,
            ambiguous_rows: 0,
            compound_rows: 0,
            referenced_source_rows: 1,
            exact: 1,
            invalid: drift === 'mapping' ? 1 : 0,
          },
        ]
      if (sql.includes('AS canonical_rows'))
        return [
          {
            contig: 'chr1',
            canonical_rows: 1,
            allele_available_rows: 1,
            pair_available_rows: 1,
            equal_context_rows: 1,
            wider_context_rows: 0,
            vc_populated_rows: 0,
            invalid: drift === 'helpers' ? 1 : 0,
          },
        ]
      throw new Error(`unexpected SQL: ${sql}`)
    })
    return { receipt, route, query }
  }
  test('checks typed source grain, current selected primary bundle, multiplicity and whole joins', async () => {
    const { route, query } = setup()
    await preflightStrContext(route, query)
    expect(getY1SourceSnapshot).toHaveBeenCalledWith('aou', 'chrY')
    expect(
      query.mock.calls.some(([, sql]) => sql.includes('m.source_row_ordinal = s.row_ordinal'))
    ).toBe(true)
    expect(query.mock.calls.some(([, sql]) => /ANY JOIN|argMax\(/.test(sql))).toBe(false)
  })
  test.each([
    'primary',
    'types',
    'engine',
    'ordinals',
    'duplicates',
    'contexts',
    'identity',
    'join',
    'targets',
    'mapping',
    'helpers',
  ])('rejects %s drift before activation', async (drift) => {
    const { route, query } = setup(drift)
    await expect(preflightStrContext(route, query)).rejects.toThrow('Context-v2')
  })
  test.each(['missing', 'tamper', 'relabel'])(
    'rejects %s sourceMap evidence before any database query',
    async (kind) => {
      const { receipt, route, query } = setup()
      if (kind === 'missing') delete route.source_map_artifacts
      if (kind === 'tamper') writeFileSync(route.source_map_artifacts.sourceMapPath, '{}')
      if (kind === 'relabel') {
        receipt.source.uri = receipt.source.runtime_uri
        receipt.source.generation = receipt.source.runtime_generation
        seal(receipt)
      }
      await expect(preflightStrContext(route, query)).rejects.toThrow()
      expect(query).not.toHaveBeenCalled()
    }
  )
  test('rejects changed rules even with a valid receipt digest', async () => {
    const { receipt, route, query } = setup()
    receipt.projection.rules_sha256 = 'b'.repeat(64)
    seal(receipt)
    route.receipt = normalizeStrContextReceipt(receipt)
    await expect(preflightStrContext(route, query)).rejects.toThrow('rules digest')
  })
})

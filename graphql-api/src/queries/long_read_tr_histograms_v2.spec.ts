/* eslint-disable import/first */
import { jest } from '@jest/globals'

const mockQuery = jest.fn()
const mockSnapshot = jest.fn()
jest.mock('../clickhouse', () => ({
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))
jest.mock('../cache', () => ({ withCache: (fn: any) => fn }))
jest.mock('./long_read_y1_provenance', () => ({
  getY1SourceSnapshot: (...args: any[]) => mockSnapshot(...args),
}))
import { fetchLongReadTrRepeatCountPlots } from './long_read_tr_histograms'
import {
  parseSourceContextFields,
  parseSourceContextRow,
  sourceContextCacheKey,
  type SourceContextIdentity,
} from './long_read_tr_histograms_v2'

const component = { chrom: '1', start0: 100, end0: 120, motif: 'NGC' }
const source = {
  uri: 'gs://source/hist.tsv',
  generation: '123',
  size_bytes: 12345,
  md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
}
const identity: SourceContextIdentity = {
  cohort: 'hgsvc_hprc',
  ancillaryDatabase: 'gnomad_lr_y1_scratch_histogram_projection_hgsvc_hprc_fixture_attempt1',
  ancillaryRunId: 'capture_run',
  captureDatabase: 'gnomad_lr_y1_scratch_histogram_hgsvc_hprc_capture_run',
  projectionInstanceId: 'fixture_attempt1',
  source,
  projectionVersion: 'str-context-v2.3',
  receiptDigest: 'receipt',
  receiptIdentity: {},
  captureTaskId: 'custom_0',
  primaryDatabase: 'candidate-primary',
  primarySnapshotDigest: 'bundle',
  primaryRunId: 'primary-run',
  sourceRecords: [{ task_id: 'task', attempt_id: 'attempt', source_variant_id: 'variant', an: 4 }],
  component,
}
const fields = (overrides: Record<string, unknown> = {}) => ({
  LocusId: '1-100-120-NGC',
  Motif: 'NGC',
  Interval: '1:100-120',
  VC: '',
  NumCalledAlleles: '4',
  UniqueAlleleLengths: '2',
  AlleleSizeHistogram: '0x:2,3x:2',
  BiallelicHistogram: '0/3:2',
  AlleleSizeHistogram__afr_female: '0x:2,3x:2',
  BiallelicHistogram__afr_female: '0/3:2',
  AlleleSizeHistogram__afr_male: '',
  BiallelicHistogram__afr_male: '',
  AlleleSizeHistogram__afr: '0x:2,3x:2',
  BiallelicHistogram__afr: '0/3:2',
  AlleleSizeHistogram__female: '0x:2,3x:2',
  BiallelicHistogram__female: '0/3:2',
  ...overrides,
})
const row = (overrides: Record<string, unknown> = {}) => ({
  contract: 'updated_histogram_source_v1',
  cohort: identity.cohort,
  run_id: identity.ancillaryRunId,
  task_id: 'custom_0',
  source_uri: source.uri,
  source_generation: source.generation,
  source_size_bytes: source.size_bytes,
  source_md5_base64: source.md5_base64,
  row_ordinal: '1',
  projection_version: identity.projectionVersion,
  receipt_digest: identity.receiptDigest,
  locus_id: '1-100-120-NGC',
  motif: 'NGC',
  chrom: '1',
  locus_start: 100,
  locus_end: 120,
  source_interval: '1:100-120',
  source_vc: null,
  context_chrom: '1',
  context_start: 100,
  context_end: 120,
  num_called_alleles: 4,
  unique_allele_lengths: 2,
  source_fields: fields(),
  ...overrides,
})
const mapping = (overrides: Record<string, unknown> = {}) => ({
  cohort: identity.cohort,
  ancillary_run_id: identity.ancillaryRunId,
  projection_version: identity.projectionVersion,
  receipt_digest: identity.receiptDigest,
  primary_database: identity.primaryDatabase,
  primary_snapshot_digest: identity.primarySnapshotDigest,
  canonical_locus_id: '1-100-120-NGC',
  component_index: 0,
  chrom: '1',
  named_start: 100,
  named_end: 120,
  motif: 'NGC',
  mapping_status: 'available_source_context',
  context_count: 1,
  source_uri: source.uri,
  source_generation: source.generation,
  source_row_ordinal: '1',
  primary_binding_status: 'NOT_ESTABLISHED',
  primary_an_concordance: 'NOT_ESTABLISHED',
  ...overrides,
})
const receipt = {
  database: identity.ancillaryDatabase,
  run_id: identity.ancillaryRunId,
  cohort: identity.cohort,
  source: {
    uri: 'gs://original/hist.tsv',
    generation: '100',
    byte_size: source.size_bytes,
    md5_base64: source.md5_base64,
    runtime_uri: source.uri,
    runtime_generation: source.generation,
    runtime_byte_size: source.size_bytes,
    runtime_md5_base64: source.md5_base64,
  },
  capture: {
    database: identity.captureDatabase,
    run_id: identity.ancillaryRunId,
    task_id: 'custom_0',
    source_map_sha256: 'map-digest',
    receipt_sha256: 'capture-digest',
  },
  projection: { version: identity.projectionVersion, instance_id: identity.projectionInstanceId },
  receipt_digest: identity.receiptDigest,
  primary_snapshot: {
    database: identity.primaryDatabase,
    bundle_digest: 'bundle',
    runs: [
      {
        chrom: 'chr1',
        run_id: 'primary-run',
        manifest_sha256: 'manifest',
        accepted_task_attempt_digest: 'attempt-digest',
      },
    ],
  },
}
const route = {
  cohort: 'hgsvc_hprc',
  database: identity.ancillaryDatabase,
  run_id: identity.ancillaryRunId,
  receipt: { source_format: 'str_context_completion_v2', reconciliation: receipt },
} as any
const locus = () => ({
  reference_genome: 'GRCh38',
  lr_cohort: 'hgsvc_hprc' as const,
  primary_database: identity.primaryDatabase,
  source_run_id: 'primary-run',
  components: [component],
  source_records: identity.sourceRecords as any[],
})
const result = (rows: any[]) => Promise.resolve({ json: async () => rows })
const noPairs = () =>
  Object.fromEntries(
    Object.entries(fields()).filter(([key]) => !key.startsWith('BiallelicHistogram'))
  )

describe('candidate source-context histograms', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockSnapshot.mockReset()
    mockSnapshot.mockImplementation(async () => ({
      database: identity.primaryDatabase,
      run_id: 'primary-run',
      cohort: 'hgsvc_hprc',
      reference_genome: 'GRCh38',
      chrom: 'chr1',
      primary_manifest_sha256: 'manifest',
      accepted_task_attempt_digest: 'attempt-digest',
    }))
  })
  test('literal N motif, normal autosome and true zero-sized bin retain neutral original pairs', () => {
    const parsed = parseSourceContextRow(row(), identity)
    expect(parsed).toMatchObject({
      status: 'AVAILABLE_SOURCE_CONTEXT',
      identity: null,
      unit: 'SOURCE_REPORTED_UNIT',
      allele_status: 'AVAILABLE',
      pair_status: 'AVAILABLE_SOURCE_ENCODING',
      pair_encoding: 'TWO_COPY_CONSISTENT',
      pair_observations: 2,
      primary_binding: { status: 'NOT_ESTABLISHED', an_concordance: 'NOT_ESTABLISHED' },
      overall: { called_alleles: 4, called_diploid_genotypes: null },
      source_context: {
        source_locus_id: '1-100-120-NGC',
        context_relation: 'EQUAL',
        semantics_evidence_status: 'PRODUCER_VERSION_UNKNOWN',
      },
    })
    expect(parsed.allele_size_distribution[0].distribution[0]).toEqual({
      repunit_count: 0,
      frequency: 2,
    })
    expect(parsed.allele_size_distribution[1].distribution).toEqual([])
    expect(parsed.callability[1].called_alleles).toBe(0)
  })
  test.each(['', '1:90-130'])('wider context preserves raw bounds with VC %j', (vc) => {
    const parsed = parseSourceContextRow(
      row({
        source_interval: '1:90-130',
        context_start: 90,
        context_end: 130,
        source_vc: vc || null,
        source_fields: fields({ Interval: '1:90-130', VC: vc }),
      }),
      identity
    )
    expect(parsed.source_context).toMatchObject({
      interval_raw: '1:90-130',
      vc_raw: vc,
      context_relation: 'CONTAINS',
    })
    expect(parsed.page_match.component).toEqual(component)
  })
  test('Y diagonals may represent one value and unknown-sex counts included only once', () => {
    const f = {
      NumCalledAlleles: '145',
      UniqueAlleleLengths: '3',
      AlleleSizeHistogram: '8x:1,9x:143,10x:1',
      BiallelicHistogram: '8/8:1,9/9:143,10/10:1',
      AlleleSizeHistogram__afr_unknown: '8x:1,9x:143,10x:1',
      BiallelicHistogram__afr_unknown: '8/8:1,9/9:143,10/10:1',
      AlleleSizeHistogram__unknown: '8x:1,9x:143,10x:1',
      BiallelicHistogram__unknown: '8/8:1,9/9:143,10/10:1',
    }
    const parsed = parseSourceContextRow(
      row({
        chrom: 'Y',
        locus_id: 'Y-100-120-NGC',
        source_interval: 'Y:100-120',
        context_chrom: 'Y',
        num_called_alleles: 145,
        unique_allele_lengths: 3,
        source_fields: {
          ...f,
          LocusId: 'Y-100-120-NGC',
          Motif: 'NGC',
          Interval: 'Y:100-120',
          VC: '',
        },
      }),
      { ...identity, component: { ...component, chrom: 'Y' } }
    )
    expect(parsed).toMatchObject({
      pair_observations: 145,
      pair_encoding: 'SOURCE_N_OVER_N_MAY_BE_ONE_VALUE',
      overall: { called_alleles: 145, called_diploid_genotypes: null },
    })
    expect(parsed.allele_size_distribution).toHaveLength(1)
    expect(parsed.allele_size_distribution[0].sex).toBe('unknown')
  })
  test('missing and partial valid pairs leave allele view independent', () => {
    expect(parseSourceContextFields(noPairs())).toMatchObject({
      called: 4,
      pairs: null,
      pairStatus: 'UNAVAILABLE_MISSING',
    })
    const f = {
      NumCalledAlleles: '4',
      UniqueAlleleLengths: '2',
      AlleleSizeHistogram: '1x:3,2x:1',
      AlleleSizeHistogram__afr_female: '1x:3,2x:1',
      BiallelicHistogram: '1/2:1',
      BiallelicHistogram__afr_female: '1/2:1',
    }
    expect(parseSourceContextFields(f)).toMatchObject({
      called: 4,
      pairStatus: 'AVAILABLE_SOURCE_ENCODING',
      pairEncoding: 'SOURCE_N_OVER_N_MAY_BE_ONE_VALUE',
    })
  })
  test.each(['2/1:2', '0/3:0', '0/3:1,0/3:1', '0/7:2', '0/3:4294967296'])(
    'invalid pairs %s never disable valid alleles',
    (value) => {
      const parsed = parseSourceContextFields(fields({ BiallelicHistogram: value }))
      expect(parsed).toMatchObject({ called: 4, pairs: null, pairStatus: 'UNAVAILABLE_INVALID' })
    }
  )
  test('same-total wrong-size two-copy expansion never earns two-copy consistency', () => {
    const parsed = parseSourceContextFields({
      NumCalledAlleles: '4',
      UniqueAlleleLengths: '2',
      AlleleSizeHistogram: '1x:1,2x:3',
      AlleleSizeHistogram__afr_male: '1x:1,2x:3',
      BiallelicHistogram: '1/1:1,2/2:1',
      BiallelicHistogram__afr_male: '1/1:1,2/2:1',
    })
    expect(parsed.pairStatus).toBe('AVAILABLE_SOURCE_ENCODING')
    expect(parsed.pairEncoding).not.toBe('TWO_COPY_CONSISTENT')
  })
  test('lower bound validates every joint and marginal, not only global counts', () => {
    const f = {
      NumCalledAlleles: '4',
      UniqueAlleleLengths: '2',
      AlleleSizeHistogram: '1x:2,2x:2',
      AlleleSizeHistogram__afr_male: '1x:2',
      AlleleSizeHistogram__afr_female: '2x:2',
      BiallelicHistogram: '1/1:1,2/2:1',
      BiallelicHistogram__afr_male: '2/2:1',
      BiallelicHistogram__afr_female: '1/1:1',
    }
    expect(parseSourceContextFields(f).pairStatus).toBe('UNAVAILABLE_INVALID')
    expect(parseSourceContextFields(fields({ BiallelicHistogram__afr: '0/3:1' })).pairStatus).toBe(
      'UNAVAILABLE_INVALID'
    )
  })
  test.each([
    { NumCalledAlleles: null },
    { NumCalledAlleles: '5' },
    { UniqueAlleleLengths: '1' },
    { AlleleSizeHistogram: '0x:2,0x:2' },
    { AlleleSizeHistogram__afr: '0x:1,3x:2' },
    { AlleleSizeHistogram__afr_female: '0x:1,3x:2' },
    { AlleleSizeHistogram__unknown_female: '' },
  ])('rejects bad allele grammar/count/marginal %j', (override) => {
    expect(() => parseSourceContextFields(fields(override))).toThrow('TR_HISTOGRAM_INVARIANT')
  })
  test('zero-called row is no observations, not zero size; oversized payload rejected', () => {
    const empty = {
      LocusId: '1-100-120-NGC',
      Motif: 'NGC',
      Interval: '1:100-120',
      VC: '',
      NumCalledAlleles: '0',
      UniqueAlleleLengths: '0',
      AlleleSizeHistogram: '',
      AlleleSizeHistogram__afr_unknown: '',
    }
    expect(
      parseSourceContextRow(
        row({ num_called_alleles: 0, unique_allele_lengths: 0, source_fields: empty }),
        identity
      )
    ).toMatchObject({
      allele_status: 'UNAVAILABLE_NO_OBSERVATIONS',
      pair_status: 'UNAVAILABLE_MISSING',
      max_repunits: null,
    })
    expect(() => parseSourceContextRow(row({ ignored: 'x'.repeat(200 * 1024) }), identity)).toThrow(
      '200 KiB'
    )
  })
  test('optional summaries stay uninterpreted and are not coerced from null/missing to zero', () => {
    expect(
      parseSourceContextRow(
        row({ source_fields: fields({ HemiAlleleMax: '.', ShortAlleleMax: '', Mean: '1.50e+0' }) }),
        identity
      ).max_repunits
    ).toBe(3)
    for (const value of [null, 'NaN', 'Infinity', '-1', '1e999', '1e-999', '0x10']) {
      expect(() =>
        parseSourceContextRow(row({ source_fields: fields({ Mean: value }) }), identity)
      ).toThrow('invalid optional source summary')
    }
  })

  test('AN mismatch is not promoted to primary binding or used as source denominator', () => {
    const parsed = parseSourceContextRow(row(), { ...identity, sourceRecords: [{ an: 999 }] })
    expect(parsed.status).toBe('AVAILABLE_SOURCE_CONTEXT')
    expect(parsed.identity).toBeNull()
    expect(parsed.overall.called_alleles).toBe(4)
    expect(parsed.primary_an_comparison).toBe('MISMATCH')
    expect(parsed.primary_binding).toEqual({
      status: 'NOT_ESTABLISHED',
      an_concordance: 'NOT_ESTABLISHED',
    })
  })
  test('candidate cache binds all source/projection/snapshot/caller identity, including AN', () => {
    for (const change of [
      { source: { ...source, generation: '124' } },
      { source: { ...source, md5_base64: 'other' } },
      { ancillaryDatabase: 'other' },
      { ancillaryRunId: 'other' },
      { receiptDigest: 'other' },
      { receiptIdentity: { runtime_generation: 'other' } },
      { projectionVersion: 'other' },
      { primarySnapshotDigest: 'other' },
      { primaryDatabase: 'other' },
      { primaryRunId: 'other' },
      { sourceRecords: [{ an: 999 }] },
    ]) {
      expect(sourceContextCacheKey({ ...identity, ...change })).not.toBe(
        sourceContextCacheKey(identity)
      )
    }
    expect(sourceContextCacheKey(identity)).toMatch(/^lr_tr_histogram:candidate:v2:/)
  })
  test('v2 route uses separate exact source-key query, not position/primary binding', async () => {
    mockQuery
      .mockImplementationOnce(() => result([mapping()]))
      .mockImplementationOnce(() => result([row()]))
    expect((await fetchLongReadTrRepeatCountPlots(locus(), route)).status).toBe(
      'AVAILABLE_SOURCE_CONTEXT'
    )
    const requests = mockQuery.mock.calls.map(([r]) => r as any)
    expect(requests[0].query).toContain('lr_y1_str_context_mapping_v2')
    expect(requests[0].query_params).toMatchObject({
      primaryDatabase: 'candidate-primary',
      primarySnapshotDigest: 'bundle',
      canonicalLocusId: '1-100-120-NGC',
    })
    expect(requests[1].query).toContain('lr_y1_str_context_histograms_v2')
    expect(requests[1].query_params).toMatchObject({
      sourceRowOrdinal: '1',
      sourceUri: source.uri,
      sourceGeneration: source.generation,
    })
    expect(requests[1].query).not.toMatch(/\bOR\b/)
    expect(requests[1].query).not.toContain('y1_source_variant_id')
    expect(requests.every((r) => r.query.includes('LIMIT 2'))).toBe(true)
  })
  test.each([
    { source_uri: 'gs://original/hist.tsv', source_generation: '100' },
    { source_generation: '100' },
    { source_generation: '999' },
    { cohort: 'aou' },
    { task_id: 'other' },
  ])('rejects original/mixed/wrong physical row %j without fallback', async (override) => {
    mockQuery
      .mockImplementationOnce(() => result([mapping()]))
      .mockImplementationOnce(() => result([row(override)]))
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow(
      'TR_HISTOGRAM_INVARIANT'
    )
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })
  test('rejects a mapping pointer to original before physical lookup', async () => {
    mockQuery.mockImplementationOnce(() =>
      result([
        mapping({ source_uri: receipt.source.uri, source_generation: receipt.source.generation }),
      ])
    )
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow(
      'TR_HISTOGRAM_INVARIANT'
    )
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
  test('cache binds each original/runtime identity field and both evidence digests', () => {
    const base = { ...identity, receiptIdentity: receipt }
    for (const key of Object.keys(receipt.source)) {
      expect(
        sourceContextCacheKey({
          ...base,
          receiptIdentity: {
            ...receipt,
            source: { ...receipt.source, [key]: 'changed' },
          },
        })
      ).not.toBe(sourceContextCacheKey(base))
    }
    for (const key of ['source_map_sha256', 'receipt_sha256']) {
      expect(
        sourceContextCacheKey({
          ...base,
          receiptIdentity: {
            ...receipt,
            capture: { ...receipt.capture, [key]: 'changed' },
          },
        })
      ).not.toBe(sourceContextCacheKey(base))
    }
  })
  test('multiple primary records do not invent a binding or prevent a unique named association', async () => {
    mockQuery
      .mockImplementationOnce(() => result([mapping()]))
      .mockImplementationOnce(() => result([row()]))
    const parsed = await fetchLongReadTrRepeatCountPlots(
      { ...locus(), source_records: [{ an: 4 }, { an: 4 }] },
      route
    )
    expect(parsed).toMatchObject({
      status: 'AVAILABLE_SOURCE_CONTEXT',
      primary_an_comparison: 'NOT_COMPARABLE',
      primary_binding: { status: 'NOT_ESTABLISHED' },
    })
  })

  test('compound or stale primary snapshot never queries and does not fall back', async () => {
    expect(
      (
        await fetchLongReadTrRepeatCountPlots(
          { ...locus(), components: [component, component] },
          route
        )
      ).status
    ).toBe('UNAVAILABLE_COMPOUND_LOCUS')
    mockSnapshot.mockImplementation(async () => ({ run_id: 'wrong' }))
    expect(await fetchLongReadTrRepeatCountPlots(locus(), route)).toMatchObject({
      status: 'UNAVAILABLE_ANCILLARY',
      reason_code: 'PRIMARY_SNAPSHOT_MISMATCH',
    })
    expect(mockQuery).not.toHaveBeenCalled()
  })
  test.each([
    [[], 'UNAVAILABLE_NO_SOURCE_CONTEXT'],
    [[mapping(), mapping()], 'UNAVAILABLE_AMBIGUOUS_CONTEXT'],
    [
      [mapping({ mapping_status: 'unavailable_ambiguous', context_count: 2 })],
      'UNAVAILABLE_AMBIGUOUS_CONTEXT',
    ],
    [
      [mapping({ mapping_status: 'unavailable_no_context', context_count: 0 })],
      'UNAVAILABLE_NO_SOURCE_CONTEXT',
    ],
  ])('zero/multiple context rows never choose or sum', async (rows, status) => {
    mockQuery.mockImplementationOnce(() => result(rows as any[]))
    expect((await fetchLongReadTrRepeatCountPlots(locus(), route)).status).toBe(status)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
  test.each([
    'source_generation',
    'receipt_digest',
    'primary_snapshot_digest',
    'primary_binding_status',
    'canonical_locus_id',
  ])('rejects mismatched mapping %s', async (key) => {
    mockQuery.mockImplementationOnce(() => result([mapping({ [key]: 'wrong' })]))
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow(
      'TR_HISTOGRAM_INVARIANT'
    )
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
  test.each([
    { rows: [] },
    { rows: [row(), row()] },
    { rows: [row({ row_ordinal: '2' })] },
    { rows: [row({ source_generation: '124' })] },
  ])('mapping must reference exactly one immutable source row', async ({ rows }) => {
    mockQuery
      .mockImplementationOnce(() => result([mapping()]))
      .mockImplementationOnce(() => result(rows))
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow(
      'TR_HISTOGRAM_INVARIANT'
    )
  })
})

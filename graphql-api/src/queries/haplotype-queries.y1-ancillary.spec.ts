/* eslint-disable import/first */
import { jest } from '@jest/globals'

const mockQuery = jest.fn()
const mockRoute = jest.fn()

jest.mock('../clickhouse', () => ({
  isY1PilotEnabled: true,
  clickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
  getSourcePhasedMethylationClickhouseClient: () => ({
    query: (...args: any[]) => mockQuery(...args),
  }),
}))
jest.mock('../graphql/resolvers/ancillary-availability', () => ({
  getY1AncillaryRoute: (...args: any[]) => mockRoute(...args),
  getSourcePhasedMethylationRoute: (...args: any[]) => mockRoute(...args),
}))

import {
  fetchJoinedPhasedMethylationForRegion,
  fetchLRCoverageForRegion,
  fetchMethylationForRegion,
  fetchSTRHistogram,
} from './haplotype-queries'

describe('Y1 ancillary query routing', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockRoute.mockReset()
  })

  test.each(['hgsvc_hprc', 'aou'] as const)(
    'binds exact %s coverage run, cohort, chromosome, and bounded range',
    async (cohort) => {
      mockRoute.mockReturnValue({
        modality: 'coverage',
        cohort,
        database: `gnomad_lr_y1_cov_${cohort}`,
        run_id: `cov-${cohort}`,
      })
      mockQuery.mockImplementation(async () => ({ json: async () => [{ pos: 100, mean: 20 }] }))
      await expect(fetchLRCoverageForRegion(null, '1', 100, 200, cohort)).resolves.toEqual([
        { pos: 100, mean: 20 },
      ])
      const call = mockQuery.mock.calls[0][0] as any
      expect(call.query).toContain('FROM lr_y1_coverage')
      expect(call.query).toContain('WHERE chrom = {chrom:String}')
      expect(call.query).toContain('position BETWEEN {start:UInt32} AND {stop:UInt32}')
      expect(call.query).toContain('ancillary_run_id = {runId:String}')
      expect(call.query).toContain('ORDER BY position ASC')
      expect(call.query_params).toEqual({
        runId: `cov-${cohort}`,
        cohort,
        chrom: 'chr1',
        start: 100,
        stop: 200,
      })
      await expect(fetchLRCoverageForRegion(null, 'chr1', 0, 1_000_001, cohort)).rejects.toThrow(
        'range is too large'
      )
    }
  )

  test.each(['hgsvc_hprc', 'aou'] as const)(
    'returns no %s coverage without an admitted cohort route and never falls back',
    async (cohort) => {
      mockRoute.mockReturnValue(null)
      await expect(fetchLRCoverageForRegion(null, 'chr1', 100, 200, cohort)).resolves.toEqual([])
      expect(mockRoute).toHaveBeenCalledWith(cohort, 'coverage')
      expect(mockQuery).not.toHaveBeenCalled()
    }
  )

  test('uses canonical position for strict full-genome STR routes', async () => {
    mockRoute.mockReturnValue({
      modality: 'str_histogram',
      cohort: 'aou',
      database: 'gnomad_lr_y1_str_aou',
      run_id: 'str-aou',
      receipt: { source_format: 'str_completion' },
    })
    mockQuery.mockImplementation(async () => ({ json: async () => [] }))
    await expect(fetchSTRHistogram(null, '1', 10616, 'aou')).resolves.toBeNull()
    const call = mockQuery.mock.calls[0][0] as any
    expect(call.query).toContain('position AS position, source_end AS end_position')
    expect(call.query).toContain('chrom = {chrom:String} AND position = {position:UInt32}')
    expect(call.query_params.chrom).toBe('chr1')
  })

  test('keeps the STR duplicate-at-position invariant on the exact cohort route', async () => {
    mockRoute.mockReturnValue({
      modality: 'str_histogram',
      cohort: 'hgsvc_hprc',
      database: 'gnomad_lr_y1_str',
      run_id: 'str-1',
    })
    mockQuery.mockImplementation(async () => ({ json: async () => [{}, {}] }))
    await expect(fetchSTRHistogram(null, 'chr2', 42, 'hgsvc_hprc')).rejects.toThrow(
      'STR histogram invariant failure at chr2:42'
    )
    expect((mockQuery.mock.calls[0][0] as any).query).toContain(
      'source_start AS position, source_end AS end_position'
    )
    expect((mockQuery.mock.calls[0][0] as any).query_params).toEqual({
      runId: 'str-1',
      cohort: 'hgsvc_hprc',
      chrom: 'chr2',
      position: 42,
    })
  })

  test('binds sample-total methylation to its exact database run, cohort, range, and samples', async () => {
    mockRoute.mockReturnValue({
      modality: 'methylation',
      cohort: 'hgsvc_hprc',
      database: 'gnomad_lr_y1_methylation',
      run_id: 'methylation-1',
    })
    mockQuery.mockImplementation(async () => ({
      json: async () => [{ chr: 'chr3', pos1: 100, pos2: 101, sample: 'sample-1' }],
    }))
    await fetchMethylationForRegion(null, 'chr3', 100, 200, ['sample-1'], 'hgsvc_hprc')
    const call = mockQuery.mock.calls[0][0] as any
    expect(call.query).toContain('lr_methylation_cohort_availability')
    expect(call.query_params).toEqual({
      runId: 'methylation-1',
      cohort: 'hgsvc_hprc',
      chrom: 'chr3',
      start: 100,
      stop: 200,
      samples: ['sample-1'],
    })
  })

  test('binds the joined batch query to the exact admitted route and overflow sentinel', async () => {
    const admittedRoute = {
      database: 'exact-source-product',
      run_id: 'exact-run',
      receipt_path: '/exact/receipt.json',
      receipt: {
        route_run_id: 'exact-run',
        completion_receipt_sha256: 'completion',
        source_manifest_sha256: 'manifest',
      },
    } as any
    mockRoute.mockReturnValue(admittedRoute)
    mockQuery.mockImplementation(async () => ({ json: async () => [] }))
    await fetchJoinedPhasedMethylationForRegion(admittedRoute, 'chr22', 100, 200, [
      'HG00097',
      'HG00126',
    ])
    const call = mockQuery.mock.calls[0][0] as any
    expect(call.query).toContain('stable_key AS source_row_key')
    expect(call.query).toContain('source_haplotype AS vcf_strand')
    expect(call.query).toContain('pos1 BETWEEN {rawStart0:UInt32} AND {rawStop0:UInt32}')
    expect(call.query).toContain('sample_id IN ({sampleIds:Array(String)})')
    expect(call.query).toContain('ORDER BY pos1, sample_id, source_haplotype, stable_key')
    expect(call.query).toContain('LIMIT 250001')
    expect(call.query_params).toEqual({
      chrom: 'chr22',
      rawStart0: 99,
      rawStop0: 199,
      sampleIds: ['HG00097', 'HG00126'],
    })
    expect(call.clickhouse_settings).toMatchObject({
      max_execution_time: 30,
      max_result_rows: '250001',
      result_overflow_mode: 'throw',
      max_rows_to_read: '10000000',
      read_overflow_mode: 'throw',
      max_bytes_to_read: '1073741824',
    })
  })

  test('queries canonical first/last boundaries as raw BED start0 without stop+1 admission', async () => {
    const admittedRoute = {
      database: 'exact-source-product',
      run_id: 'exact-run',
      receipt_path: '/exact/receipt.json',
      receipt: {
        route_run_id: 'exact-run',
        completion_receipt_sha256: 'completion',
        source_manifest_sha256: 'manifest',
      },
    } as any
    mockRoute.mockReturnValue(admittedRoute)
    mockQuery.mockImplementation(async () => ({ json: async () => [] }))
    await fetchJoinedPhasedMethylationForRegion(admittedRoute, 'chr1', 1, 2, ['HG00097'])
    expect((mockQuery.mock.calls[0][0] as any).query_params).toMatchObject({
      rawStart0: 0,
      rawStop0: 1,
    })
  })

  test('fails closed when the raw route is lost or mismatched after admission', async () => {
    const admittedRoute = {
      database: 'exact-source-product',
      run_id: 'exact-run',
      receipt_path: '/exact/receipt.json',
      receipt: {
        route_run_id: 'exact-run',
        completion_receipt_sha256: 'completion',
        source_manifest_sha256: 'manifest',
      },
    } as any
    for (const currentRoute of [
      null,
      { ...admittedRoute, run_id: 'other-run' },
      {
        ...admittedRoute,
        receipt: { ...admittedRoute.receipt, source_manifest_sha256: 'other-manifest' },
      },
    ]) {
      mockRoute.mockReturnValue(currentRoute)
      await expect(
        fetchJoinedPhasedMethylationForRegion(admittedRoute, 'chr22', 100, 200, ['HG00097'])
      ).rejects.toMatchObject({
        extensions: { code: 'JOINED_METHYLATION_CONTRACT_MISMATCH' },
      })
    }
    expect(mockQuery).not.toHaveBeenCalled()
  })

  test('does not convert a joined ClickHouse failure into an empty result', async () => {
    const admittedRoute = {
      database: 'exact-source-product',
      run_id: 'exact-run',
      receipt_path: '/exact/receipt.json',
      receipt: {
        route_run_id: 'exact-run',
        completion_receipt_sha256: 'completion',
        source_manifest_sha256: 'manifest',
      },
    } as any
    mockRoute.mockReturnValue(admittedRoute)
    mockQuery.mockImplementation(async () => {
      throw new Error('private ClickHouse failure')
    })
    await expect(
      fetchJoinedPhasedMethylationForRegion(admittedRoute, 'chr22', 100, 200, ['HG00097'])
    ).rejects.toThrow('private ClickHouse failure')
  })

  test('returns absent AoU methylation without querying or falling back to HGSVC', async () => {
    mockRoute.mockReturnValue(null)
    await expect(
      fetchMethylationForRegion(null, 'chr1', 100, 200, ['sample'], 'aou')
    ).resolves.toEqual([])
    expect(mockQuery).not.toHaveBeenCalled()
    expect(mockRoute).toHaveBeenCalledWith('aou', 'methylation')
  })
})

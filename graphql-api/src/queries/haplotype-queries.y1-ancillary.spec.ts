/* eslint-disable import/first */
import { jest } from '@jest/globals'

const mockQuery = jest.fn()
const mockRoute = jest.fn()

jest.mock('../clickhouse', () => ({
  isY1PilotEnabled: true,
  clickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))
jest.mock('../graphql/resolvers/ancillary-availability', () => ({
  getY1AncillaryRoute: (...args: any[]) => mockRoute(...args),
}))

import {
  fetchLRCoverageForRegion,
  fetchMethylationForRegion,
  fetchSTRHistogram,
} from './haplotype-queries'

describe('Y1 ancillary query routing', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockRoute.mockReset()
  })

  test('binds exact coverage run, cohort, chromosome, and bounded range', async () => {
    mockRoute.mockReturnValue({
      modality: 'coverage',
      cohort: 'aou',
      database: 'gnomad_lr_y1_cov_aou',
      run_id: 'cov-aou',
    })
    mockQuery.mockImplementation(async () => ({ json: async () => [{ pos: 100, mean: 20 }] }))
    await expect(fetchLRCoverageForRegion(null, '1', 100, 200, 'aou')).resolves.toEqual([
      { pos: 100, mean: 20 },
    ])
    const call = mockQuery.mock.calls[0][0] as any
    expect(call.query).toContain('FROM lr_y1_coverage')
    expect(call.query).toContain('WHERE chrom = {chrom:String}')
    expect(call.query).toContain('position BETWEEN {start:UInt32} AND {stop:UInt32}')
    expect(call.query).toContain('ancillary_run_id = {runId:String}')
    expect(call.query).toContain('ORDER BY position ASC')
    expect(call.query_params).toEqual({
      runId: 'cov-aou',
      cohort: 'aou',
      chrom: 'chr1',
      start: 100,
      stop: 200,
    })
    await expect(fetchLRCoverageForRegion(null, 'chr1', 0, 1_000_001, 'aou')).rejects.toThrow(
      'range is too large'
    )
  })

  test('returns no coverage without an admitted cohort route', async () => {
    mockRoute.mockReturnValue(null)
    await expect(fetchLRCoverageForRegion(null, 'chr1', 100, 200, 'aou')).resolves.toEqual([])
    expect(mockQuery).not.toHaveBeenCalled()
  })

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

  test('returns absent AoU methylation without querying or falling back to HGSVC', async () => {
    mockRoute.mockReturnValue(null)
    await expect(
      fetchMethylationForRegion(null, 'chr1', 100, 200, ['sample'], 'aou')
    ).resolves.toEqual([])
    expect(mockQuery).not.toHaveBeenCalled()
    expect(mockRoute).toHaveBeenCalledWith('aou', 'methylation')
  })
})

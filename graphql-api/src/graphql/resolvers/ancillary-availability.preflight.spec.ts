/* eslint-disable import/first */
import { jest } from '@jest/globals'
import { canonicalY1ContigLengths, fullGrch38PositionCount } from '../../y1_admission_config'

const mockQuery = jest.fn()
const coverageReceipt = (database: string, run_id: string, cohort: 'hgsvc_hprc' | 'aou') => ({
  schema_version: 1 as const,
  status: 'completed' as const,
  database,
  run_id,
  cohort,
  modality: 'coverage' as const,
  job_uuid: '123e4567-e89b-42d3-a456-426614174000',
  receipts: { expected: 2, accepted: 2, failed_attempts: 0, rejects: 0 },
  reconciliation: {
    canonical_rows: fullGrch38PositionCount,
    contigs: [...canonicalY1ContigLengths].map(([chrom, length]) => ({
      chrom,
      rows: length,
      unique_positions: length,
      min_position: 1,
      max_position: length,
    })),
  },
})
const mockRoutes = [
  {
    modality: 'coverage' as const,
    cohort: 'hgsvc_hprc' as const,
    database: 'gnomad_lr_y1_cov_hgsvc',
    run_id: 'cov-hgsvc',
    receipt_path: '/receipt/hgsvc',
    receipt: coverageReceipt('gnomad_lr_y1_cov_hgsvc', 'cov-hgsvc', 'hgsvc_hprc'),
  },
  {
    modality: 'coverage' as const,
    cohort: 'aou' as const,
    database: 'gnomad_lr_y1_cov_aou',
    run_id: 'cov-aou',
    receipt_path: '/receipt/aou',
    receipt: coverageReceipt('gnomad_lr_y1_cov_aou', 'cov-aou', 'aou'),
  },
]

jest.mock('../../clickhouse', () => ({
  isY1PilotEnabled: true,
  y1AncillaryRoutes: mockRoutes,
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))

import {
  ancillaryDecision,
  getY1AncillaryRoute,
  preflightY1Ancillaries,
} from './ancillary-availability'

const coverageColumns = ['ancillary_run_id', 'cohort', 'chrom', 'position']
const physicalCoverage = () =>
  [...canonicalY1ContigLengths].map(([chrom, length]) => ({
    chrom,
    rows: length,
    unique_positions: length,
    min_position: 1,
    max_position: length,
    exact: length,
  }))

const installFixture = (kind: 'complete' | 'one-row-per-contig' | 'identity-mismatch') => {
  mockQuery.mockImplementation(({ query }: any) => {
    if (query.includes('FROM system.columns')) {
      return Promise.resolve({
        json: async () => coverageColumns.map((name) => ({ table: 'lr_y1_coverage', name })),
      })
    }
    if (query.includes('FROM lr_y1_coverage')) {
      const rows = physicalCoverage()
      if (kind === 'one-row-per-contig') {
        return Promise.resolve({
          json: async () =>
            rows.map((row) => ({
              ...row,
              rows: 1,
              unique_positions: 1,
              min_position: 1,
              max_position: 1,
              exact: 1,
            })),
        })
      }
      if (kind === 'identity-mismatch') rows[0].exact -= 1
      return Promise.resolve({ json: async () => rows })
    }
    throw new Error(`Unexpected query: ${query}`)
  })
}

describe('configured Y1 ancillary receipt preflight', () => {
  beforeEach(() => mockQuery.mockReset())

  test('advertises only exact receipt-matched routes and keeps cohort isolation', async () => {
    installFixture('complete')
    await preflightY1Ancillaries()
    expect(getY1AncillaryRoute('hgsvc_hprc', 'coverage')?.run_id).toBe('cov-hgsvc')
    expect(getY1AncillaryRoute('aou', 'coverage')?.run_id).toBe('cov-aou')
    expect(ancillaryDecision('aou', 'coverage').available).toBe(true)
    expect(ancillaryDecision('aou', 'str_histogram').available).toBe(false)
    expect(ancillaryDecision('aou', 'methylation').available).toBe(false)
  })

  test('rejects one-row-per-contig partial coverage', async () => {
    installFixture('one-row-per-contig')
    await expect(preflightY1Ancillaries()).rejects.toThrow('does not match its completion receipt')
    expect(getY1AncillaryRoute('hgsvc_hprc', 'coverage')).toBeNull()
  })

  test('rejects live rows whose exact route identity mismatches the receipt', async () => {
    installFixture('identity-mismatch')
    await expect(preflightY1Ancillaries()).rejects.toThrow('does not match its completion receipt')
  })
})

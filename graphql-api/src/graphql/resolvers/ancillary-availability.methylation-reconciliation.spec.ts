/* eslint-disable import/first */
import { jest } from '@jest/globals'
import { canonicalY1ContigLengths } from '../../y1_admission_config'

const mockQuery = jest.fn()
const chroms = [...canonicalY1ContigLengths.keys()]
const sortedChroms = [...chroms].sort()
const makeRoute = (includeOrphan: boolean) => ({
  modality: 'methylation' as const,
  cohort: 'hgsvc_hprc' as const,
  database: 'gnomad_lr_y1_methylation',
  run_id: 'methylation-run',
  receipt_path: '/receipt/methylation',
  receipt: {
    schema_version: 1 as const,
    status: 'completed' as const,
    database: 'gnomad_lr_y1_methylation',
    run_id: 'methylation-run',
    cohort: 'hgsvc_hprc' as const,
    modality: 'methylation' as const,
    job_uuid: '123e4567-e89b-42d3-a456-426614174000',
    receipts: { expected: 1, accepted: 1, failed_attempts: 0, rejects: 0 },
    reconciliation: {
      roster_rows: 1,
      included_samples: 1,
      detail_rows: includeOrphan ? 25 : 24,
      summary_rows: 24,
      availability_rows: 1,
      detail_contigs: chroms.map((chrom) => ({
        chrom,
        rows: includeOrphan && chrom === 'chr1' ? 2 : 1,
      })),
      summary_contigs: chroms.map((chrom) => ({ chrom, rows: 1 })),
      samples: [
        {
          sample_id: 'sample-1',
          included: true,
          availability: 'available_complete_source',
          detail_rows: 24,
          indexed_contigs: sortedChroms,
        },
      ],
    },
  },
})
let mockRoutes = [makeRoute(false)]

jest.mock('../../clickhouse', () => ({
  isY1PilotEnabled: true,
  get y1AncillaryRoutes() {
    return mockRoutes
  },
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))

import { getY1AncillaryRoute, preflightY1Ancillaries } from './ancillary-availability'

const columns = {
  lr_methylation: ['chrom', 'pos1', 'pos2', 'sample_id', 'methylation', 'coverage'],
  lr_methylation_summary: [
    'chrom',
    'pos1',
    'pos2',
    'mean_methylation',
    'mean_coverage',
    'num_samples',
    'std_methylation',
  ],
  lr_methylation_sample_availability: [
    'ancillary_run_id',
    'cohort',
    'sample_id',
    'availability',
    'included',
    'indexed_contigs',
    'detail_rows',
    'reason',
  ],
  lr_methylation_cohort_availability: ['ancillary_run_id', 'cohort', 'availability', 'reason'],
}

const installFixture = (includeOrphan: boolean) => {
  mockRoutes = [makeRoute(includeOrphan)]
  mockQuery.mockImplementation(({ query }: any) => {
    if (query.includes('FROM system.columns')) {
      return Promise.resolve({
        json: async () =>
          Object.entries(columns).flatMap(([table, names]) =>
            names.map((name) => ({ table, name }))
          ),
      })
    }
    if (query.includes('FROM lr_methylation_cohort_availability')) {
      return Promise.resolve({
        json: async () => [{ availability: 'available_sample_total', rows: 1 }],
      })
    }
    if (query.includes('FROM lr_methylation_sample_availability')) {
      return Promise.resolve({
        json: async () => [
          {
            sample_id: 'sample-1',
            availability: 'available_complete_source',
            included: 1,
            indexed_contigs: sortedChroms,
            detail_rows: 24,
            reason: '',
          },
        ],
      })
    }
    if (query.includes('FROM lr_methylation_summary')) {
      return Promise.resolve({ json: async () => chroms.map((chrom) => ({ chrom, rows: 1 })) })
    }
    if (query.includes('FROM lr_methylation')) {
      const rows = chroms.map((chrom) => ({ sample_id: 'sample-1', chrom, rows: 1 }))
      if (includeOrphan) rows.push({ sample_id: 'orphan', chrom: 'chr1', rows: 1 })
      return Promise.resolve({ json: async () => rows })
    }
    throw new Error(`Unexpected query: ${query}`)
  })
}

describe('configured Y1 methylation roster reconciliation', () => {
  beforeEach(() => mockQuery.mockReset())

  test('advertises an exact roster/detail/summary match', async () => {
    installFixture(false)
    await preflightY1Ancillaries()
    expect(getY1AncillaryRoute('hgsvc_hprc', 'methylation')?.run_id).toBe('methylation-run')
  })

  test('rejects physical detail rows for a sample outside the exact roster', async () => {
    installFixture(true)
    await expect(preflightY1Ancillaries()).rejects.toThrow('roster does not match')
  })
})

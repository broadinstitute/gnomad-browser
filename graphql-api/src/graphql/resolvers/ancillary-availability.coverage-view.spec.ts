/* eslint-disable import/first */
import { jest } from '@jest/globals'
import {
  canonicalY1ContigLengths,
  fullGrch38PositionCount,
  y1CoverageRawColumnShape,
  y1CoverageViewColumnShape,
} from '../../y1_admission_config'

const database = 'gnomad_lr_y1_cov_hgsvc'
const runId = 'demo-coverage-hgsvc-hprc-full-genome-20260804-r1'
const source = {
  cohort: 'hgsvc_hprc',
  modality: 'coverage',
  uri: 'gs://source/hgsvc.coverage.tsv.gz',
  generation: '123',
  byte_size: 100,
  md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
  crc32c_base64: 'AAAAAA==',
  runtime_uri: 'gs://mirror/hgsvc.coverage.tsv.gz',
  runtime_generation: '456',
  runtime_byte_size: 100,
  runtime_md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
  runtime_crc32c_base64: 'AAAAAA==',
  source_access: 'direct',
  mirror_verified_by_worker: true,
}
const contigs = [...canonicalY1ContigLengths].map(([chrom, length]) => ({
  chrom,
  rows: length,
  unique_positions: length,
  min_position: 1,
  max_position: length,
}))
const route = {
  modality: 'coverage' as const,
  cohort: 'hgsvc_hprc' as const,
  database,
  run_id: runId,
  receipt_path: '/receipt/coverage-view',
  receipt: {
    schema_version: 1 as const,
    status: 'completed' as const,
    database,
    run_id: runId,
    cohort: 'hgsvc_hprc' as const,
    modality: 'coverage' as const,
    source_format: 'coverage_view_completion' as const,
    job_uuid: null,
    receipts: { expected: 1, accepted: 1, failed_attempts: 0, rejects: 0 },
    reconciliation: { canonical_rows: fullGrch38PositionCount, contigs, source },
  },
}

const mockQuery = jest.fn()
jest.mock('../../clickhouse', () => ({
  isY1PilotEnabled: true,
  y1AncillaryRoutes: [route],
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))

import { getY1AncillaryRoute, preflightY1Ancillaries } from './ancillary-availability'

const columns = [
  ...y1CoverageRawColumnShape.map(([name, type], index) => ({
    table: 'lr_coverage',
    name,
    type,
    position: index + 1,
  })),
  ...y1CoverageViewColumnShape.map(([name, type], index) => ({
    table: 'lr_y1_coverage',
    name,
    type,
    position: index + 1,
  })),
]

const installFixture = (drift: 'none' | 'engine' | 'parts' | 'identity' = 'none') => {
  mockQuery.mockImplementation(({ query }: any) => {
    if (query.includes('FROM system.tables')) {
      return Promise.resolve({
        json: async () => [
          {
            name: 'lr_coverage',
            engine: 'MergeTree',
            create_table_query: 'CREATE TABLE lr_coverage',
          },
          {
            name: 'lr_y1_coverage',
            engine: drift === 'engine' ? 'MergeTree' : 'View',
            create_table_query: `CREATE VIEW ${database}.lr_y1_coverage AS SELECT * FROM ${database}.lr_coverage`,
          },
        ],
      })
    }
    if (query.includes('FROM system.columns')) {
      return Promise.resolve({ json: async () => columns })
    }
    if (query.includes('FROM system.parts')) {
      const partRows = contigs.map(({ chrom, rows }) => ({ chrom, rows }))
      if (drift === 'parts') partRows[0].rows -= 1
      return Promise.resolve({ json: async () => partRows })
    }
    if (query.includes('FROM lr_y1_coverage')) {
      return Promise.resolve({
        json: async () => [
          {
            rows: 10,
            min_position: 100000,
            max_position: 100009,
            unique_positions: 10,
            exact: drift === 'identity' ? 9 : 10,
          },
        ],
      })
    }
    throw new Error(`Unexpected query: ${query}`)
  })
}

describe('raw-backed Y1 coverage View startup admission', () => {
  beforeEach(() => mockQuery.mockReset())

  test('accepts exact raw parts and View shape without requiring View parts', async () => {
    installFixture()
    await preflightY1Ancillaries()
    expect(getY1AncillaryRoute('hgsvc_hprc', 'coverage')?.run_id).toBe(runId)
    const queries = mockQuery.mock.calls.map((call) => String((call[0] as any).query))
    const partsQueries = queries.filter((query) => query.includes('FROM system.parts'))
    expect(partsQueries).toHaveLength(1)
    expect(partsQueries[0]).toContain("table = 'lr_coverage'")
    expect(partsQueries[0]).not.toContain("table = 'lr_y1_coverage'")
    const viewQuery = queries.find((query) => query.includes('FROM lr_y1_coverage'))!
    expect(viewQuery).toContain("chrom = 'chr22'")
    expect(viewQuery).toContain('position BETWEEN 100000 AND 100009')
  })

  test.each(['engine', 'parts', 'identity'] as const)('fails closed on %s drift', async (drift) => {
    installFixture(drift)
    await expect(preflightY1Ancillaries()).rejects.toThrow(/coverage route/)
    expect(getY1AncillaryRoute('hgsvc_hprc', 'coverage')).toBeNull()
  })
})

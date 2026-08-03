/* eslint-disable import/first */
import { jest } from '@jest/globals'

const mockQuery = jest.fn()
const configuredMap = new Map([
  [
    'hgsvc_hprc',
    new Map([
      ['chr1', 'hgsvc-chr1'],
      ['chr2', 'hgsvc-chr2'],
    ]),
  ],
  ['aou', new Map([['chr1', 'aou-chr1']])],
])

jest.mock('../clickhouse', () => ({
  isY1PilotEnabled: true,
  y1ClickhouseConfig: { url: 'http://127.0.0.1:9999', database: 'gnomad_lr_y1_demo' },
  y1PrimaryRunMap: configuredMap,
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))

import {
  getY1SourceSnapshot,
  preflightY1AcceptedSources,
  resetY1SourceSnapshotForTests,
} from './long_read_y1_provenance'

const schema: Record<string, string[]> = {
  lr_y1_load_runs: [
    'run_id',
    'revision',
    'release',
    'cohort',
    'reference_genome',
    'chrom',
    'load_scope',
    'interval_start',
    'interval_end',
    'state',
    'summary_rows',
    'allele_rows',
    'frequency_rows',
    'carrier_rows',
    'expected_tasks',
  ],
  lr_y1_summaries: ['run_id', 'release', 'cohort', 'reference_genome', 'chrom'],
  lr_y1_alleles: [
    'run_id',
    'release',
    'cohort',
    'reference_genome',
    'chrom',
    'position',
    'reference_end',
    'xpos',
    'source_variant_id',
    'alt_index',
    'ref_allele',
    'alt',
    'allele_type',
    'filters',
    'ac',
    'an',
    'af',
    'allele_length',
    'rsids',
    'cadd_phred',
    'phylop',
    'major_consequence',
    'short_read_match_id',
    'short_read_match_type',
    'short_read_match_source',
  ],
  lr_y1_frequencies: [
    'run_id',
    'release',
    'cohort',
    'reference_genome',
    'chrom',
    'position',
    'source_variant_id',
    'alt_index',
    'division',
    'ac',
    'an',
    'af',
    'values_available',
  ],
  lr_y1_carriers: ['run_id'],
}

const runs = [
  { run_id: 'hgsvc-chr1', cohort: 'hgsvc_hprc', chrom: 'chr1' },
  { run_id: 'hgsvc-chr2', cohort: 'hgsvc_hprc', chrom: 'chr2' },
  { run_id: 'aou-chr1', cohort: 'aou', chrom: 'chr1' },
].map((run) => ({
  ...run,
  release: 'y1',
  reference_genome: 'GRCh38',
  load_scope: 'full_chromosome',
  interval_start: 0,
  interval_end: 0,
  state: 'loading',
  summary_rows: 0,
  allele_rows: 0,
  frequency_rows: 0,
  carrier_rows: 0,
  expected_tasks: 2,
  latest_revision_rows: 1,
}))

const installFixture = (acceptedTasks = 2, attempts = acceptedTasks, tasks = acceptedTasks) => {
  mockQuery.mockImplementation(({ query, query_params = {} }: any) => {
    if (query.includes('FROM system.columns'))
      return Promise.resolve({
        json: async () =>
          Object.entries(schema).flatMap(([table, columns]) =>
            columns.map((name) => ({ table, name }))
          ),
      })
    if (query.includes('FROM lr_y1_load_runs AS ledger')) {
      return Promise.resolve({ json: async () => runs })
    }
    if (query.includes('FROM lr_y1_task_attempts AS ledger')) {
      const carriers = String(query_params.runId).startsWith('hgsvc') ? 13 : 0
      return Promise.resolve({
        json: async () => [
          {
            attempts,
            tasks,
            accepted: acceptedTasks,
            accepted_tasks: acceptedTasks,
            invalid_identity: 0,
            rejected: 0,
            summaries: 11,
            alleles: 17,
            frequencies: 23,
            carriers,
          },
        ],
      })
    }
    if (query.includes('FROM lr_y1_rejects_staging')) {
      return Promise.resolve({ json: async () => [{ physical_rejects: 0 }] })
    }
    if (query.includes("SELECT 'lr_y1_summaries' AS table")) {
      return Promise.resolve({
        json: async () => [
          { table: 'lr_y1_summaries', total: 11, exact: 11 },
          { table: 'lr_y1_alleles', total: 17, exact: 17 },
          { table: 'lr_y1_frequencies', total: 23, exact: 23 },
        ],
      })
    }
    if (query.includes('FROM lr_y1_carriers WHERE run_id')) {
      const carriers = String(query_params.runId).startsWith('hgsvc') ? 13 : 0
      return Promise.resolve({ json: async () => [{ total: carriers, exact: carriers }] })
    }
    throw new Error(`Unexpected query: ${query}`)
  })
}

describe('Y1 presentation task-accepted run routing', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    resetY1SourceSnapshotForTests()
  })

  test('selects exact runs by cohort and chromosome without cross-cohort leakage', async () => {
    installFixture()
    await preflightY1AcceptedSources()
    expect((await getY1SourceSnapshot('hgsvc_hprc', 'chr1'))?.run_id).toBe('hgsvc-chr1')
    expect((await getY1SourceSnapshot('hgsvc_hprc', '2'))?.run_id).toBe('hgsvc-chr2')
    expect((await getY1SourceSnapshot('aou', 'chr1'))?.run_id).toBe('aou-chr1')
    expect(await getY1SourceSnapshot('aou', 'chr2')).toBeNull()
    expect((await getY1SourceSnapshot('hgsvc_hprc', 'chr1'))?.state).toBe('accepted_tasks')
  })

  test('accepts a failed attempt followed by one accepted attempt for the same task', async () => {
    installFixture(2, 3, 2)
    await expect(preflightY1AcceptedSources()).resolves.toBeUndefined()
    expect((await getY1SourceSnapshot('hgsvc_hprc', 'chr2'))?.run_id).toBe('hgsvc-chr2')
  })

  test('rejects a configured run before routing when accepted task receipts are incomplete', async () => {
    installFixture(1)
    await expect(preflightY1AcceptedSources()).rejects.toThrow('task receipts are incomplete')
  })
})

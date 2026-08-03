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
const source = {
  source_uri: 'gs://bucket/source.vcf.gz',
  source_generation: '123',
  source_checksum_algorithm: 'md5_base64',
  source_checksum: 'AAAAAAAAAAAAAAAAAAAAAA==',
  source_size_bytes: 100,
  source_index_uri: 'gs://bucket/source.vcf.gz.tbi',
  source_index_generation: '124',
  source_index_checksum_algorithm: 'md5_base64',
  source_index_checksum: 'BBBBBBBBBBBBBBBBBBBBBB==',
  source_index_size_bytes: 10,
}
const manifestFor = (cohort: string, chrom: string, run_id: string) => ({
  cohort,
  chrom,
  run_id,
  manifest_sha256: 'a'.repeat(64),
  source,
  tasks: [
    { task_id: `${run_id}-task-1`, start: 1, stop: 100 },
    { task_id: `${run_id}-task-2`, start: 101, stop: 200 },
  ],
})
const configuredManifests = new Map([
  ['hgsvc_hprc\u0000chr1', manifestFor('hgsvc_hprc', 'chr1', 'hgsvc-chr1')],
  ['hgsvc_hprc\u0000chr2', manifestFor('hgsvc_hprc', 'chr2', 'hgsvc-chr2')],
  ['aou\u0000chr1', manifestFor('aou', 'chr1', 'aou-chr1')],
])

jest.mock('../clickhouse', () => ({
  isY1PilotEnabled: true,
  y1ClickhouseConfig: { url: 'http://127.0.0.1:9999', database: 'gnomad_lr_y1_demo' },
  y1PrimaryRunMap: configuredMap,
  y1PrimaryManifests: configuredManifests,
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
  interval_start: 1,
  interval_end: 200,
  state: 'loading',
  summary_rows: 0,
  allele_rows: 0,
  frequency_rows: 0,
  carrier_rows: 0,
  expected_tasks: 2,
  latest_revision_rows: 1,
}))

type FixtureOptions = {
  omitSecond?: boolean
  substituteTask?: boolean
  duplicateBounds?: boolean
  wrongGeneration?: boolean
  failedThenAccepted?: boolean
}

const installFixture = (options: FixtureOptions = {}) => {
  mockQuery.mockImplementation(({ query, query_params = {} }: any) => {
    if (query.includes('FROM system.columns')) {
      return Promise.resolve({
        json: async () =>
          Object.entries(schema).flatMap(([table, columns]) =>
            columns.map((name) => ({ table, name }))
          ),
      })
    }
    if (query.includes('FROM lr_y1_load_runs AS ledger')) {
      return Promise.resolve({ json: async () => runs })
    }
    if (query.includes('FROM lr_y1_task_attempts')) {
      const runId = String(query_params.runId)
      const manifest = [...configuredManifests.values()].find((entry) => entry.run_id === runId)!
      const accepted = manifest.tasks.map((task, index) => {
        const taskId = options.substituteTask && index === 1 ? `${runId}-substitute` : task.task_id
        const start = options.duplicateBounds && index === 1 ? 1 : task.start
        const stop = options.duplicateBounds && index === 1 ? 100 : task.stop
        const carriers = runId.startsWith('hgsvc') ? [6, 7][index] : 0
        const ledgerCounts = {
          source_records: index + 30,
          summaries: index === 0 ? 5 : 6,
          alleles: index === 0 ? 8 : 9,
          frequencies: index === 0 ? 11 : 12,
          carriers,
          rejects: 0,
        }
        return {
          task_id: taskId,
          attempt_id: `accepted-${index}`,
          state: 'accepted',
          chrom: manifest.chrom,
          interval_start: start,
          interval_end: stop,
          source_records: ledgerCounts.source_records,
          summary_rows: ledgerCounts.summaries,
          allele_rows: ledgerCounts.alleles,
          frequency_rows: ledgerCounts.frequencies,
          carrier_rows: ledgerCounts.carriers,
          rejected_records: ledgerCounts.rejects,
          report_json: JSON.stringify({
            run_id: runId,
            task_id: taskId,
            attempt_id: `accepted-${index}`,
            cohort: manifest.cohort,
            chrom: manifest.chrom,
            start,
            stop,
            ...source,
            source_generation:
              options.wrongGeneration && index === 1 ? 'wrong' : source.source_generation,
            state: 'accepted',
            counts: ledgerCounts,
          }),
        }
      })
      if (options.omitSecond) accepted.pop()
      if (options.failedThenAccepted) {
        const task = manifest.tasks[0]
        accepted.unshift({
          ...accepted[0],
          attempt_id: 'failed-0',
          state: 'failed',
          report_json: JSON.stringify({
            run_id: runId,
            task_id: task.task_id,
            attempt_id: 'failed-0',
            cohort: manifest.cohort,
            chrom: manifest.chrom,
            start: task.start,
            stop: task.stop,
            ...source,
            state: 'failed',
            counts: {
              source_records: 30,
              summaries: 5,
              alleles: 8,
              frequencies: 11,
              carriers: runId.startsWith('hgsvc') ? 6 : 0,
              rejects: 0,
            },
          }),
        })
      }
      return Promise.resolve({ json: async () => accepted })
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

describe('Y1 checked-manifest presentation routing', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    resetY1SourceSnapshotForTests()
  })

  test('accepts exact manifest tasks and preserves cohort/chromosome isolation', async () => {
    installFixture()
    await preflightY1AcceptedSources()
    expect((await getY1SourceSnapshot('hgsvc_hprc', 'chr2'))?.run_id).toBe('hgsvc-chr2')
    expect((await getY1SourceSnapshot('aou', 'chr1'))?.run_id).toBe('aou-chr1')
    expect(await getY1SourceSnapshot('aou', 'chr2')).toBeNull()
  })

  test('accepts a failed attempt followed by one exact accepted attempt', async () => {
    installFixture({ failedThenAccepted: true })
    await expect(preflightY1AcceptedSources()).resolves.toBeUndefined()
  })

  test.each([
    [{ omitSecond: true }, 'accepted current attempt'],
    [{ substituteTask: true }, 'absent from its checked manifest'],
    [{ duplicateBounds: true }, 'substituted bounds'],
    [{ wrongGeneration: true }, 'source_generation'],
  ])('fails closed for incomplete or substituted current receipts %#', async (options, error) => {
    installFixture(options as FixtureOptions)
    await expect(preflightY1AcceptedSources()).rejects.toThrow(error as string)
  })
})

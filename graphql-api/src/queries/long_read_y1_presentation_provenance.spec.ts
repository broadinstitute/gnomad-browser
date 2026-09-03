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
  primary_load_mode: 'standard',
  carrier_loading_status: 'available',
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
  lr_y1_task_attempts: [
    'run_id',
    'task_id',
    'attempt_id',
    'revision',
    'state',
    'chrom',
    'interval_start',
    'interval_end',
    'source_records',
    'summary_rows',
    'allele_rows',
    'frequency_rows',
    'carrier_rows',
    'rejected_records',
    'report_json',
  ],
  lr_y1_summaries: [
    'run_id',
    'release',
    'cohort',
    'reference_genome',
    'chrom',
    'task_id',
    'attempt_id',
  ],
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
    'task_id',
    'attempt_id',
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
    'task_id',
    'attempt_id',
  ],
  lr_y1_carriers: [
    'run_id',
    'release',
    'cohort',
    'reference_genome',
    'chrom',
    'position',
    'source_variant_id',
    'alt_index',
    'alt',
    'sample_id',
    'genotype_position',
    'genotype_fields_json',
    'gt_phased',
    'gt_alleles',
    'task_id',
    'attempt_id',
  ],
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
  emptyRunLedger?: boolean
  physicalAttemptSubstitution?:
    | 'lr_y1_summaries'
    | 'lr_y1_alleles'
    | 'lr_y1_frequencies'
    | 'lr_y1_carriers'
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
      return Promise.resolve({ json: async () => (options.emptyRunLedger ? [] : runs) })
    }
    if (query.includes('FROM lr_y1_task_attempts')) {
      const runId = String(query_params.runId)
      const manifest = [...configuredManifests.values()].find((entry) => entry.run_id === runId)!
      const accepted = manifest.tasks.map((task, index) => {
        const taskId = options.substituteTask && index === 1 ? `${runId}-substitute` : task.task_id
        const start = options.duplicateBounds && index === 1 ? 1 : task.start
        const stop = options.duplicateBounds && index === 1 ? 100 : task.stop
        const carriers =
          runId.startsWith('hgsvc') && manifest.carrier_loading_status !== 'unavailable_not_loaded'
            ? [6, 7][index]
            : 0
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
    if (query.includes('AS table_name')) {
      const runId = String(query_params.runId)
      const manifest = [...configuredManifests.values()].find((entry) => entry.run_id === runId)!
      const tables = [
        ['lr_y1_summaries', [5, 6]],
        ['lr_y1_alleles', [8, 9]],
        ['lr_y1_frequencies', [11, 12]],
        [
          'lr_y1_carriers',
          manifest.cohort === 'hgsvc_hprc' &&
          manifest.carrier_loading_status !== 'unavailable_not_loaded'
            ? [6, 7]
            : [0, 0],
        ],
      ] as const
      return Promise.resolve({
        json: async () =>
          tables.flatMap(([table_name, counts]) =>
            counts.flatMap((total, index) =>
              total
                ? [
                    {
                      table_name,
                      task_id: manifest.tasks[index].task_id,
                      attempt_id:
                        options.physicalAttemptSubstitution === table_name && index === 0
                          ? 'failed-0'
                          : `accepted-${index}`,
                      total,
                      exact: total,
                    },
                  ]
                : []
            )
          ),
      })
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
    const hgsvc = await getY1SourceSnapshot('hgsvc_hprc', 'chr2')
    expect(hgsvc?.run_id).toBe('hgsvc-chr2')
    expect(hgsvc?.accepted_task_attempts).toEqual([
      { task_id: 'hgsvc-chr2-task-1', attempt_id: 'accepted-0' },
      { task_id: 'hgsvc-chr2-task-2', attempt_id: 'accepted-1' },
    ])
    expect(hgsvc?.accepted_task_attempt_digest).toMatch(/^[a-f0-9]{64}$/)
    expect(hgsvc?.primary_manifest_sha256).toBe('a'.repeat(64))
    expect((await getY1SourceSnapshot('aou', 'chr1'))?.run_id).toBe('aou-chr1')
    expect(await getY1SourceSnapshot('aou', 'chr2')).toBeNull()
  })

  test('admits an unfinalized presentation campaign from exact terminal task attempts', async () => {
    installFixture({ emptyRunLedger: true })
    await expect(preflightY1AcceptedSources()).resolves.toBeUndefined()
  })

  test('marks exact aggregate-only HGSVC chromosomes carrier-unavailable', async () => {
    const manifest = configuredManifests.get('hgsvc_hprc\u0000chr2')! as any
    manifest.primary_load_mode = 'aggregate_only_no_carriers'
    manifest.carrier_loading_status = 'unavailable_not_loaded'
    try {
      installFixture({ emptyRunLedger: true })
      await preflightY1AcceptedSources()
      expect((await getY1SourceSnapshot('hgsvc_hprc', 'chr2'))?.carriers_available).toBe(false)
    } finally {
      delete manifest.primary_load_mode
      delete manifest.carrier_loading_status
    }
  })

  test('accepts a failed attempt followed by one exact accepted attempt', async () => {
    installFixture({ failedThenAccepted: true })
    await expect(preflightY1AcceptedSources()).resolves.toBeUndefined()
  })

  test.each(['lr_y1_summaries', 'lr_y1_alleles', 'lr_y1_frequencies', 'lr_y1_carriers'] as const)(
    'rejects equal-count %s substitution by a failed attempt',
    async (physicalAttemptSubstitution) => {
      installFixture({ failedThenAccepted: true, physicalAttemptSubstitution })
      await expect(preflightY1AcceptedSources()).rejects.toThrow(
        'failed, unrecognized, or unqualified task/attempt rows'
      )
    }
  )

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

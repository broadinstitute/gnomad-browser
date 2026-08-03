import { jest } from '@jest/globals'

const mockQuery = jest.fn()

jest.mock('../clickhouse', () => ({
  isY1PilotEnabled: true,
  y1ClickhouseConfig: { url: 'http://127.0.0.1:9999', database: 'gnomad_lr_y1_test_fixture' },
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))

import {
  ACCEPTED_Y1_RUN_STATE,
  getY1SourceSnapshot,
  preflightY1AcceptedSources,
  resetY1SourceSnapshotForTests,
  resolveY1Cohort,
} from './long_read_y1_provenance'

type Cohort = 'hgsvc_hprc' | 'aou'

const requiredSchema: Record<string, string[]> = {
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
  ],
}

const metadataSchema = {
  lr_y1_metadata_runs: [
    'metadata_run_id',
    'revision',
    'state',
    'release',
    'cohort',
    'reference_genome',
    'source_manifest_id',
    'source_manifest_sha256',
    'expected_roster_rows',
    'observed_roster_rows',
    'output_rows',
  ],
  lr_y1_sample_metadata: [
    'metadata_run_id',
    'release',
    'cohort',
    'reference_genome',
    'sample_id',
    'source_manifest_id',
    'source_manifest_sha256',
    'subpopulation',
    'superpopulation',
  ],
}

const run = (cohort: Cohort, overrides: Record<string, unknown> = {}) => ({
  run_id: `${cohort}-accepted`,
  release: 'y1',
  cohort,
  reference_genome: 'GRCh38',
  chrom: 'chr22',
  load_scope: 'full_chromosome',
  interval_start: 0,
  interval_end: 0,
  state: ACCEPTED_Y1_RUN_STATE,
  summary_rows: 11,
  allele_rows: 13,
  frequency_rows: 17,
  carrier_rows: cohort === 'hgsvc_hprc' ? 19 : 0,
  expected_tasks: 1,
  latest_revision_rows: 1,
  ...overrides,
})

type PhysicalCounts = { total: number; exact: number; unique_samples?: number }

const installFixture = ({
  runs,
  schema = requiredSchema,
  canonical,
  carriers,
  metadataRuns = [],
  metadataCounts,
}: {
  runs: any[]
  schema?: Record<string, string[]>
  canonical?: Record<string, Partial<Record<string, PhysicalCounts>>>
  carriers?: Record<string, PhysicalCounts>
  metadataRuns?: any[]
  metadataCounts?: PhysicalCounts
}) => {
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
    if (query.includes("SELECT 'lr_y1_summaries' AS table")) {
      const selected = runs.find((row) => row.run_id === query_params.runId)
      const defaults: Record<string, number> = {
        lr_y1_summaries: Number(selected.summary_rows),
        lr_y1_alleles: Number(selected.allele_rows),
        lr_y1_frequencies: Number(selected.frequency_rows),
      }
      return Promise.resolve({
        json: async () =>
          Object.entries(defaults).map(([table, expected]) => ({
            table,
            total: canonical?.[selected.run_id]?.[table]?.total ?? expected,
            exact: canonical?.[selected.run_id]?.[table]?.exact ?? expected,
          })),
      })
    }
    if (query.includes('FROM lr_y1_carriers') && query.includes('countIf(release')) {
      const selected = runs.find((row) => row.run_id === query_params.runId)
      const expected = Number(selected.carrier_rows)
      return Promise.resolve({
        json: async () => [carriers?.[selected.run_id] ?? { total: expected, exact: expected }],
      })
    }
    if (query.includes('FROM lr_y1_metadata_runs AS ledger')) {
      return Promise.resolve({ json: async () => metadataRuns })
    }
    if (query.includes('FROM lr_y1_sample_metadata')) {
      return Promise.resolve({
        json: async () => [metadataCounts ?? { total: 0, exact: 0, unique_samples: 0 }],
      })
    }
    throw new Error(`Unexpected query: ${query}`)
  })
}

describe('Y1 accepted run discovery', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    resetY1SourceSnapshotForTests()
  })

  test.each([
    ['HGSVC/HPRC only', [run('hgsvc_hprc')], ['hgsvc_hprc']],
    ['AoU only', [run('aou')], ['aou']],
    ['both cohorts', [run('hgsvc_hprc'), run('aou')], ['hgsvc_hprc', 'aou']],
  ])('discovers %s only after exact physical reconciliation', async (_label, runs, expected) => {
    installFixture({ runs })
    await preflightY1AcceptedSources()

    const available: string[] = []
    for (const cohort of ['hgsvc_hprc', 'aou'] as const) {
      const source = await getY1SourceSnapshot(cohort)
      if (source) {
        available.push(cohort)
        expect(source.database).toBe('gnomad_lr_y1_test_fixture')
        expect(source.run_id).toBe(`${cohort}-accepted`)
        expect(source.state).toBe('accepted_frozen')
        expect(source.metadata_run_id).toBeNull()
      }
    }
    expect(available).toEqual(expected)

    const sql = mockQuery.mock.calls.map(([call]: any[]) => call.query).join('\n')
    expect(sql).not.toMatch(/lr_y1_active_partitions|lr_y1_active_metadata|published/i)
    expect(sql).toContain('count() OVER (PARTITION BY ledger.run_id)')
  })

  test.each([
    ['HGSVC-only', [run('hgsvc_hprc')], undefined, 'hgsvc_hprc'],
    ['AoU-only', [run('aou')], undefined, 'aou'],
    ['both cohorts', [run('hgsvc_hprc'), run('aou')], undefined, 'hgsvc_hprc'],
    ['explicit AoU with HGSVC-only', [run('hgsvc_hprc')], 'aou', 'aou'],
  ])(
    'resolves navigation cohort for %s without cross-cohort fallback',
    async (_label, runs, requested, expected) => {
      installFixture({ runs: runs as any[] })
      await preflightY1AcceptedSources()
      expect(await resolveY1Cohort(requested as Cohort | undefined)).toBe(expected)
    }
  )

  test('rejects duplicate rows at an equal maximum revision', async () => {
    installFixture({
      runs: [
        run('aou', { latest_revision_rows: 2 }),
        run('aou', { latest_revision_rows: 2, state: 'failed' }),
      ],
    })
    await expect(preflightY1AcceptedSources()).rejects.toThrow(
      'duplicate rows at its maximum revision'
    )
  })

  test('fails when one cohort has multiple accepted runs', async () => {
    installFixture({ runs: [run('aou'), run('aou', { run_id: 'aou-other' })] })
    await expect(preflightY1AcceptedSources()).rejects.toThrow('multiple terminal accepted_frozen')
  })

  test('fails when there are no cohort runs', async () => {
    installFixture({ runs: [] })
    await expect(preflightY1AcceptedSources()).rejects.toThrow('zero usable cohorts')
  })

  test.each(['loading', 'failed', 'malformed_state'])('fails a %s-only cohort', async (state) => {
    installFixture({ runs: [run('hgsvc_hprc', { state })] })
    await expect(preflightY1AcceptedSources()).rejects.toThrow('no terminal accepted_frozen run')
  })

  test('rejects conflicting accepted cohort scope', async () => {
    installFixture({ runs: [run('hgsvc_hprc'), run('aou', { chrom: 'chr1' })] })
    await expect(preflightY1AcceptedSources()).rejects.toThrow(
      'conflicting release/reference/chrom/scope'
    )
  })

  test('rejects an accepted interval run', async () => {
    installFixture({
      runs: [
        run('aou', {
          load_scope: 'interval',
          interval_start: 100,
          interval_end: 200,
        }),
      ],
    })
    await expect(preflightY1AcceptedSources()).rejects.toThrow(
      'must have full-chromosome provenance'
    )
  })

  test('fails malformed primary schema', async () => {
    const schema = {
      ...requiredSchema,
      lr_y1_alleles: requiredSchema.lr_y1_alleles.filter((x) => x !== 'alt_index'),
    }
    installFixture({ runs: [run('aou')], schema })
    await expect(preflightY1AcceptedSources()).rejects.toThrow(
      'lr_y1_alleles is missing required columns: alt_index'
    )
  })

  test('rejects partial exact canonical counts', async () => {
    const selected = run('aou')
    installFixture({
      runs: [selected],
      canonical: { [selected.run_id]: { lr_y1_alleles: { total: 12, exact: 12 } } },
    })
    await expect(preflightY1AcceptedSources()).rejects.toThrow(
      'lr_y1_alleles count/identity mismatch'
    )
  })

  test('rejects canonical rows with the run ID but wrong physical identity', async () => {
    const selected = run('aou')
    installFixture({
      runs: [selected],
      canonical: { [selected.run_id]: { lr_y1_summaries: { total: 11, exact: 10 } } },
    })
    await expect(preflightY1AcceptedSources()).rejects.toThrow(
      'lr_y1_summaries count/identity mismatch'
    )
  })

  test('requires HGSVC carrier counts to exactly match the ledger', async () => {
    const selected = run('hgsvc_hprc')
    installFixture({
      runs: [selected],
      carriers: { [selected.run_id]: { total: 18, exact: 18 } },
    })
    await expect(preflightY1AcceptedSources()).rejects.toThrow('carrier count/identity mismatch')
  })

  test('rejects carriers for an AoU run even when physically mislabeled HGSVC', async () => {
    const selected = run('aou')
    installFixture({
      runs: [selected],
      carriers: { [selected.run_id]: { total: 1, exact: 0 } },
    })
    await expect(preflightY1AcceptedSources()).rejects.toThrow(
      'must not have physical carrier rows'
    )
  })

  test('treats mismatched optional metadata as unavailable', async () => {
    const selected = run('hgsvc_hprc')
    installFixture({
      runs: [selected],
      schema: { ...requiredSchema, ...metadataSchema },
      metadataRuns: [
        {
          metadata_run_id: 'metadata-accepted',
          state: 'accepted',
          release: 'y1',
          cohort: 'hgsvc_hprc',
          reference_genome: 'GRCh38',
          source_manifest_id: 'manifest',
          source_manifest_sha256: 'a'.repeat(64),
          expected_roster_rows: 2,
          observed_roster_rows: 2,
          output_rows: 2,
          latest_revision_rows: 1,
        },
      ],
      metadataCounts: { total: 2, exact: 1, unique_samples: 2 },
    })
    await preflightY1AcceptedSources()
    expect((await getY1SourceSnapshot('hgsvc_hprc'))?.metadata_run_id).toBeNull()
  })

  test('accepts only uniquely reconciled optional metadata', async () => {
    const selected = run('hgsvc_hprc')
    installFixture({
      runs: [selected],
      schema: { ...requiredSchema, ...metadataSchema },
      metadataRuns: [
        {
          metadata_run_id: 'metadata-accepted',
          state: 'accepted',
          release: 'y1',
          cohort: 'hgsvc_hprc',
          reference_genome: 'GRCh38',
          source_manifest_id: 'manifest',
          source_manifest_sha256: 'a'.repeat(64),
          expected_roster_rows: 2,
          observed_roster_rows: 2,
          output_rows: 2,
          latest_revision_rows: 1,
        },
      ],
      metadataCounts: { total: 2, exact: 2, unique_samples: 2 },
    })
    await preflightY1AcceptedSources()
    expect((await getY1SourceSnapshot('hgsvc_hprc'))?.metadata_run_id).toBe('metadata-accepted')
  })
})

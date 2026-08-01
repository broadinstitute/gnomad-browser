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
} from './long_read_y1_provenance'

type Cohort = 'hgsvc_hprc' | 'aou'

const requiredSchema: Record<string, string[]> = {
  lr_y1_load_runs: ['run_id', 'revision', 'release', 'cohort', 'reference_genome', 'chrom', 'load_scope', 'state'],
  lr_y1_summaries: ['run_id', 'release', 'cohort', 'reference_genome', 'chrom'],
  lr_y1_alleles: [
    'run_id', 'release', 'cohort', 'reference_genome', 'chrom', 'position',
    'reference_end', 'xpos', 'source_variant_id', 'alt_index', 'ref_allele', 'alt',
    'allele_type', 'filters', 'ac', 'an', 'af', 'allele_length', 'rsids',
    'cadd_phred', 'phylop', 'major_consequence', 'short_read_match_id',
    'short_read_match_type', 'short_read_match_source',
  ],
  lr_y1_frequencies: [
    'run_id', 'release', 'cohort', 'reference_genome', 'chrom', 'position',
    'source_variant_id', 'alt_index', 'division', 'ac', 'an', 'af', 'values_available',
  ],
  lr_y1_carriers: [
    'run_id', 'release', 'cohort', 'reference_genome', 'chrom', 'position',
    'source_variant_id', 'alt_index', 'alt', 'sample_id', 'genotype_position',
    'genotype_fields_json', 'gt_phased', 'gt_alleles',
  ],
}

const run = (cohort: Cohort, overrides: Record<string, unknown> = {}) => ({
  run_id: `${cohort}-accepted`,
  release: 'y1',
  cohort,
  reference_genome: 'GRCh38',
  chrom: 'chr22',
  load_scope: 'full_chromosome',
  state: ACCEPTED_Y1_RUN_STATE,
  ...overrides,
})

const installFixture = ({
  runs,
  schema = requiredSchema,
  canonicalRows = 1,
  carrierRows,
}: {
  runs: any[]
  schema?: Record<string, string[]>
  canonicalRows?: number
  carrierRows?: any[]
}) => {
  mockQuery.mockImplementation(({ query }: any) => {
    if (query.includes('FROM system.columns')) {
      return Promise.resolve({
        json: async () => Object.entries(schema).flatMap(([table, columns]) =>
          columns.map((name) => ({ table, name }))
        ),
      })
    }
    if (query.includes('FROM lr_y1_load_runs')) {
      return Promise.resolve({ json: async () => runs })
    }
    if (query.includes("SELECT 'lr_y1_summaries' AS table")) {
      return Promise.resolve({
        json: async () => ['lr_y1_summaries', 'lr_y1_alleles', 'lr_y1_frequencies']
          .map((table) => ({ table, n: canonicalRows })),
      })
    }
    if (query.includes('FROM lr_y1_carriers') && query.includes('GROUP BY run_id, cohort')) {
      const defaultRows = runs
        .filter((row) => row.cohort === 'hgsvc_hprc' && row.state === ACCEPTED_Y1_RUN_STATE)
        .map((row) => ({ run_id: row.run_id, cohort: row.cohort, n: 5 }))
      return Promise.resolve({ json: async () => carrierRows ?? defaultRows })
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
  ])('discovers %s from the configured database', async (_label, runs, expected) => {
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

  test('fails conflicting accepted cohort scope', async () => {
    installFixture({ runs: [run('hgsvc_hprc'), run('aou', { chrom: 'chr1' })] })
    await expect(preflightY1AcceptedSources()).rejects.toThrow('conflicting release/reference/chrom/scope')
  })

  test('fails malformed primary schema', async () => {
    const schema = { ...requiredSchema, lr_y1_alleles: requiredSchema.lr_y1_alleles.filter((x) => x !== 'alt_index') }
    installFixture({ runs: [run('aou')], schema })
    await expect(preflightY1AcceptedSources()).rejects.toThrow('lr_y1_alleles is missing required columns: alt_index')
  })

  test('fails accepted runs without canonical rows', async () => {
    installFixture({ runs: [run('aou')], canonicalRows: 0 })
    await expect(preflightY1AcceptedSources()).rejects.toThrow('has no canonical rows')
  })

  test('requires HGSVC carriers and structurally rejects AoU carriers', async () => {
    installFixture({ runs: [run('hgsvc_hprc')], carrierRows: [] })
    await expect(preflightY1AcceptedSources()).rejects.toThrow('has no carrier rows')

    resetY1SourceSnapshotForTests()
    mockQuery.mockReset()
    installFixture({
      runs: [run('aou')],
      carrierRows: [{ run_id: 'aou-accepted', cohort: 'aou', n: 1 }],
    })
    await expect(preflightY1AcceptedSources()).rejects.toThrow('must not have carrier rows')
  })
})

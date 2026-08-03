import {
  DEFAULT_Y1_CLICKHOUSE_DATABASE,
  resolveY1AncillaryRoutes,
  resolveY1ClickHouseConfig,
  resolveY1ClickHouseConfigForTests,
  resolveY1PrimaryRunMap,
} from './y1_config'

describe('Y1 ClickHouse configuration', () => {
  test('preserves the current database and requires the explicit Y1 server URL by default', () => {
    expect(resolveY1ClickHouseConfig({ LR_Y1_CLICKHOUSE_URL: 'http://127.0.0.1:9134' })).toEqual({
      url: 'http://127.0.0.1:9134',
      database: DEFAULT_Y1_CLICKHOUSE_DATABASE,
    })
    expect(resolveY1PrimaryRunMap({})).toBeNull()
    expect(resolveY1AncillaryRoutes({})).toEqual([])
  })

  test('never inherits the generic URL and accepts only a safe Y1 database override', () => {
    expect(() => resolveY1ClickHouseConfig({
      CLICKHOUSE_URL: 'http://legacy.test:8123',
      LR_Y1_CLICKHOUSE_DATABASE: 'gnomad_lr_y1_safe',
    })).toThrow('requires an explicit LR_Y1_CLICKHOUSE_URL')

    expect(resolveY1ClickHouseConfig({
      LR_Y1_CLICKHOUSE_URL: 'http://y1.test:8126',
      CLICKHOUSE_URL: 'http://legacy.test:8123',
      LR_Y1_CLICKHOUSE_DATABASE: 'gnomad_lr_y1_scratch_demo_full_genome_20260803',
    })).toEqual({
      url: 'http://y1.test:8126',
      database: 'gnomad_lr_y1_scratch_demo_full_genome_20260803',
    })
    expect(() => resolveY1ClickHouseConfig({
      LR_Y1_CLICKHOUSE_URL: 'http://y1.test:8126',
      LR_Y1_CLICKHOUSE_DATABASE: 'default; DROP DATABASE default',
    })).toThrow('Unsafe LR Y1 ClickHouse database name')
  })

  test('parses exact multi-contig primary routing without cross-cohort fallback', () => {
    const routes = resolveY1PrimaryRunMap({
      LR_Y1_RUN_MAP: JSON.stringify({
        hgsvc_hprc: { chr1: 'hgsvc-chr1', '2': 'hgsvc-chr2' },
        aou: { chr1: 'aou-chr1' },
      }),
    })!
    expect(routes.get('hgsvc_hprc')).toEqual(new Map([
      ['chr1', 'hgsvc-chr1'], ['chr2', 'hgsvc-chr2'],
    ]))
    expect(routes.get('aou')).toEqual(new Map([['chr1', 'aou-chr1']]))
  })

  test('rejects malformed primary routing', () => {
    expect(() => resolveY1PrimaryRunMap({ LR_Y1_RUN_MAP: '{}' })).toThrow('zero routed runs')
    expect(() => resolveY1PrimaryRunMap({
      LR_Y1_RUN_MAP: JSON.stringify({ hgsvc_hprc: { chrM: 'run' } }),
    })).toThrow('noncanonical chromosome')
    expect(() => resolveY1PrimaryRunMap({
      LR_Y1_RUN_MAP: JSON.stringify({ unknown: { chr1: 'run' } }),
    })).toThrow('unknown cohorts')
  })

  test('parses isolated ancillary databases and forbids absent-source AoU methylation', () => {
    expect(resolveY1AncillaryRoutes({
      LR_Y1_ANCILLARY_ROUTES: JSON.stringify({
        coverage: {
          hgsvc_hprc: { database: 'gnomad_lr_y1_cov_hgsvc', run_id: 'cov-hgsvc' },
          aou: { database: 'gnomad_lr_y1_cov_aou', run_id: 'cov-aou' },
        },
        str_histogram: {
          aou: { database: 'gnomad_lr_y1_str_aou', run_id: 'str-aou' },
        },
      }),
    })).toEqual([
      { modality: 'coverage', cohort: 'hgsvc_hprc', database: 'gnomad_lr_y1_cov_hgsvc', run_id: 'cov-hgsvc' },
      { modality: 'coverage', cohort: 'aou', database: 'gnomad_lr_y1_cov_aou', run_id: 'cov-aou' },
      { modality: 'str_histogram', cohort: 'aou', database: 'gnomad_lr_y1_str_aou', run_id: 'str-aou' },
    ])
    expect(() => resolveY1AncillaryRoutes({
      LR_Y1_ANCILLARY_ROUTES: JSON.stringify({
        methylation: { aou: { database: 'gnomad_lr_y1_meth_aou', run_id: 'meth-aou' } },
      }),
    })).toThrow('AoU methylation cannot be configured')
  })

  test('allows complete test-only config injection without process environment', () => {
    expect(resolveY1ClickHouseConfigForTests({
      url: 'http://clickhouse.test:8123', database: 'gnomad_lr_y1_test_fixture',
    })).toEqual({ url: 'http://clickhouse.test:8123', database: 'gnomad_lr_y1_test_fixture' })
  })

  test('rejects unsafe test-only database overrides', () => {
    expect(() => resolveY1ClickHouseConfigForTests({
      url: 'http://clickhouse.test:8123', database: 'default',
    })).toThrow('Unsafe LR Y1 ClickHouse database name')
  })
})

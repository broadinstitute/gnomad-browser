import {
  DEFAULT_Y1_CLICKHOUSE_DATABASE,
  resolveY1AncillaryRoutes,
  resolveY1ClickHouseConfig,
  resolveY1ClickHouseConfigForTests,
  resolveY1ClickHouseRequestOptions,
  resolveY1PrimaryRunMap,
} from './y1_config'

describe('Y1 ClickHouse request timeout', () => {
  const url = 'http://y1.test:8126'

  test('defaults to 120s and accepts finite env overrides in milliseconds', () => {
    expect(resolveY1ClickHouseRequestOptions(url, {})).toEqual({
      url,
      request_timeout: 120_000,
    })
    for (const value of ['1', '30000', '150000', '180000']) {
      expect(
        resolveY1ClickHouseRequestOptions(url, { LR_Y1_CLICKHOUSE_REQUEST_TIMEOUT_MS: value })
          .request_timeout
      ).toBe(Number(value))
    }
  })

  test('supports launcher URL timeouts; env wins without losing other URL settings', () => {
    const configuredUrl = `${url}/?request_timeout=120000&application=my-lr-api`
    const fromUrl = resolveY1ClickHouseRequestOptions(configuredUrl, {})
    expect(fromUrl.request_timeout).toBe(120_000)
    expect(new URL(fromUrl.url).searchParams.has('request_timeout')).toBe(false)
    expect(new URL(fromUrl.url).searchParams.get('application')).toBe('my-lr-api')
    expect(
      resolveY1ClickHouseRequestOptions(configuredUrl, {
        LR_Y1_CLICKHOUSE_REQUEST_TIMEOUT_MS: '150000',
      })
    ).toEqual({ url: fromUrl.url, request_timeout: 150_000 })
  })

  test.each([
    '',
    ' ',
    '0',
    '-1',
    '1.5',
    'NaN',
    'Infinity',
    '1e5',
    '120000ms',
    '180001',
    '999999999999999999999',
  ])(
    'rejects invalid/unbounded timeout %j in env or URL, including overridden URL values',
    (value) => {
      expect(() =>
        resolveY1ClickHouseRequestOptions(url, { LR_Y1_CLICKHOUSE_REQUEST_TIMEOUT_MS: value })
      ).toThrow('LR_Y1_CLICKHOUSE_REQUEST_TIMEOUT_MS must be an integer')
      for (const env of [{}, { LR_Y1_CLICKHOUSE_REQUEST_TIMEOUT_MS: '120000' }]) {
        expect(() =>
          resolveY1ClickHouseRequestOptions(
            `${url}/?request_timeout=${encodeURIComponent(value)}`,
            env
          )
        ).toThrow('LR_Y1_CLICKHOUSE_URL request_timeout must be an integer')
      }
    }
  )

  test('rejects ambiguous duplicate URL timeouts', () => {
    expect(() =>
      resolveY1ClickHouseRequestOptions(`${url}/?request_timeout=120000&request_timeout=0`, {})
    ).toThrow('must not repeat request_timeout')
  })
})

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
    expect(() =>
      resolveY1ClickHouseConfig({
        CLICKHOUSE_URL: 'http://legacy.test:8123',
        LR_Y1_CLICKHOUSE_DATABASE: 'gnomad_lr_y1_safe',
      })
    ).toThrow('requires an explicit LR_Y1_CLICKHOUSE_URL')

    expect(
      resolveY1ClickHouseConfig({
        LR_Y1_CLICKHOUSE_URL: 'http://y1.test:8126',
        CLICKHOUSE_URL: 'http://legacy.test:8123',
        LR_Y1_CLICKHOUSE_DATABASE: 'gnomad_lr_y1_scratch_demo_full_genome_20260803',
      })
    ).toEqual({
      url: 'http://y1.test:8126',
      database: 'gnomad_lr_y1_scratch_demo_full_genome_20260803',
    })
    expect(() =>
      resolveY1ClickHouseConfig({
        LR_Y1_CLICKHOUSE_URL: 'http://y1.test:8126',
        LR_Y1_CLICKHOUSE_DATABASE: 'default; DROP DATABASE default',
      })
    ).toThrow('Unsafe LR Y1 ClickHouse database name')
  })

  test('parses exact multi-contig primary routing without cross-cohort fallback', () => {
    const routes = resolveY1PrimaryRunMap({
      LR_Y1_RUN_MAP: JSON.stringify({
        hgsvc_hprc: { chr1: 'hgsvc-chr1', '2': 'hgsvc-chr2' },
        aou: { chr1: 'aou-chr1' },
      }),
    })!
    expect(routes.get('hgsvc_hprc')).toEqual(
      new Map([
        ['chr1', 'hgsvc-chr1'],
        ['chr2', 'hgsvc-chr2'],
      ])
    )
    expect(routes.get('aou')).toEqual(new Map([['chr1', 'aou-chr1']]))
  })

  test('rejects malformed primary routing', () => {
    expect(() => resolveY1PrimaryRunMap({ LR_Y1_RUN_MAP: '{}' })).toThrow('zero routed runs')
    expect(() =>
      resolveY1PrimaryRunMap({
        LR_Y1_RUN_MAP: JSON.stringify({ hgsvc_hprc: { chrM: 'run' } }),
      })
    ).toThrow('noncanonical chromosome')
    expect(() =>
      resolveY1PrimaryRunMap({
        LR_Y1_RUN_MAP: JSON.stringify({ unknown: { chr1: 'run' } }),
      })
    ).toThrow('unknown cohorts')
  })

  test('requires a completion receipt path and forbids absent-source AoU methylation', () => {
    expect(() =>
      resolveY1AncillaryRoutes({
        LR_Y1_ANCILLARY_ROUTES: JSON.stringify({
          coverage: {
            hgsvc_hprc: { database: 'gnomad_lr_y1_cov_hgsvc', run_id: 'cov-hgsvc' },
          },
        }),
      })
    ).toThrow('requires receipt_path')
    expect(() =>
      resolveY1AncillaryRoutes({
        LR_Y1_ANCILLARY_ROUTES: JSON.stringify({
          methylation: { aou: { database: 'gnomad_lr_y1_meth_aou', run_id: 'meth-aou' } },
        }),
      })
    ).toThrow('AoU methylation cannot be configured')
  })

  test('allows complete test-only config injection without process environment', () => {
    expect(
      resolveY1ClickHouseConfigForTests({
        url: 'http://clickhouse.test:8123',
        database: 'gnomad_lr_y1_test_fixture',
      })
    ).toEqual({ url: 'http://clickhouse.test:8123', database: 'gnomad_lr_y1_test_fixture' })
  })

  test('rejects unsafe test-only database overrides', () => {
    expect(() =>
      resolveY1ClickHouseConfigForTests({
        url: 'http://clickhouse.test:8123',
        database: 'default',
      })
    ).toThrow('Unsafe LR Y1 ClickHouse database name')
  })
})

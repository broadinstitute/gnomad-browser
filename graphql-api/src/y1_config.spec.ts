import {
  DEFAULT_Y1_CLICKHOUSE_DATABASE,
  resolveY1ClickHouseConfig,
  resolveY1ClickHouseConfigForTests,
} from './y1_config'

describe('Y1 ClickHouse configuration', () => {
  test('uses the one fixed disposable database and explicit Y1 server URL', () => {
    expect(
      resolveY1ClickHouseConfig({
        LR_Y1_CLICKHOUSE_URL: 'http://127.0.0.1:9134',
      })
    ).toEqual({
      url: 'http://127.0.0.1:9134',
      database: DEFAULT_Y1_CLICKHOUSE_DATABASE,
    })
  })

  test('never inherits the generic URL or a database environment override', () => {
    expect(() =>
      resolveY1ClickHouseConfig({
        CLICKHOUSE_URL: 'http://legacy.test:8123',
        LR_Y1_CLICKHOUSE_DATABASE: 'gnomad_lr_y1_wrong_database',
      })
    ).toThrow('requires an explicit LR_Y1_CLICKHOUSE_URL')

    expect(
      resolveY1ClickHouseConfig({
        LR_Y1_CLICKHOUSE_URL: 'http://y1.test:8126',
        CLICKHOUSE_URL: 'http://legacy.test:8123',
        LR_Y1_CLICKHOUSE_DATABASE: 'gnomad_lr_y1_wrong_database',
      })
    ).toEqual({
      url: 'http://y1.test:8126',
      database: DEFAULT_Y1_CLICKHOUSE_DATABASE,
    })
  })

  test('allows complete test-only config injection without process environment', () => {
    expect(
      resolveY1ClickHouseConfigForTests({
        url: 'http://clickhouse.test:8123',
        database: 'gnomad_lr_y1_test_fixture',
      })
    ).toEqual({
      url: 'http://clickhouse.test:8123',
      database: 'gnomad_lr_y1_test_fixture',
    })
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

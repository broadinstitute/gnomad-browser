import {
  DEFAULT_Y1_CLICKHOUSE_DATABASE,
  resolveY1ClickHouseConfig,
} from './y1_config'

describe('Y1 ClickHouse configuration', () => {
  test('uses the one fixed disposable database and the selected server URL', () => {
    expect(resolveY1ClickHouseConfig({
      LR_Y1_CLICKHOUSE_URL: 'http://127.0.0.1:9134',
    })).toEqual({
      url: 'http://127.0.0.1:9134',
      database: DEFAULT_Y1_CLICKHOUSE_DATABASE,
    })
  })

  test('allows an explicit database override for tests', () => {
    expect(resolveY1ClickHouseConfig({
      CLICKHOUSE_URL: 'http://clickhouse.test:8123',
      LR_Y1_CLICKHOUSE_DATABASE: 'gnomad_lr_y1_test_fixture',
    })).toEqual({
      url: 'http://clickhouse.test:8123',
      database: 'gnomad_lr_y1_test_fixture',
    })
  })

  test('rejects unsafe database overrides', () => {
    expect(() => resolveY1ClickHouseConfig({
      LR_Y1_CLICKHOUSE_DATABASE: 'default',
    })).toThrow('Unsafe LR Y1 ClickHouse database name')
  })
})

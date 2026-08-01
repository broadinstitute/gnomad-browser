export const DEFAULT_Y1_CLICKHOUSE_DATABASE = 'gnomad_lr_y1_scratch_v5_current'

export type Y1ClickHouseConfig = {
  url: string
  database: string
}

export const resolveY1ClickHouseConfig = (
  env: NodeJS.ProcessEnv = process.env
): Y1ClickHouseConfig => {
  const url = env.LR_Y1_CLICKHOUSE_URL || env.CLICKHOUSE_URL || 'http://127.0.0.1:8123'
  const database = env.LR_Y1_CLICKHOUSE_DATABASE || DEFAULT_Y1_CLICKHOUSE_DATABASE
  if (!/^gnomad_lr_y1_[a-z0-9_]+$/.test(database)) {
    throw new Error(`Unsafe LR Y1 ClickHouse database name: ${database}`)
  }
  return { url, database }
}

export const DEFAULT_Y1_CLICKHOUSE_DATABASE = 'gnomad_lr_y1_scratch_v5_current'

export type Y1ClickHouseConfig = {
  url: string
  database: string
}

const requireExplicitUrl = (url: string | undefined) => {
  const selected = (url || '').trim()
  if (!selected) {
    throw new Error('LR Y1 mode requires an explicit LR_Y1_CLICKHOUSE_URL')
  }
  return selected
}

// Runtime configuration deliberately ignores CLICKHOUSE_URL and every database
// environment variable. The launcher (or an advanced operator) must name the Y1
// server explicitly, while the disposable database identity is fixed in code.
export const resolveY1ClickHouseConfig = (
  env: NodeJS.ProcessEnv = process.env
): Y1ClickHouseConfig => ({
  url: requireExplicitUrl(env.LR_Y1_CLICKHOUSE_URL),
  database: DEFAULT_Y1_CLICKHOUSE_DATABASE,
})

// Fixtures that need a different database must inject a complete config rather
// than inheriting process environment. Production startup never calls this.
export const resolveY1ClickHouseConfigForTests = (
  config: Y1ClickHouseConfig
): Y1ClickHouseConfig => {
  const url = requireExplicitUrl(config.url)
  if (!/^gnomad_lr_y1_[a-z0-9_]+$/.test(config.database)) {
    throw new Error(`Unsafe LR Y1 ClickHouse database name: ${config.database}`)
  }
  return { url, database: config.database }
}

import { createClient } from '@clickhouse/client'

export const clickhouseClient = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://127.0.0.1:8123',
  clickhouse_settings: { readonly: '1' },
})

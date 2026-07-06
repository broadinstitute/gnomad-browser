import { createClient } from '@clickhouse/client'

export const clickhouseClient = createClient({
  // Default to 127.0.0.1 rather than localhost: on macOS `localhost` resolves to
  // ::1 (IPv6) first, and the ClickHouse container only listens on IPv4.
  url: process.env.CLICKHOUSE_URL || 'http://127.0.0.1:8123',
  clickhouse_settings: { readonly: '1' },
  // Recycle idle keep-alive sockets aggressively. The client pools keep-alive
  // sockets, so if the ClickHouse server is restarted while the API stays up,
  // any pooled socket that gets reused points at a dead connection and every
  // ClickHouse-backed query (lr_variants, lr_coverage) throws until the pool
  // drains. Keeping the idle TTL well below the server keep-alive timeout means
  // sockets idle longer than this are discarded and a fresh connection is made,
  // so a server restart never wedges the API for more than the TTL window.
  keep_alive: {
    enabled: true,
    idle_socket_ttl: 2000,
  },
})

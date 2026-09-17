import type { Y1AncillaryRoute } from './y1_config'
import {
  SOURCE_PHASED_METHYLATION_DATABASE,
  type SourcePhasedMethylationRoute,
} from './source_phased_methylation_config'

jest.mock('@clickhouse/client', () => ({
  createClient: jest.fn((options) => ({ options })),
}))

const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = { ...originalEnv }
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('LR_') || key === 'CLICKHOUSE_URL') delete process.env[key]
  }
  process.env.LR_Y1_ENABLED = 'true'
  process.env.LR_Y1_CLICKHOUSE_URL = 'http://y1.test:8126'
  process.env.CLICKHOUSE_URL = 'http://legacy.test:8123'
})

afterEach(() => {
  process.env = originalEnv
})

// Isolate module initialization, while retaining the real configuration and
// admission-file resolvers. No sockets or database requests are made.
const loadClients = () => {
  let clients: typeof import('./clickhouse')
  jest.isolateModules(() => {
    clients = require('./clickhouse')
  })
  return clients!
}

const ancillaryRoute = { database: 'gnomad_lr_y1_test_coverage' } as Y1AncillaryRoute
const phasedRoute = { database: SOURCE_PHASED_METHYLATION_DATABASE } as SourcePhasedMethylationRoute

const expectTimeouts = (clients: ReturnType<typeof loadClients>, timeout: number) => {
  const ancillary = clients.getY1AncillaryClickhouseClient(ancillaryRoute)
  const phased = clients.getSourcePhasedMethylationClickhouseClient(phasedRoute)
  expect(clients.getY1AncillaryClickhouseClient(ancillaryRoute)).toBe(ancillary)
  expect(clients.getSourcePhasedMethylationClickhouseClient(phasedRoute)).toBe(phased)

  for (const client of [clients.y1ClickhouseClient, ancillary, phased]) {
    expect(client).toEqual({
      options: expect.objectContaining({
        url: expect.stringMatching(/^http:\/\/y1.test:8126\/?$/),
        request_timeout: timeout,
        clickhouse_settings: { readonly: '1' },
        keep_alive: { enabled: true, idle_socket_ttl: 2000 },
      }),
    })
  }
  // Unrelated generic/SR and retained evaluation clients retain SDK defaults.
  for (const client of [
    clients.clickhouseClient,
    clients.phasedMethylationEvaluationClickhouseClient,
  ]) {
    expect((client as any).options).not.toHaveProperty('request_timeout')
    expect((client as any).options.url).toBe('http://legacy.test:8123')
  }
  expect((ancillary as any).options.database).toBe(ancillaryRoute.database)
  expect((phased as any).options.database).toBe(phasedRoute.database)
}

test('all Y1 clients receive the finite 120s default without widening unrelated clients', () => {
  expectTimeouts(loadClients(), 120_000)
})

test('validated env override reaches primary and lazy clients, despite SDK URL precedence', () => {
  process.env.LR_Y1_CLICKHOUSE_URL += '/?request_timeout=120000'
  process.env.LR_Y1_CLICKHOUSE_REQUEST_TIMEOUT_MS = '150000'
  expectTimeouts(loadClients(), 150_000)
})

test('existing launcher URL timeout reaches primary and lazy clients', () => {
  process.env.LR_Y1_CLICKHOUSE_URL += '/?request_timeout=90000'
  expectTimeouts(loadClients(), 90_000)
})

test('invalid timeout fails module initialization rather than silently falling back', () => {
  process.env.LR_Y1_CLICKHOUSE_REQUEST_TIMEOUT_MS = '0'
  expect(loadClients).toThrow('LR_Y1_CLICKHOUSE_REQUEST_TIMEOUT_MS must be an integer')
})

test('disabled Y1 ignores its timeout env and keeps the non-routable endpoint', () => {
  process.env.LR_Y1_ENABLED = 'false'
  process.env.LR_Y1_CLICKHOUSE_REQUEST_TIMEOUT_MS = '0'
  const clients = loadClients()
  expect((clients.y1ClickhouseClient as any).options.url).toBe('http://y1-disabled.invalid')
})

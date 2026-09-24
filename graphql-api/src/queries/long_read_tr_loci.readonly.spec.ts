import http from 'node:http'
import type { AddressInfo } from 'node:net'

import { createClient } from '@clickhouse/client'
import { jest } from '@jest/globals'

const mockQuery = jest.fn<(...args: any[]) => Promise<any>>()
jest.mock('../clickhouse', () => ({
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))
jest.mock('../cache', () => ({ withCache: (fn: any) => fn }))

// eslint-disable-next-line import/first
import { fetchLongReadTrLocus } from './long_read_tr_loci'
// eslint-disable-next-line import/first
import { y1AcceptedTaskAttemptDigest } from './long_read_y1_provenance'

const accepted = [{ task_id: 'task-1', attempt_id: 'attempt-1' }]
const fetchLocus = () => fetchLongReadTrLocus({
  id: '6-31422805-31422814-AG',
  cohort: 'aou',
  first: 600,
  source: {
    database: 'test', release: 'y1', cohort: 'aou', reference_genome: 'GRCh38',
    chrom: 'chr6', load_scope: 'full_chromosome', run_id: 'run-aou',
    state: 'accepted_frozen', metadata_run_id: null, carriers_available: false,
    accepted_task_attempts: accepted,
    accepted_task_attempt_digest: y1AcceptedTaskAttemptDigest('run-aou', accepted),
    primary_manifest_sha256: null,
  },
})

describe('TR readonly query compatibility', () => {
  const original = process.env.LR_Y1_TR_READONLY_QUERY_COMPAT
  const originalTimeout = process.env.LR_Y1_TR_READONLY_QUERY_TIMEOUT_MS
  beforeEach(() => {
    jest.useFakeTimers()
    mockQuery.mockReset()
    process.env.LR_Y1_TR_READONLY_QUERY_COMPAT = 'true'
    delete process.env.LR_Y1_TR_READONLY_QUERY_TIMEOUT_MS
  })
  afterEach(() => {
    if (original === undefined) delete process.env.LR_Y1_TR_READONLY_QUERY_COMPAT
    else process.env.LR_Y1_TR_READONLY_QUERY_COMPAT = original
    if (originalTimeout === undefined) delete process.env.LR_Y1_TR_READONLY_QUERY_TIMEOUT_MS
    else process.env.LR_Y1_TR_READONLY_QUERY_TIMEOUT_MS = originalTimeout
    jest.useRealTimers()
  })

  test('omits settings only on explicit opt-in, preserving exact bounded SQL and parameters', async () => {
    mockQuery.mockImplementation(async () => ({ json: async () => [] }))
    await expect(fetchLocus()).resolves.toBeNull()
    const compatible = mockQuery.mock.calls[0][0]
    expect(compatible).not.toHaveProperty('clickhouse_settings')
    expect(compatible.abort_signal).toBeInstanceOf(AbortSignal)
    expect(compatible.query_params).toMatchObject({
      acceptedTaskIds: ['task-1'], acceptedAttemptIds: ['attempt-1'], limit: 601,
    })
    expect(jest.getTimerCount()).toBe(0)
    for (const value of [undefined, 'false', '1']) {
      if (value === undefined) delete process.env.LR_Y1_TR_READONLY_QUERY_COMPAT
      else process.env.LR_Y1_TR_READONLY_QUERY_COMPAT = value
      await fetchLocus()
      const normal = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0]
      expect(normal).toEqual({
        query: compatible.query, query_params: compatible.query_params,
        format: 'JSONEachRow', clickhouse_settings: { max_execution_time: 5 },
      })
    }
  })

  test('aborts a pending request at five seconds without retry or partial success', async () => {
    mockQuery.mockImplementation(() => new Promise(() => {}))
    const pending = fetchLocus()
    const failure = expect(pending).rejects.toThrow('TR_LOCUS_QUERY_TIMEOUT')
    await jest.advanceTimersByTimeAsync(4999)
    expect(mockQuery.mock.calls[0][0].abort_signal.aborted).toBe(false)
    await jest.advanceTimersByTimeAsync(1)
    await failure
    expect(mockQuery.mock.calls[0][0].abort_signal.aborted).toBe(true)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  test('supports an explicitly bounded local deadline override', async () => {
    process.env.LR_Y1_TR_READONLY_QUERY_TIMEOUT_MS = '15000'
    mockQuery.mockImplementation(() => new Promise(() => {}))
    const failure = expect(fetchLocus()).rejects.toThrow('TR_LOCUS_QUERY_TIMEOUT')
    await jest.advanceTimersByTimeAsync(14999)
    expect(mockQuery.mock.calls[0][0].abort_signal.aborted).toBe(false)
    await jest.advanceTimersByTimeAsync(1)
    await failure
    expect(mockQuery.mock.calls[0][0].abort_signal.aborted).toBe(true)
  })

  test.each(['0', '-1', 'NaN', 'Infinity', '1.5', '30001'])('rejects unsafe deadline %s before querying', async value => {
    process.env.LR_Y1_TR_READONLY_QUERY_TIMEOUT_MS = value
    await expect(fetchLocus()).rejects.toThrow('must be an integer from 1 to 30000')
    expect(mockQuery).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)
  })

  test('closes a stalled JSON result after headers and rejects at the same deadline', async () => {
    const close = jest.fn()
    mockQuery.mockResolvedValue({ json: () => new Promise(() => {}), close })
    const failure = expect(fetchLocus()).rejects.toThrow('TR_LOCUS_QUERY_TIMEOUT')
    await jest.advanceTimersByTimeAsync(5000)
    await failure
    expect(close).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  test('closes a late result rather than consuming it after timeout', async () => {
    let resolveQuery!: (value: any) => void
    mockQuery.mockImplementation(() => new Promise(resolve => { resolveQuery = resolve }))
    const failure = expect(fetchLocus()).rejects.toThrow('TR_LOCUS_QUERY_TIMEOUT')
    await jest.advanceTimersByTimeAsync(5000)
    await failure
    const close = jest.fn()
    const json = jest.fn()
    resolveQuery({ close, json })
    await Promise.resolve()
    expect(close).toHaveBeenCalledTimes(1)
    expect(json).not.toHaveBeenCalled()
  })

  test.each(['headers', 'body'])('installed client closes stalled %s transport at deadline', async stage => {
    jest.useRealTimers()
    let requestUrl = ''
    let disconnected = false
    const server = http.createServer((request, response) => {
      requestUrl = request.url || ''
      request.resume()
      response.on('close', () => { disconnected = true })
      if (stage === 'body') {
        response.writeHead(200, { 'Content-Type': 'application/x-ndjson' })
        response.write('{}\n')
      }
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const client = createClient({
      url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      clickhouse_settings: { readonly: '1' },
      request_timeout: 10000,
    })
    mockQuery.mockImplementation(options => client.query(options))
    try {
      const start = Date.now()
      await expect(fetchLocus()).rejects.toThrow('TR_LOCUS_QUERY_TIMEOUT')
      expect(Date.now() - start).toBeLessThan(8000)
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(disconnected).toBe(true)
      const params = new URL(requestUrl, 'http://localhost').searchParams
      expect(params.get('readonly')).toBe('1')
      expect(params.has('max_execution_time')).toBe(false)
      expect(mockQuery).toHaveBeenCalledTimes(1)
    } finally {
      await client.close()
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  }, 15000)

  test.each(['request', 'json'])('propagates %s errors and clears the deadline', async stage => {
    const error = new Error('original query failure')
    if (stage === 'request') mockQuery.mockRejectedValue(error)
    else mockQuery.mockResolvedValue({ json: async () => { throw error } })
    await expect(fetchLocus()).rejects.toBe(error)
    expect(jest.getTimerCount()).toBe(0)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

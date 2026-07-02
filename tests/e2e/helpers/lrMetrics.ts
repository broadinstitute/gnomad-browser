import type { Page, Request, TestInfo } from '@playwright/test'

export type ApiMetric = {
  /** GraphQL operationName from the POST body, or a fallback label. */
  operationName: string
  status: number
  /** Absolute request start (ms, Playwright timing origin). Internal. */
  startedAtMs: number
  /** Start of this request, relative to the earliest captured request. Set at report time. */
  startOffsetMs: number
  /**
   * Time to first byte: server processing incl. the DB/ES round-trip.
   * Best client-side proxy for "time to database" — not a DB-only span.
   * When the API emits a `Server-Timing` header, `dbMs` carries the true
   * server-reported DB span and this stays as the wire TTFB.
   */
  ttfbMs: number
  /** Time to fully receive the response payload (ms from request start). */
  totalMs: number
  /** Response size in KB (from content-length; 0 when not advertised). */
  sizeKB: number
  /** Server-reported DB duration from `Server-Timing`, if the API emits it. */
  dbMs?: number
}

const parseServerTiming = (header: string | undefined, name: string): number | undefined => {
  if (!header) return undefined
  // e.g. 'db;dur=42.1;desc="Elasticsearch", total;dur=98.7'
  const match = header.split(',').find((part) => part.trim().startsWith(`${name};`))
  const dur = match?.match(/dur=([\d.]+)/)?.[1]
  return dur ? Math.round(Number(dur)) : undefined
}

/**
 * Attach page-load API metrics collection to a Page. Call BEFORE `page.goto`.
 * Returns a live array that fills as GraphQL requests complete.
 *
 * Discriminates GraphQL requests by POST body (any request carrying a `query`),
 * not by URL — the browser posts to a relative `/api/` that may be proxied to an
 * absolute API origin. Metadata is stashed on `response` (status/headers), and
 * final timing is read on `requestfinished` (when `responseEnd` is populated).
 * Both handlers are synchronous, so nothing races test teardown.
 */
export function collectApiMetrics(page: Page): ApiMetric[] {
  const metrics: ApiMetric[] = []

  // Single handler on `requestfinished`: timing is final here (`responseEnd`
  // populated) and `postDataJSON()` is available. Using one event avoids keying
  // a Map by the Request across two events — the Request from `response.request()`
  // is not reliably reference-equal to the `requestfinished` argument.
  page.on('requestfinished', async (req: Request) => {
    if (req.method() !== 'POST') return
    let body: { query?: string; operationName?: string } | null = null
    try {
      body = req.postDataJSON()
    } catch {
      return
    }
    if (!body || typeof body.query !== 'string') return

    const timing = req.timing()
    let status = 0
    let headers: Record<string, string> = {}
    try {
      const response = await req.response()
      if (response) {
        status = response.status()
        headers = response.headers()
      }
    } catch {
      // response may be unavailable if the request was aborted
    }
    const contentLength = headers['content-length']
    const dbMs = parseServerTiming(headers['server-timing'], 'db')

    metrics.push({
      operationName: body.operationName ?? 'anonymous',
      status,
      startedAtMs: timing.startTime,
      startOffsetMs: 0, // normalized in reportApiMetrics
      ttfbMs: Math.round(timing.responseStart),
      totalMs: Math.round(timing.responseEnd),
      sizeKB: contentLength ? Math.round(Number(contentLength) / 1024) : 0,
      ...(dbMs !== undefined ? { dbMs } : {}),
    })
  })

  return metrics
}

/**
 * Print a metrics table to the console and attach a JSON artifact to the test
 * report. Sorted by start time so the load waterfall reads top-to-bottom.
 */
export async function reportApiMetrics(testInfo: TestInfo, metrics: ApiMetric[]): Promise<void> {
  const baseline = metrics.length ? Math.min(...metrics.map((m) => m.startedAtMs)) : 0
  const rows = metrics
    .map((m) => ({ ...m, startOffsetMs: Math.round(m.startedAtMs - baseline) }))
    .sort((a, b) => a.startOffsetMs - b.startOffsetMs)

  const lines = rows.map((m) => {
    const db = m.dbMs !== undefined ? `db=${m.dbMs}ms` : `db~(ttfb)`
    return (
      `${m.operationName.padEnd(30)} ` +
      `start=${String(m.startOffsetMs).padStart(5)}ms  ` +
      `ttfb=${String(m.ttfbMs).padStart(5)}ms  ` +
      `${db.padEnd(12)}  ` +
      `load=${String(m.totalMs).padStart(5)}ms  ` +
      `${String(m.sizeKB).padStart(5)}KB  [${m.status}]`
    )
  })

  // eslint-disable-next-line no-console
  console.log(
    `\n=== LR API metrics: ${testInfo.title} (${rows.length} GraphQL requests) ===\n` +
      `${lines.join('\n') || '  (no GraphQL requests captured)'}\n`
  )

  await testInfo.attach('lr-api-metrics.json', {
    body: JSON.stringify(rows, null, 2),
    contentType: 'application/json',
  })
}

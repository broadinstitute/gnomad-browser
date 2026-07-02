import compression from 'compression'
import cors from 'cors'
import express from 'express'
import onFinished from 'on-finished'
import onHeaders from 'on-headers'
import config from './config'
import { client as esClient } from './elasticsearch'
import { esTimingStore, EsTimingAccumulator } from './esTiming'
import graphQLApi from './graphql/graphql-api'
import logger from './logger'

import { loadWhitelist } from './whitelist'

import startEsStatsPolling from './esPoll'

const STATS_POLL_INTERVAL = 5000

process.on('uncaughtException', (error) => {
  logger.error(error)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  logger.error(error)
  process.exit(1)
})

const app = express()
app.use(compression())
// Expose Server-Timing so the browser can read our server-side timing header cross-origin.
app.use(cors({ exposedHeaders: ['Server-Timing'] }))

app.set('trust proxy', config.TRUST_PROXY)

// Health check endpoint for load balancer.
// GCE load balancers require a 200 response from the health check endpoint, so this must be
// registered before the HTTP=>HTTPS redirect middleware, which would return a 30x response.
app.get('/health/ready', (_request: any, response: any) => {
  response.send('ok')
})

// Log requests
// Add logging here to avoid logging health checks
app.use(function requestLogMiddleware(request: any, response: any, next: any) {
  request.startAt = process.hrtime()
  response.startAt = undefined
  onHeaders(response, () => {
    response.startAt = process.hrtime()
  })

  onFinished(response, () => {
    logger.info({
      httpRequest: {
        requestMethod: request.method,
        requestUrl: `${request.protocol}://${request.hostname}${
          request.originalUrl || request.url
        }`,
        status: response.statusCode,
        userAgent: request.headers['user-agent'],
        remoteIp: request.ip,
        referer: request.headers.referer || request.headers.referrer,
        latency:
          request.startAt && response.startAt
            ? `${(
                response.startAt[0] -
                request.startAt[0] +
                (response.startAt[1] - request.startAt[1]) * 1e-9
              ).toFixed(3)}s`
            : undefined,
        protocol: `HTTP/${request.httpVersionMajor}.${request.httpVersionMinor}`,
      },
      graphqlRequest: request.graphqlParams
        ? {
            graphqlQueryOperationName: request.graphqlParams.operationName,
            graphqlQueryString: request.graphqlParams.query,
            graphqlQueryVariables: request.graphqlParams.variables,
            graphqlQueryCost: request.graphqlQueryCost,
          }
        : undefined,
    })
  })

  next()
})

// Server-Timing: accumulate per-request Elasticsearch time (via AsyncLocalStorage,
// see esTiming.ts + elasticsearch.ts) and emit it as a Server-Timing response
// header. onHeaders runs the callback just before headers flush, when they are
// not yet sent, so setHeader is safe. This applies to both the REST and GraphQL
// routes registered below.
app.use(function serverTimingMiddleware(request: any, response: any, next: any) {
  const accumulator: EsTimingAccumulator = { esMs: 0, esCalls: 0 }
  response.locals.esTiming = accumulator
  const startedAt = performance.now()

  onHeaders(response, () => {
    // Guard against double-setting and against a value already being present.
    if (response.getHeader('Server-Timing')) {
      return
    }
    const totalMs = performance.now() - startedAt
    const parts = [
      `db;dur=${accumulator.esMs.toFixed(1)};desc="Elasticsearch"`,
      `total;dur=${totalMs.toFixed(1)}`,
    ]
    if (accumulator.esCalls > 0) {
      parts.push(`es_calls;desc="${accumulator.esCalls}"`)
    }
    response.setHeader('Server-Timing', parts.join(', '))
  })

  // Run the rest of the request inside the AsyncLocalStorage context so the ES
  // client wrapper can attribute its elapsed time to this request's accumulator.
  esTimingStore.run(accumulator, () => next())
})

loadWhitelist()

const context = { esClient }

// REST endpoint for haplotype groups — bypasses GraphQL overhead for large payloads
import {
  fetchDistinctHaplotypeVariants,
  fetchTrvCarrierAlts,
} from './queries/haplotype-queries'
import { buildVariantsAndCarrierMap, deriveAutoDefaults } from './queries/haplotype-grouping'

app.get('/api/lr/haplotype-groups', async (req: any, res: any) => {
  const t0 = performance.now()
  try {
    const chrom = (req.query.chrom || '').startsWith('chr')
      ? req.query.chrom
      : `chr${req.query.chrom}`
    const start = parseInt(req.query.start, 10)
    const stop = parseInt(req.query.stop, 10)

    if (!chrom || isNaN(start) || isNaN(stop)) {
      return res.status(400).json({ error: 'chrom, start, stop required' })
    }

    const [distinctVariants, trvCarriers] = await Promise.all([
      fetchDistinctHaplotypeVariants(chrom, start, stop),
      fetchTrvCarrierAlts(chrom, start, stop),
    ])

    const result = buildVariantsAndCarrierMap(
      distinctVariants as any,
      chrom,
      trvCarriers as any,
    )

    // Compute auto defaults server-side (Phase 4)
    const regionSize = stop - start
    const autoDefaults = deriveAutoDefaults(
      result.variants, result.carrier_variant_indices, regionSize, result.trv_alts
    )

    const ms = performance.now() - t0
    res.json({
      variants: result.soa_variants,
      carrier_variant_indices: result.carrier_variant_indices,
      trv_alts: result.trv_alts,
      auto_defaults: autoDefaults,
      _timing: { total_ms: Math.round(ms) },
    })
  } catch (e: any) {
    logger.error(`REST haplotype-groups error: ${e.message}`)
    res.status(500).json({ error: 'Internal error' })
  }
})

app.use('/api/', graphQLApi({ context }))

if (!process.env.NO_ES_STATS_POLL) {
  startEsStatsPolling(STATS_POLL_INTERVAL)
}

app.listen(config.PORT)

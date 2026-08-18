import cors from 'cors'
import { randomUUID } from 'crypto'
import express from 'express'
import onFinished from 'on-finished'
import { performance } from 'perf_hooks'
import config from './config'
import { client as esClient, closeClient as closeEsClient } from './elasticsearch'
import graphQLApi from './graphql/graphql-api'
import logger from './logger'
import { requestStore } from './request-context'
import { closeCache } from './cache'
import { loadWhitelist } from './whitelist'

// Extract the trace ID from W3C or GCP trace context.
const getGcpTraceId = (request: any) => {
  // Prefer W3C Trace Context.
  const traceParent = request.get('traceparent')

  if (traceParent) {
    const match = traceParent.match(
      /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i
    )

    if (match) {
      return match[1]
    }
  }

  // Fall back to Google's legacy trace context header.
  const cloudTrace = request.get('X-Cloud-Trace-Context')

  if (cloudTrace) {
    const match = cloudTrace.match(/^([\da-f]{32})(?:\/|$)/i)

    if (match) {
      return match[1]
    }
  }

  return null
}

const app = express()
app.use(cors())
app.use(express.json())

app.set('trust proxy', config.TRUST_PROXY)

// Health check endpoint for load balancer.
// GCE load balancers require a 200 response from the health check endpoint, so this must be
// registered before the HTTP=>HTTPS redirect middleware, which would return a 30x response.
app.get('/health/ready', (_req: any, res: any) => {
  res.send('ok')
})

app.use((req: any, res: any, next: any) => {
  const traceId = config.GCP_PROJECT
    ? getGcpTraceId(req)
    : null

  const store = {
    requestId: randomUUID(),
    startAt: performance.now(),
    startCpu: process.cpuUsage(),
    startHeapUsed: process.memoryUsage().heapUsed,
    trace: traceId
      ? `projects/${config.GCP_PROJECT}/traces/${traceId}`
      : null,
  }

  res.setHeader('x-request-id', store.requestId)
  requestStore.run(store, () => {
    logger.info({
      requestId: store.requestId,
      event: 'requestStart',
      httpRequest: {
        requestMethod: req.method,
        requestUrl: `${req.protocol}://${req.hostname}${req.originalUrl || req.url}`,
        userAgent: req.headers['user-agent'],
        remoteIp: req.ip,
        referer: req.headers.referer || req.headers.referrer,
        protocol: `HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
      },
      // graphql variables do not exist until the graphQL middleware runs.
      graphql: req.body
        ? {
            raw: {
              operationName: req.body.operationName ?? null,
              query: req.body.query ?? null,
              variables: req.body.variables ?? null,
            }
          }
        : null,
    })
    next()
  })
})

app.use((req: any, res: any, next: any) => {
  // NB: in the onFinished block, we potentially lose access to the async context. Save it here to be able to closure in the ctx variable for logging.
  const ctx = requestStore.getStore()
  onFinished(res, () => {
    if (!ctx) return

    requestStore.run(ctx, () => {
      // Process-wide resources consumed while this request was in flight.
      // Concurrent requests contribute to these values (both cpu/memory)!
      const memory = process.memoryUsage()
      const cpu = process.cpuUsage(ctx.startCpu)

      logger.info({
        requestId: ctx.requestId,
        event: 'requestEnd',
        latencyMs: performance.now() - ctx.startAt,
        cpuUserMicros: cpu.user,
        cpuSystemMicros: cpu.system,
        heapUsed: memory.heapUsed,
        heapDeltaBytes:  memory.heapUsed - ctx.startHeapUsed,
        httpRequest: {
          requestMethod: req.method,
          requestUrl: `${req.protocol}://${req.hostname}${req.originalUrl || req.url}`,
          userAgent: req.headers['user-agent'],
          remoteIp: req.ip,
          referer: req.headers.referer || req.headers.referrer,
          protocol: `HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
          status: res.statusCode,
          responseSizeBytes: res.getHeader('content-length')
        },
        graphqlRequest: req.graphqlParams
          ? {
              graphqlQueryOperationName: req.graphqlParams.operationName,
              graphqlQueryString: req.graphqlParams.query,
              graphqlQueryVariables: req.graphqlParams.variables,
              graphqlQueryCost: req.graphqlQueryCost,
            }
          : undefined,
      })
    })
  })
  next()
})

loadWhitelist()

app.use('/api/',
  graphQLApi({
    context: {
      esClient,
      requestId: requestStore.getStore()?.requestId ?? null,
    },
  })
)

// On shutdown (SIGTERM/SIGINT) or fatal error (uncaughtException/unhandledRejection), stop accepting
// requests, drain connections, and close ES/cache clients before exiting. A 10-second timeout forces
// exit if graceful teardown stalls.
const server = app.listen(config.PORT, () => {
  logger.info({ event: 'serverStart', port: config.PORT })
})

const shutdown = (signal: string, exitCode = 0) => {
  logger.info({ event: 'shutdown', signal })

  const forceExit = setTimeout(() => {
    logger.error({ event: 'shutdownTimeout' })
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  server.close(async () => {
    try {
      await Promise.all([closeEsClient(), closeCache()])
    } catch (err) {
      logger.error(err)
    }
    clearTimeout(forceExit)
    process.exit(exitCode)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('uncaughtException', (error) => {
  logger.error(error)
  shutdown('uncaughtException', 1)
})
process.on('unhandledRejection', (error) => {
  logger.error(error)
  shutdown('unhandledRejection', 1)
})

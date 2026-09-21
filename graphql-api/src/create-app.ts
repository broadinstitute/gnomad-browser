import cors from 'cors'
import { randomUUID } from 'crypto'
import express from 'express'
import onFinished from 'on-finished'
import { performance } from 'perf_hooks'

import config from './config'
import logger from './logger'
import { cancelRequest, RequestContext, requestStore } from './request-context'

interface CreateAppDependencies {
  elasticsearchClient: unknown
  graphQLApi: (options: {
    context: { esClient: unknown; requestId: string | null }
  }) => express.RequestHandler
}

// Extract the original trace ID from the request for Node's logs.
// NGINX independently extracts the same ID for its own logs, so both logs
// can be correlated to the original request. Prefer W3C Trace Context and
// fall back to Google's legacy X-Cloud-Trace-Context header.
const getGcpTraceId = (request: any) => {
  // Prefer W3C Trace Context.
  // Matches: 00-<32 hex>-<16 hex>-<2 hex>.
  // Capture group 1 (inside parentheses) is the 32-character trace ID.
  const traceParentMatch = request
    .get('traceparent')
    ?.match(/^00-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i)

  if (traceParentMatch) {
    return traceParentMatch[1]
  }

  // Fall back to Google's legacy trace context header.
  // Matches: <32 hex>, followed by "/" and legacy span ID and options.
  // Capture group 1 (inside parentheses) is the 32-character trace ID.
  const cloudTraceMatch = request.get('X-Cloud-Trace-Context')?.match(/^([\da-f]{32})(?:\/|$)/i)

  return cloudTraceMatch?.[1]
}

const getRequestSource = (request: any) =>
  request.get('X-GnomAD-Client') === 'browser' ? 'browser' : 'direct-api'

const createApp = ({ elasticsearchClient, graphQLApi }: CreateAppDependencies): express.Express => {
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
    const traceId = config.GCP_PROJECT ? getGcpTraceId(req) : null

    const store: RequestContext = {
      requestId: randomUUID(),
      startAt: performance.now(),
      startCpu: process.cpuUsage(),
      startHeapUsed: process.memoryUsage().heapUsed,
      trace: traceId ? `projects/${config.GCP_PROJECT}/traces/${traceId}` : null,
      abortController: new AbortController(),
      cancellationReason: null,
      canceledAt: null,
    }

    res.setHeader('x-request-id', store.requestId)
    requestStore.run(store, () => {
      res.once('close', () => {
        const hasServerFinishedWritingResponse = res.writableFinished

        if (!hasServerFinishedWritingResponse) {
          requestStore.run(store, () => {
            if (!cancelRequest('client-disconnected')) return

            logger.info({
              requestId: store.requestId,
              event: 'requestClientDisconnected',
              reason: store.cancellationReason,
              latencyMs: (store.canceledAt ?? performance.now()) - store.startAt,
              requestSource: getRequestSource(req),
              httpRequest: {
                requestMethod: req.method,
                requestUrl: `${req.protocol}://${req.hostname}${req.originalUrl || req.url}`,
                userAgent: req.headers['user-agent'],
                remoteIp: req.ip,
              },
            })
          })
        }
      })

      logger.info({
        requestId: store.requestId,
        event: 'requestStart',
        requestSource: getRequestSource(req),
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
              },
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
          requestSource: getRequestSource(req),
          latencyMs: performance.now() - ctx.startAt,
          cpuUserMicros: cpu.user,
          cpuSystemMicros: cpu.system,
          heapUsed: memory.heapUsed,
          heapDeltaBytes: memory.heapUsed - ctx.startHeapUsed,
          httpRequest: {
            requestMethod: req.method,
            requestUrl: `${req.protocol}://${req.hostname}${req.originalUrl || req.url}`,
            userAgent: req.headers['user-agent'],
            remoteIp: req.ip,
            referer: req.headers.referer || req.headers.referrer,
            protocol: `HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
            status: res.statusCode,
            responseSizeBytes: res.getHeader('content-length'),
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

  app.use(
    '/api/',
    graphQLApi({
      context: {
        esClient: elasticsearchClient,
        requestId: requestStore.getStore()?.requestId ?? null,
      },
    })
  )

  return app
}

export default createApp

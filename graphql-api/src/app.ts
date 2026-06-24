import compression from 'compression'
import cors from 'cors'
import { randomUUID } from 'crypto'
import express from 'express'
import onFinished from 'on-finished'
import { performance } from 'perf_hooks'
import config from './config'
import { client as esClient } from './elasticsearch'
import graphQLApi from './graphql/graphql-api'
import logger from './logger'
import { requestStore } from './request-context'
import { loadWhitelist } from './whitelist'

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
  const store = {
    requestId: randomUUID(),
    startAt: performance.now(),
    startCpu: process.cpuUsage(),
    startHeapUsed: process.memoryUsage().heapUsed,
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
  // NB: ALS propagation can occasionally surprise in third party contexts?
  const ctx = requestStore.getStore()
  onFinished(res, () => {
    if (!ctx) return

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

app.listen(config.PORT)

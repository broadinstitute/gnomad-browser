import { AsyncLocalStorage } from 'async_hooks'
import compression from 'compression'
import cors from 'cors'
import { randomUUID } from 'crypto'
import express from 'express'
import onFinished from 'on-finished'
import onHeaders from 'on-headers'
import { performance } from 'perf_hooks'
import config from './config'
import { client as esClient } from './elasticsearch'
import graphQLApi from './graphql/graphql-api'
import logger from './logger'

import { loadWhitelist } from './whitelist'

process.on('uncaughtException', (error) => {
  logger.error(error)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  logger.error(error)
  process.exit(1)
})

const requestStore = new AsyncLocalStorage<{
  requestId: string
  startAt: number
}>()

const app = express()
app.use(compression())
app.use(cors())

app.set('trust proxy', config.TRUST_PROXY)

// Health check endpoint for load balancer.
// GCE load balancers require a 200 response from the health check endpoint, so this must be
// registered before the HTTP=>HTTPS redirect middleware, which would return a 30x response.
app.get('/health/ready', (_request: any, response: any) => {
  response.send('ok')
})

app.use((req: any, res: any, next: any) => {
  const store = {
    requestId: randomUUID(),
    startAt: performance.now(),
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
        protocol: `HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
      },
    })
    next()
  });
})

// Log requests
// Add logging here to avoid logging health checks
app.use((req: any, res: any, next: any) => {
  const ctx = requestStore.getStore()
  onFinished(res, () => {
    if (!ctx) return
    logger.info({
      requestId: ctx.requestId,
      event: 'requestEnd',
      latencyMs: performance.now() - ctx.startAt,
      httpRequest: {
        requestMethod: req.method,
        requestUrl: `${req.protocol}://${req.hostname}${req.originalUrl || req.url}`,
        status: res.statusCode,
        userAgent: req.headers['user-agent'],
        remoteIp: req.ip,
        referer: req.headers.referer || req.headers.referrer,
        protocol: `HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
      },
    })
  })
  next()
})

loadWhitelist()

app.use('/api/', graphQLApi({
  context: (req: any) => {
    const ctx = requestStore.getStore()
    return {
      esClient,
      // requestId resolution order:
      // 1) AsyncLocalStorage (authoritative per-request value within this process)
      // 2) incoming x-request-id header (for cross-service trace continuity when ALS is unavailable)
      // 3) null (explicit absence like tests, avoids silently undefined values in logs/metrics)
      requestId: ctx?.requestId ?? req.headers['x-request-id'] ?? null,
    }
  },
}))

app.listen(config.PORT)

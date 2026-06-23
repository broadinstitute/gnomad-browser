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
        referer: req.headers.referer || req.headers.referrer,
        protocol: `HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
      },
    })
    next()
  })
})

app.use((req: any, res: any, next: any) => {
  // NB: ALS propagation can occasionally surprise in third party contexts?
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
        userAgent: req.headers['user-agent'],
        remoteIp: req.ip,
        referer: req.headers.referer || req.headers.referrer,
        protocol: `HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
        status: res.statusCode,
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
      requestId: ctx?.requestId ?? null,
    }
  },
}))

app.listen(config.PORT)

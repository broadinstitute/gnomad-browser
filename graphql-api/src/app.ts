import compression from 'compression'
import cors from 'cors'
import express from 'express'
import onFinished from 'on-finished'
import onHeaders from 'on-headers'
import config from './config'
import { client as esClient } from './elasticsearch'
import graphQLApi from './graphql/graphql-api'
import logger from './logger'
import { PerformanceObserver, PerformanceObserverEntryList } from 'node:perf_hooks'

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

const logGCDurations = (items: PerformanceObserverEntryList, durationLog: number[]) => {
  items.getEntries().forEach((item) => durationLog.push(item.duration))
}

const gcDurationStats = (gcDurations: number[]) => {
  const nDurations = gcDurations.length
  if (nDurations > 0) {
    const totalDuration = gcDurations.reduce((acc, duration) => acc + duration, 0)
    const avgDuration = totalDuration / nDurations

    return { nDurations, totalDuration, avgDuration }
  }
  return undefined
}

// Log requests
// Add logging here to avoid logging health checks
app.use(function requestLogMiddleware(request: any, response: any, next: any) {
  let memoryBefore: NodeJS.MemoryUsage | undefined
  request.startAt = process.hrtime()
  response.startAt = undefined

  const gcDurations: number[] = []
  const gcObserver = new PerformanceObserver((items) => logGCDurations(items, gcDurations))
  gcObserver.observe({ type: 'gc' })

  onHeaders(response, () => {
    memoryBefore = process.memoryUsage()
    response.startAt = process.hrtime()
  })

  onFinished(response, () => {
    gcObserver.disconnect()

    const memoryAfter = process.memoryUsage()
    const memoryDelta: NodeJS.MemoryUsage | undefined = memoryBefore && {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      external: memoryAfter.external - memoryBefore.external,
      arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers,
    }

    logger.info({
      memory: { before: memoryBefore, after: memoryAfter, delta: memoryDelta },
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
      gc: gcDurationStats(gcDurations),
    })
  })

  next()
})

const context = { esClient }

app.use('/api/', graphQLApi({ context }))

app.listen(config.PORT)

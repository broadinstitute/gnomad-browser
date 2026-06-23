import compression from 'compression'
import cors from 'cors'
import express from 'express'
import onFinished from 'on-finished'
import onHeaders from 'on-headers'
import config from './config'
import { client as esClient } from './elasticsearch'
import graphQLApi from './graphql/graphql-api'
import logger from './logger'

import { loadWhitelist } from './whitelist'
import startEsStatsPolling from './esPoll'

const STATS_POLL_INTERVAL = 5000

const app = express()
app.use(compression())
app.use(cors())

app.set('trust proxy', config.TRUST_PROXY)

app.get('/health/ready', (_request: any, response: any) => {
  response.send('ok')
})

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

loadWhitelist()

const context = { esClient }

app.use('/api/', graphQLApi({ context }))

if (!process.env.NO_ES_STATS_POLL) {
  startEsStatsPolling(STATS_POLL_INTERVAL)
}

const server = app.listen(config.PORT, () => {
  logger.info(`Server listening on port ${config.PORT}`)
})

let shuttingDown = false
function shutdown(signal: string, error?: any) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info(`Received ${signal}. Shutting down gracefully...`)
  if (error) {
    logger.error(error)
  }
  server.close(() => {
    logger.info('HTTP server closed')
    process.exit(error ? 1 : 0)
  })
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 3000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('uncaughtException', (error) => {
  shutdown('uncaughtException', error)
})
process.on('unhandledRejection', (error) => {
  shutdown('unhandledRejection', error)
})
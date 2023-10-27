import compression from 'compression'
import cors from 'cors'
import express from 'express'
import onFinished from 'on-finished'
import onHeaders from 'on-headers'
import config from './config'
import { client as esClient } from './elasticsearch'
import graphQLApi from './graphql/graphql-api'
import logger from './logger'

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
        requestUrl: `${request.protocol}://${request.hostname}${request.originalUrl || request.url
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
      // graphqlRequest: request.graphqlParams
      //   ? {
      //       graphqlQueryOperationName: request.graphqlParams.operationName,
      //       graphqlQueryString: request.graphqlParams.query,
      //       graphqlQueryVariables: request.graphqlParams.variables,
      //       graphqlQueryCost: request.graphqlQueryCost,
      //     }
      //   : undefined,
    })
  })

  next()
})

const context = { esClient }

app.use('/api/', graphQLApi({ context }))

app.listen(config.PORT)

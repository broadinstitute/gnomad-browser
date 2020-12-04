const compression = require('compression')
const cors = require('cors')
const express = require('express')
const onFinished = require('on-finished')
const onHeaders = require('on-headers')

const config = require('./config')
const esClient = require('./elasticsearch').client
const graphQLApi = require('./graphql/graphql-api')
const logger = require('./logger')

const app = express()
app.use(compression())
app.use(cors())

app.set('trust proxy', config.TRUST_PROXY)

// Health check endpoint for load balancer.
// GCE load balancers require a 200 response from the health check endpoint, so this must be
// registered before the HTTP=>HTTPS redirect middleware, which would return a 30x response.
app.get('/health/ready', (request, response) => {
  response.send('ok')
})

// Log requests
// Add logging here to avoid logging health checks
app.use(function requestLogMiddleware(request, response, next) {
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
        status: response.headersSent ? response.statusCode : undefined,
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
    })
  })

  next()
})

const context = { esClient }

app.use('/api/', graphQLApi({ context }))

app.listen(config.PORT)

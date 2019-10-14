import Bottleneck from 'bottleneck'
import express from 'express'
import compression from 'compression'
import elasticsearch from 'elasticsearch'
import graphQLHTTP from 'express-graphql'
import cors from 'cors'
import Redis from 'ioredis'
import serveStatic from 'serve-static'

import gnomadSchema from './schema'
import { UserVisibleError } from './schema/errors'
import logger from './utilities/logging'

const app = express()
app.use(compression())
app.use(cors())

app.set('trust proxy', JSON.parse(process.env.TRUST_PROXY || 'false'))

// Redirect HTTP requests to HTTPS
if (JSON.parse(process.env.ENABLE_SSL_REDIRECT || 'false')) {
  app.use((request, response, next) => {
    if (request.protocol === 'http') {
      response.redirect(`https://${request.get('host')}${request.url}`)
    } else {
      next()
    }
  })
}

const elastic = new elasticsearch.Client({
  apiVersion: '5.5',
  host: process.env.ELASTICSEARCH_URL,
})

const esLimiter = new Bottleneck({
  maxConcurrent: JSON.parse(process.env.MAX_CONCURRENT_ES_REQUESTS || '100'),
  highWater: JSON.parse(process.env.MAX_QUEUED_ES_REQUESTS || '1000'),
  strategy: Bottleneck.strategy.OVERFLOW,
})

esLimiter.on('error', error => {
  logger.error(error)
})

const scheduleElasticsearchRequest = fn => {
  return new Promise((resolve, reject) => {
    let canceled = false

    // If task sits in the queue for more than 30s, cancel it and notify the user.
    const timeout = setTimeout(() => {
      canceled = true
      reject(new UserVisibleError('Request timed out'))
    }, 30000)

    esLimiter
      .schedule(() => {
        // When the request is taken out of the queue...

        // Cancel timeout timer.
        clearTimeout(timeout)

        // If the timeout has expired since the request was queued, do nothing.
        if (canceled) {
          return Promise.resolve(undefined)
        }

        // Otherwise, make the request.
        return fn()
      })
      .then(resolve, err => {
        // If Bottleneck refuses to schedule the request because the queue is full,
        // notify the user and cancel the timeout timer.
        if (err.message === 'This job has been dropped by Bottleneck') {
          clearTimeout(timeout)
          reject(new UserVisibleError('Service overloaded'))
        }

        // Otherwise, forward the error.
        reject(err)
      })
  })
}

// This wraps the ES methods used by the API and sends them through the rate limiter
const limitedElastic = {
  clearScroll: elastic.clearScroll.bind(elastic),
  search: (...args) => scheduleElasticsearchRequest(() => elastic.search(...args)),
  scroll: (...args) => scheduleElasticsearchRequest(() => elastic.scroll(...args)),
  count: (...args) => scheduleElasticsearchRequest(() => elastic.count(...args)),
  get: (...args) => scheduleElasticsearchRequest(() => elastic.get(...args)),
}

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
})

app.get('/', (request, response) => {
  response.send('ok')
})

app.use(
  [/^\/api\/?$/],
  graphQLHTTP({
    schema: gnomadSchema,
    graphiql: true,
    context: {
      database: {
        elastic: limitedElastic,
        redis,
      },
    },
    customFormatErrorFn: error => {
      // graphql-js doesn't distinguish between different error types, so this is the
      // only way to determine what errors come from query validation (and thus should
      // be shown to the user)
      // See https://github.com/graphql/graphql-js/issues/1847
      const isQueryValidationError =
        (error.message.startsWith('Syntax Error') &&
          error.stack.includes('graphql/error/syntaxError')) ||
        (error.message.startsWith('Cannot query field') &&
          error.stack.includes('graphql/validation/rules'))

      if (isQueryValidationError) {
        return { message: error.message, locations: error.locations }
      }

      const isUserVisible = error.extensions && error.extensions.isUserVisible

      // User visible errors (such as variant not found) are expected to occur during
      // normal use of the browser and don't need to be logged.
      if (!isUserVisible) {
        logger.warn(error)
      }

      const message = isUserVisible ? error.message : 'An unknown error occurred'
      return { message }
    },
  })
)

if (process.env.READS_DIR) {
  app.use(['/reads', '/api/reads'], serveStatic(process.env.READS_DIR, { acceptRanges: true }))
}

app.listen(process.env.GRAPHQL_PORT, () => {
  logger.info(`Listening on ${process.env.GRAPHQL_PORT}`)
})

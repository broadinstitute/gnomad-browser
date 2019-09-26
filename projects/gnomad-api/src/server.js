import express from 'express'
import compression from 'compression'
import elasticsearch from 'elasticsearch'
import graphQLHTTP from 'express-graphql'
import cors from 'cors'
import Redis from 'ioredis'
import serveStatic from 'serve-static'

import gnomadSchema from './schema'

const app = express()
app.use(compression())
app.use(cors())

// eslint-disable-line prettier/prettier
;(async () => {
  try {
    const elastic = new elasticsearch.Client({
      apiVersion: '5.5',
      host: process.env.ELASTICSEARCH_URL,
    })

    const redisConnectionConfig =
      process.env.NODE_ENV === 'development'
        ? { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
        : {
            sentinels: [
              { host: 'redis-sentinel', port: 26379 },
              { host: 'redis-sentinel', port: 26379 },
            ],
            name: 'mymaster',
          }

    const redis = new Redis(redisConnectionConfig)

    app.use(
      [/^\/$/, /^\/api\/?$/],
      graphQLHTTP({
        schema: gnomadSchema,
        graphiql: true,
        context: {
          database: {
            elastic,
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
            console.log(error)
          }

          const message = isUserVisible ? error.message : 'An unknown error occurred'
          return { message }
        },
      })
    )

    if (process.env.READS_DIR) {
      app.use(['/reads', '/api/reads'], serveStatic(process.env.READS_DIR, { acceptRanges: true }))
    }

    app.get('/health', (req, res) => {
      res.json({})
    })

    app.listen(process.env.GRAPHQL_PORT, () => {
      console.log(`Listening on ${process.env.GRAPHQL_PORT}`)
    })
  } catch (error) {
    console.log(error)
  }
})()

import '@babel/polyfill'
import express from 'express'
import compression from 'compression'
import { MongoClient } from 'mongodb'
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
    const mongoClient = await MongoClient.connect(process.env.GNOMAD_MONGO_URL, {
      useNewUrlParser: true,
    })

    const elastic = new elasticsearch.Client({
      apiVersion: '5.5',
      host: process.env.ELASTICSEARCH_URL,
      keepAlive: false,
      maxRetries: 1,
      requestTimeout: 45000,
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
      [/^\/$/, /^\/api$/],
      graphQLHTTP({
        schema: gnomadSchema,
        graphiql: true,
        context: {
          database: {
            gnomad: mongoClient.db(),
            elastic,
            redis,
          },
        },
      })
    )

    if (process.env.READS_DIR) {
      app.use(['/reads', '/api/reads'], serveStatic(process.env.READS_DIR, { acceptRanges: true }))
    }

    app.get('/health', (req, res) => {
      res.json({})
    })

    app.listen(process.env.GRAPHQL_PORT, () =>
      console.log(`Listening on ${process.env.GRAPHQL_PORT}`))
  } catch (error) {
    console.log(error)
  }
})()

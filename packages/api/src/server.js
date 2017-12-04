import 'babel-core/register'
import 'babel-polyfill'
import express from 'express'
import compression from 'compression'
import { MongoClient } from 'mongodb'
import elasticsearch from 'elasticsearch'
import graphQLHTTP from 'express-graphql'
import cors from 'cors'
import Redis from 'ioredis'

import gnomadSchema from './schema'

import sczMockDb from './mockdata/meta'

const app = express()
app.use(compression())
app.use(cors());

(async () => {
  try {
    const gnomad = await MongoClient.connect(process.env.GNOMAD_MONGO_URL)
    const elastic = await new elasticsearch.Client({
      host: process.env.ELASTICSEARCH_URL,
      // log: 'trace',
    })
    const isDev = process.env.NODE_ENV === 'development'
    const redis = isDev ?
      await new Redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }) :
      await new Redis({
        sentinels: [
          { host: 'redis-sentinel', port: 26379 },
          { host: 'redis-sentinel', port: 26379 },
        ],
        name: 'mymaster',
      })
    app.use(/\/$/, graphQLHTTP({
      schema: gnomadSchema,
      graphiql: true,
      context: {
        database: {
          gnomad,
          sczMockDb,
          elastic,
          redis,
        },
      },
    }))
    app.use('/export', (request, response) => {
      console.log(request)
      response.send('hello!')
    })
    app.listen(process.env.GRAPHQL_PORT, () =>
      console.log(`Listening on ${process.env.GRAPHQL_PORT}`))
  } catch (error) {
    console.log(error)
  }
})()

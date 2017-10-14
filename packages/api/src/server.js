import 'babel-core/register'
import 'babel-polyfill'
import express from 'express'
import { MongoClient } from 'mongodb'
import elasticsearch from 'elasticsearch'
import GraphQLHTTP from 'express-graphql'
import cors from 'cors'
import Redis from 'ioredis'

import gnomadSchema from './schema'

import sczMockDb from './mockdata/meta'

const app = express()
app.use(cors());

(async () => {
  try {
    const gnomad = await MongoClient.connect(process.env.GNOMAD_MONGO_URL)
    // const exacv1 = await MongoClient.connect(process.env.EXACV1_MONGO_URL)
    const elastic = await new elasticsearch.Client({
      host: process.env.ELASTICSEARCH_URL,
      // log: 'trace',
    })
    app.use('/', GraphQLHTTP({
      schema: gnomadSchema,
      graphiql: true,
      context: {
        database: {
          gnomad,
          // exacv1,
          sczMockDb,
          elastic,
          redis: await new Redis({ host: process.env.REDIS_HOST }),
        },
      },
    }))
    app.listen(process.env.GRAPHQL_PORT, () =>
      console.log(`Listening on ${process.env.GRAPHQL_PORT}`))
  } catch (error) {
    console.log(error)
  }
})()

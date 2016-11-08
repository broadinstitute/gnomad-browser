import 'babel-core/register'
import 'babel-polyfill'
import express from 'express'
import { MongoClient } from 'mongodb'
import GraphQLHTTP from 'express-graphql'
import cors from 'cors'

import gnomadSchema from './schema'

const app = express()
app.use(cors());

(async () => {
  try {
    const db = await MongoClient.connect(process.env.MONGO_URL)
    app.use('/graph', GraphQLHTTP({
      schema: gnomadSchema,
      graphiql: true,
      context: { db },
    }))
    app.listen(process.env.GRAPHQL_PORT, () =>
      console.log(`Listening on ${process.env.GRAPHQL_PORT}`))
  } catch (error) {
    console.log(error)
  }
})()

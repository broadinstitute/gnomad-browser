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
    app.listen(8080, () => console.log('Listening on 8080'))
  } catch (error) {
    console.log(error)
  }
})()

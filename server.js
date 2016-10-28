import express from 'express'
import { MongoClient } from 'mongodb'
import GraphQLHTTP from 'express-graphql'

import gnomadSchema from './schema'

const app = express();

(async () => {
  try {
    const db = await MongoClient.connect(process.env.MONGO_URL)
    app.use('/graph', GraphQLHTTP({
      schema: gnomadSchema(db),
      graphiql: true,
    }))
    app.listen(8080, () => console.log('Listening on 8080'))
  } catch (error) {
    console.log(error)
  }
})()

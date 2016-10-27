import express from 'express'
import { MongoClient } from 'mongodb'
import GraphQLHTTP from 'express-graphql'

import schema from './schema'

const app = express();

(async () => {
  const db = await MongoClient.connect(process.env.MONGO_URL)
  app.use('/graph', GraphQLHTTP({
    schema: schema(db),
    graphiql: true,
  }))
  app.listen(8080, () => console.log('Listening on 8080'))
})()

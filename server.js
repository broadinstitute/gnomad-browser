import express from 'express'
import { MongoClient } from 'mongodb'

const app = express()

app.listen(8080, () => console.log('Listening on 8080'))

MongoClient.connect(process.env.MONGO_URL, (error, database) => {
  if (error) throw error
  database.collection('variants')
    .find({ genes: 'ENSG00000169174' })
    .toArray((error, data) => {
      if (error) throw error
      console.log(data)
    })
})

import express from 'express'
import graphQLHTTP from 'express-graphql'

import { formatError } from './errors'
import logger from './logging'
import schema from './schema'

const config = {
  PORT: JSON.parse(process.env.PORT || '80'),
  TRUST_PROXY: JSON.parse(process.env.TRUST_PROXY || 'false'),
}

const app = express()

app.set('trust proxy', config.TRUST_PROXY)

// Endpoint for health check
app.get('/ready', (request, response) => {
  response.send('true')
})

app.use(
  '/reads',
  graphQLHTTP({
    schema,
    graphiql: true,
    customFormatErrorFn: formatError,
  })
)

app.listen(config.PORT, () => {
  logger.info(`Listening on ${config.PORT}`)
})

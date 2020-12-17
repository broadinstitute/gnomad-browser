const express = require('express')
const graphQLHTTP = require('express-graphql')

const { formatError } = require('./errors')
const logger = require('./logging')
const schema = require('./schema')

const config = {
  PORT: JSON.parse(process.env.PORT || '80'),
  TRUST_PROXY: JSON.parse(process.env.TRUST_PROXY || 'false'),
}

const app = express()

app.set('trust proxy', config.TRUST_PROXY)

// Endpoint for health check
app.get('/health/ready', (request, response) => {
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

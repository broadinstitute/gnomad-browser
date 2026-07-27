const express = require('express')
const { graphqlHTTP } = require('express-graphql')

const { shortTandemRepeatDatasets } = require('./datasets')
const { formatError } = require('./errors')
const logger = require('./logging')
const schema = require('./schema')
const { ensureShortTandemRepeatReadsDb } = require('./shortTandemRepeatReadsDb')

// The behavior of Express' trust proxy setting varies based on the type of the argument.
// Parse the environment variable string into the appropriate type.
// https://expressjs.com/en/guide/behind-proxies.html
const parseProxyConfig = (config) => {
  if (config.toLowerCase() === 'true') {
    return true
  }
  if (config.toLowerCase() === 'false') {
    return false
  }

  const isNumber = !Number.isNaN(Number(config))
  if (isNumber) {
    return Number(config)
  }

  return config
}

const config = {
  PORT: JSON.parse(process.env.PORT || '80'),
  TRUST_PROXY: parseProxyConfig(process.env.TRUST_PROXY || 'false'),
}

const app = express()

app.set('trust proxy', config.TRUST_PROXY)

// Endpoint for health check
app.get('/health/ready', (request, response) => {
  response.send('true')
})

app.use(
  '/reads',
  graphqlHTTP({
    schema,
    graphiql: true,
    customFormatErrorFn: formatError,
  })
)

// Fetch and validate the tandem repeat reads DB before listening, so that the pod cannot pass its
// readiness probe until it is actually able to serve read data.
const main = async () => {
  await Promise.all(
    Object.values(shortTandemRepeatDatasets).map((dataset) =>
      ensureShortTandemRepeatReadsDb(dataset)
    )
  )

  app.listen(config.PORT, () => {
    logger.info(`Listening on ${config.PORT}`)
  })
}

main().catch((error) => {
  logger.error(error)
  process.exit(1)
})

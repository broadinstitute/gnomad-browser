const compression = require('compression')
const cors = require('cors')
const express = require('express')
const morgan = require('morgan')

const config = require('./config')
const esClient = require('./elasticsearch').client
const graphQLApi = require('./graphql/graphql-api')

const app = express()
app.use(compression())
app.use(cors())

app.set('trust proxy', config.TRUST_PROXY)

// Health check endpoint for load balancer.
// GCE load balancers require a 200 response from the health check endpoint, so this must be
// registered before the HTTP=>HTTPS redirect middleware, which would return a 30x response.
app.get('/health/ready', (request, response) => {
  response.send('ok')
})

// Add logging here to avoid logging health checks
app.use(morgan('combined'))

const context = { esClient }

app.use('/api/', graphQLApi({ context }))

app.listen(config.PORT)

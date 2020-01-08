import path from 'path'

import compression from 'compression'
import express from 'express'

const port = process.env.PORT || 80

const app = express()
app.use(compression())

app.set('trust proxy', JSON.parse(process.env.TRUST_PROXY || 'false'))

// Health check endpoint for load balancer.
// GCE load balancers require a 200 response from the health check endpoint, so
// this must be registered before the HTTP=>HTTPS redirect middleware, which
// would return a 30x response.
app.get('/health/ready', (request, response) => {
  response.send('true')
})

// Redirect HTTP requests to HTTPS.
if (JSON.parse(process.env.ENABLE_HTTPS_REDIRECT || 'false')) {
  app.use((request, response, next) => {
    if (request.protocol === 'http') {
      response.redirect(`https://${request.get('host')}${request.url}`)
    } else {
      next()
    }
  })
}

const publicDir = path.resolve(__dirname, 'public')
app.use(express.static(publicDir))
app.get('*', (request, response) => {
  response.sendFile(path.join(publicDir, 'index.html'))
})

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Listening on ${port}`)
})

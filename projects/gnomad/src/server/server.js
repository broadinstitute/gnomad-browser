import path from 'path'

import compression from 'compression'
import express from 'express'

const port = process.env.PORT || 80

const app = express()
app.use(compression())

app.set('trust proxy', JSON.parse(process.env.TRUST_PROXY || 'false'))

// Redirect HTTP requests to HTTPS
if (JSON.parse(process.env.ENABLE_SSL_REDIRECT || 'false')) {
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
  console.log(`Listening on ${port}`)
})

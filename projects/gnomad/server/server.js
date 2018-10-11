import path from 'path'

import compression from 'compression'
import express from 'express'

const port = process.env.PORT || 80

const app = express()
app.use(compression())

const publicDir = path.resolve(__dirname, 'public')
app.use(express.static(publicDir))
app.get('*', (request, response) => {
  response.sendFile(path.join(publicDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`Listening on ${port}`)
})

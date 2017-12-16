import path from 'path'
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import config from './config'

const app = express()

app.use(express.static('public'))
app.use(compression())
app.use(cors())
// app.set('view engine', 'ejs')

app.get('*', (request, response) => {
  response.sendFile(path.join(__dirname, '../public', 'index.html'))
})

app.listen(config.port, () => {
  console.info(`Running on ${config.port}`)
})

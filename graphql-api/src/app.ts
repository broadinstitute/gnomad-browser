import { closeCache } from './cache'
import config from './config'
import createApp from './create-app'
import { client as esClient, closeClient as closeEsClient } from './elasticsearch'
import graphQLApi from './graphql/graphql-api'
import logger from './logger'
import { loadWhitelist } from './whitelist'

const app = createApp({ elasticsearchClient: esClient, graphQLApi })

loadWhitelist()

// On shutdown (SIGTERM/SIGINT) or fatal error (uncaughtException/unhandledRejection), stop accepting
// requests, drain connections, and close ES/cache clients before exiting. A 10-second timeout forces
// exit if graceful teardown stalls.
const server = app.listen(config.PORT, () => {
  logger.info({ event: 'serverStart', port: config.PORT })
})

const shutdown = (signal: string, exitCode = 0) => {
  logger.info({ event: 'shutdown', signal })

  const forceExit = setTimeout(() => {
    logger.error({ event: 'shutdownTimeout' })
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  server.close(async () => {
    try {
      await Promise.all([closeEsClient(), closeCache()])
    } catch (err) {
      logger.error(err)
    }
    clearTimeout(forceExit)
    process.exit(exitCode)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('uncaughtException', (error) => {
  logger.error(error)
  shutdown('uncaughtException', 1)
})
process.on('unhandledRejection', (error) => {
  logger.error(error)
  shutdown('unhandledRejection', 1)
})

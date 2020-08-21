const { promisify } = require('util')

const Bottleneck = require('bottleneck')
const fetch = require('node-fetch')
const redis = require('redis')

const config = require('./config')
const { UserVisibleError } = require('./graphql/errors')
const logger = require('./logger')

let fetchCacheValue = () => null
let setCacheValue = () => {}
let setCacheExpiration = () => {}

if (config.CACHE_REDIS_URL) {
  const cacheDb = redis.createClient({
    url: config.CACHE_REDIS_URL,
    retry_strategy:
      process.env.NODE_ENV === 'development'
        ? ({ attempt }) => {
            logger.info('Retrying connection to cache database')
            return Math.min(attempt * 100, 3000)
          }
        : ({ attempt }) => Math.min(attempt * 100, 3000),
  })

  const withTimeout = (fn, timeout) => {
    return (...args) =>
      Promise.race([
        Promise.resolve(fn(...args)),
        new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Timed out'))
          }, timeout)
        }),
      ])
  }

  fetchCacheValue = withTimeout(promisify(cacheDb.get).bind(cacheDb), 1000)
  setCacheValue = withTimeout(promisify(cacheDb.set).bind(cacheDb), 1000)
  setCacheExpiration = withTimeout(promisify(cacheDb.expire).bind(cacheDb), 500)
} else {
  logger.warn('No cache configured')
}

const queryInternalAPI = async (path, options = {}) => {
  const { cacheKey = path, cacheExpiration = undefined } = options

  let cachedResult = null
  if (cacheExpiration) {
    try {
      cachedResult = await fetchCacheValue([cacheKey])
    } catch (error) {
      logger.warn(`Failed to fetch cached value (${error})`)
    }
  }
  if (cachedResult) {
    setCacheExpiration([cacheKey, cacheExpiration]).catch(() => {})
    return JSON.parse(cachedResult)
  }

  const response = await fetch(`${config.INTERNAL_API_URL}${path}`)
  const content = await response.json()
  if (response.status === 400) {
    throw new UserVisibleError((content.error || {}).message || 'Bad request')
  }
  if (response.status === 404) {
    throw new UserVisibleError((content.error || {}).message || 'Not found')
  }
  if (response.status !== 200) {
    throw Error(content || `Failed internal API query "${path}"`)
  }

  const result = content.data

  if (cacheExpiration) {
    setCacheValue([cacheKey, JSON.stringify(result), 'EX', cacheExpiration]).catch((error) => {
      logger.warn(`Failed to cache value (${error})`)
    })
  }

  return result
}

const queryBottleneck = new Bottleneck({
  maxConcurrent: config.MAX_CONCURRENT_INTERNAL_API_QUERIES,
  highWater: config.MAX_QUEUED_INTERNAL_API_QUERIES,
  strategy: Bottleneck.strategy.OVERFLOW,
})

queryBottleneck.on('error', (error) => {
  logger.error(error)
})

const bottleneckedQueryInternalAPI = (...args) => {
  return new Promise((resolve, reject) => {
    let timedOut = false

    // If task sits in the queue for more than 30s, cancel it and notify the user.
    const timeout = setTimeout(() => {
      timedOut = true
      logger.warn('Query timed out')
      reject(new UserVisibleError('Request timed out'))
    }, 30000)

    queryBottleneck
      .schedule(() => {
        // When the request is taken out of the queue...

        // Cancel timeout timer.
        clearTimeout(timeout)

        // If the timeout has expired since the request was queued, do nothing.
        if (timedOut) {
          return Promise.resolve(undefined)
        }

        // Otherwise, make the request.
        return queryInternalAPI(...args)
      })
      .then(
        (result) => {
          if (timedOut) {
            return
          }

          resolve(result)
        },
        (error) => {
          // If Bottleneck refuses to schedule the request because the queue is full,
          // notify the user and cancel the timeout timer.
          if (error.message === 'This job has been dropped by Bottleneck') {
            clearTimeout(timeout)
            logger.warn('Query queue overflowed')
            reject(new UserVisibleError('Service overloaded'))
          }

          // Otherwise, forward the error.
          reject(error)
        }
      )
  })
}

module.exports = {
  queryInternalAPI: bottleneckedQueryInternalAPI,
}

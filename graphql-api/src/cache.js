const { promisify } = require('util')

const redis = require('redis')

const config = require('./config')
const logger = require('./logger')

let fetchCacheValue = () => Promise.resolve(null)
let setCacheValue = () => Promise.resolve()
let setCacheExpiration = () => Promise.resolve()

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

  fetchCacheValue = withTimeout(promisify(cacheDb.get).bind(cacheDb), config.CACHE_REQUEST_TIMEOUT)
  setCacheValue = withTimeout(promisify(cacheDb.set).bind(cacheDb), config.CACHE_REQUEST_TIMEOUT)
  setCacheExpiration = withTimeout(
    promisify(cacheDb.expire).bind(cacheDb),
    config.CACHE_REQUEST_TIMEOUT
  )
} else {
  logger.warn('No cache configured')
}

const withCache = (fn, keyFn, options = {}) => {
  const { expiration = 3600 } = options

  return async (...args) => {
    const cacheKey = keyFn(...args)

    let cachedResult = null
    try {
      cachedResult = await fetchCacheValue([cacheKey])
    } catch (error) {
      logger.warn(`Failed to fetch cached value (${error})`)
    }
    if (cachedResult) {
      setCacheExpiration([cacheKey, expiration]).catch(() => {})
      return JSON.parse(cachedResult)
    }

    const result = await fn(...args)

    if (expiration) {
      setCacheValue([cacheKey, JSON.stringify(result), 'EX', expiration]).catch((error) => {
        logger.warn(`Failed to cache value (${error})`)
      })
    }

    return result
  }
}

module.exports = {
  withCache,
}

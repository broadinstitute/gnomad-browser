import { promisify } from 'util'

import redis from 'redis'

import config from './config'
import logger from './logger'

let fetchCacheValue = () => Promise.resolve(null)
let setCacheValue = () => Promise.resolve()
let setCacheExpiration = () => Promise.resolve()

if (config.CACHE_REDIS_URL) {
  const cacheDb = redis.createClient({
    url: config.CACHE_REDIS_URL,
    retry_strategy:
      process.env.NODE_ENV === 'development'
        ? ({ attempt }: any) => {
            logger.info('Retrying connection to cache database')
            return Math.min(attempt * 100, 3000)
          }
        : ({ attempt }: any) => Math.min(attempt * 100, 3000),
  })

  const withTimeout = (fn: any, timeout: any) => {
    return (...args: any[]) =>
      Promise.race([
        Promise.resolve(fn(...args)),
        new Promise((_resolve, reject) => {
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

export const withCache = (fn: any, keyFn: any, options = {}) => {
  // @ts-expect-error TS(2339) FIXME: Property 'expiration' does not exist on type '{}'.
  const { expiration = 3600 } = options

  return async (...args: any[]) => {
    const cacheKey = keyFn(...args)

    let cachedResult = null
    try {
      // @ts-expect-error TS(2554) FIXME: Expected 0 arguments, but got 1.
      cachedResult = await fetchCacheValue([cacheKey])
    } catch (error) {
      logger.warn(`Failed to fetch cached value (${error})`)
    }
    if (cachedResult) {
      // @ts-expect-error TS(2554) FIXME: Expected 0 arguments, but got 1.
      setCacheExpiration([cacheKey, expiration]).catch(() => {})
      return JSON.parse(cachedResult)
    }

    const result = await fn(...args)

    if (expiration) {
      // @ts-expect-error TS(2554) FIXME: Expected 0 arguments, but got 1.
      setCacheValue([cacheKey, JSON.stringify(result), 'EX', expiration]).catch((error) => {
        logger.warn(`Failed to cache value (${error})`)
      })
    }

    return result
  }
}

import { promisify } from 'util'

import { Redis } from 'ioredis'

import config from './config'
import logger from './logger'
import { JsonCache } from './queries/helpers/json-cache'
import largeGenes from './queries/helpers/large-genes'

let fetchCacheValue = () => Promise.resolve(null)
let setCacheValue = () => Promise.resolve()
let setCacheExpiration = () => Promise.resolve()

if (config.REDIS_HOST) {
  let readCacheDb
  let writeCacheDb
  if (config.REDIS_USE_SENTINEL) {
    readCacheDb = new Redis({
      sentinels: [{ host: config.REDIS_HOST, port: config.REDIS_PORT }],
      name: config.REDIS_GROUP_NAME,
      role: 'slave',
      db: 1,
    })

    writeCacheDb = new Redis({
      sentinels: [{ host: config.REDIS_HOST, port: config.REDIS_PORT }],
      name: config.REDIS_GROUP_NAME,
      db: 1,
    })
  } else {
    readCacheDb = new Redis({
      host: config.REDIS_HOST,
      db: 1,
    })

    writeCacheDb = new Redis({
      host: config.REDIS_HOST,
      db: 1,
    })
  }

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

  fetchCacheValue = withTimeout(
    promisify(readCacheDb.get).bind(readCacheDb),
    config.CACHE_REQUEST_TIMEOUT
  )
  setCacheValue = withTimeout(
    promisify(writeCacheDb.set).bind(writeCacheDb),
    config.CACHE_REQUEST_TIMEOUT
  )
  setCacheExpiration = withTimeout(
    promisify(writeCacheDb.expire).bind(writeCacheDb),
    config.CACHE_REQUEST_TIMEOUT
  )
} else {
  logger.warn('No cache configured')
}

export const withCache = (fn: any, keyFn: any, options = {}) => {
  // @ts-expect-error TS(2339) FIXME: Property 'expiration' does not exist on type '{}'.
  //
  const { expiration = 3600, jsonCacheEnableAll = config.JSON_CACHE_ENABLE_ALL, jsonCacheLargeGenes = config.JSON_CACHE_LARGE_GENES } = options

  return async (...args: any[]) => {
    const cacheKey = keyFn(...args)

    if (jsonCacheEnableAll) {
      const json_cache = new JsonCache(config.JSON_CACHE_PATH, config.JSON_CACHE_COMPRESSION)
      if (await json_cache.exists(cacheKey)) {
        return json_cache.get(cacheKey)
      }

      const result = await fn(...args)

      json_cache.set(cacheKey, result)

      return result
    }


    if (jsonCacheLargeGenes) {
      const isLargeGene = largeGenes.some(g => cacheKey.includes(g))

      if (isLargeGene) {
        const json_cache = new JsonCache(config.JSON_CACHE_PATH, config.JSON_CACHE_COMPRESSION)
        if (await json_cache.exists(cacheKey)) {
          return json_cache.get(cacheKey)
        }

        const result = await fn(...args)

        json_cache.set(cacheKey, result)

        return result
      }
    }

    let cachedResult = null
    try {
      // @ts-expect-error TS(2554) FIXME: Expected 0 arguments, but got 1.
      cachedResult = await fetchCacheValue([cacheKey])
    } catch (error) {
      logger.warn(`Failed to fetch cached value (${error})`)
    }
    if (cachedResult) {
      // @ts-expect-error TS(2554) FIXME: Expected 0 arguments, but got 1.
      setCacheExpiration([cacheKey, expiration]).catch(() => { })
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

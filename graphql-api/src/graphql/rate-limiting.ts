import { Redis } from 'ioredis'
import config from '../config'
import { UserVisibleError } from '../errors'
import logger from '../logger'

let rateLimitDb: Redis

if (config.REDIS_USE_SENTINEL) {
  rateLimitDb = new Redis({
    sentinels: [{ host: config.REDIS_HOST, port: config.REDIS_PORT }],
    name: config.REDIS_GROUP_NAME,
    db: 2,
  })
} else {
  rateLimitDb = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    db: 2,
  })
}

const increaseRateLimitCounter = (key: any, value: any) => {
  return Promise.race([
    new Promise((resolve, reject) => {
      rateLimitDb
        .multi()
        .set(key, 0, 'EX', 59, 'NX')
        .incrby(key, value)
        .exec((err: any, replies: any) => {
          if (err) {
            reject(err)
          } else {
            resolve(replies[1])
          }
        })
    }),
    new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Timed out'))
      }, 500)
    }),
  ])
}

export const applyRateLimits = async (request: any) => {
  const rateLimitWindow = new Date().getMinutes()

  const clientId = request.ip

  try {
    const totalRequestsInWindow = await increaseRateLimitCounter(
      `rate_limit:1m:requests:${clientId}:${rateLimitWindow}`,
      1
    )

    // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
    if (totalRequestsInWindow > config.MAX_REQUESTS_PER_MINUTE) {
      throw new UserVisibleError('Query rate limit exceeded. Please try again in a few minutes.')
    }

    const totalCostInWindow = await increaseRateLimitCounter(
      `rate_limit:1m:cost:${clientId}:${rateLimitWindow}`,
      request.graphqlQueryCost || 0
    )

    // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
    if (totalCostInWindow > config.MAX_QUERY_COST_PER_MINUTE) {
      throw new UserVisibleError('Query rate limit exceeded. Please try again in a few minutes.')
    }
  } catch (error) {
    if (error instanceof UserVisibleError) {
      throw error
    }
    logger.warn(`Failed to apply rate limits (${error})`)
  }
}

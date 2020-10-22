const redis = require('redis')

const config = require('../config')
const { UserVisibleError } = require('../errors')
const logger = require('../logger')

const rateLimitDb = redis.createClient({
  url: config.RATE_LIMITER_REDIS_URL,
  retry_strategy:
    process.env.NODE_ENV === 'development'
      ? ({ attempt }) => {
          logger.info('Retrying connection to rate limit database')
          return Math.min(attempt * 100, 3000)
        }
      : ({ attempt }) => Math.min(attempt * 100, 3000),
})

const increaseRateLimitCounter = (key, value) => {
  return Promise.race([
    new Promise((resolve, reject) => {
      rateLimitDb
        .multi()
        .set([key, 0, 'EX', 59, 'NX'])
        .incrby(key, value)
        .exec((err, replies) => {
          if (err) {
            reject(err)
          } else {
            resolve(replies[1])
          }
        })
    }),
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Timed out'))
      }, 500)
    }),
  ])
}

const applyRateLimits = async (request) => {
  const rateLimitWindow = new Date().getMinutes()

  const clientId = request.ip

  try {
    const totalRequestsInWindow = await increaseRateLimitCounter(
      `rate_limit:1m:requests:${clientId}:${rateLimitWindow}`,
      1
    )

    if (totalRequestsInWindow > config.MAX_REQUESTS_PER_MINUTE) {
      throw new UserVisibleError('Query rate limit exceeded. Please try again in a few minutes.')
    }

    const totalCostInWindow = await increaseRateLimitCounter(
      `rate_limit:1m:cost:${clientId}:${rateLimitWindow}`,
      request.graphqlQueryCost || 0
    )

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

module.exports = { applyRateLimits }

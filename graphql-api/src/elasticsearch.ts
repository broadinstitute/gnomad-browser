import elasticsearch from '@elastic/elasticsearch'
import Bottleneck from 'bottleneck'
import { performance } from 'perf_hooks'
import config from './config'
import { UserVisibleError } from './errors'
import logger from './logger'
import { getRequestContext } from './request-context'

const elasticsearchConfig = {
  node: config.ELASTICSEARCH_URL,
  requestTimeout: config.ELASTICSEARCH_REQUEST_TIMEOUT,
  maxRetries: 0,
}

if (config.ELASTICSEARCH_USERNAME || config.ELASTICSEARCH_PASSWORD) {
  if (!(config.ELASTICSEARCH_USERNAME && config.ELASTICSEARCH_PASSWORD)) {
    throw Error(
      'Both ELASTICSEARCH_USERNAME and ELASTICSEARCH_PASSWORD are required if one is provided'
    )
  }

  // @ts-expect-error TS(2339) FIXME: Property 'auth' does not exist on type '{ node: an... Remove this comment to see the full error message
  elasticsearchConfig.auth = {
    username: config.ELASTICSEARCH_USERNAME,
    password: config.ELASTICSEARCH_PASSWORD,
  }
}

export const createUnlimitedElasticClient = () => new elasticsearch.Client(elasticsearchConfig)
const elastic = createUnlimitedElasticClient()

const esLimiter = new Bottleneck({
  maxConcurrent: config.MAX_CONCURRENT_ELASTICSEARCH_REQUESTS,
  highWater: config.MAX_QUEUED_ELASTICSEARCH_REQUESTS,
  strategy: Bottleneck.strategy.OVERFLOW,
})

esLimiter.on('error', (error: any) => {
  logger.error(error)
})

export const catchNotFound = (err: any) => {
  if (err?.meta?.body?.found === false) {
    return null
  }
  throw err
}

const scheduleElasticsearchRequest = (fn: any, operation: string) => {
  const ctx = getRequestContext()
  const queuedAt = performance.now()
  let canceled = false

  // If task sits in the queue for more than 30s, cancel it and notify the user.
  const timeout = setTimeout(() => {
    canceled = true

    logger.warn({
      requestId: ctx?.requestId,
      event: 'esRequestQueueTimeout',
      operation,
      queueMs: performance.now() - queuedAt,
    })
  }, config.ELASTICSEARCH_QUEUE_TIMEOUT)

  return esLimiter
    .schedule(() => {
      const startedAt = performance.now()

      clearTimeout(timeout)

      if (canceled) {
        return Promise.resolve(undefined)
      }
      logger.info({
        requestId: ctx?.requestId,
        event: 'esRequestStart',
        operation,
        startedAtMs: startedAt,
      })
      return fn()
        .then((result: any) => {
          logger.info({
            requestId: ctx?.requestId,
            event: 'esRequestEnd',
            operation,
            queueMs: startedAt - queuedAt,
            executionMs: performance.now() - startedAt,
            totalMs: performance.now() - queuedAt,
          })

          return result
        })
        .catch((error: any) => {
          logger.error({
            requestId: ctx?.requestId,
            event: 'esRequestError',
            operation,
            queueMs: startedAt - queuedAt,
            executionMs: performance.now() - startedAt,
            totalMs: performance.now() - queuedAt,
            error,
          })

          throw error
        })
    })
    .then(
      (result: any) => result,
      (err: any) => {
        clearTimeout(timeout)

        if (err?.message === 'This job has been dropped by Bottleneck') {
          logger.warn({
            requestId: ctx?.requestId,
            event: 'esRequestDropped',
            operation,
            queueMs: performance.now() - queuedAt,
          })

          throw new UserVisibleError('Service overloaded')
        }

        throw err
      }
    )
}

// This wraps the ES methods used by the API and sends them through the rate limiter
const limitedElastic = {
  indices: elastic.indices,
  clearScroll: elastic.clearScroll.bind(elastic),
  search: (...args: Parameters<typeof elastic.search>) =>
    scheduleElasticsearchRequest(() => elastic.search(...args), 'search').then((response) => {
      if (response.body.timed_out) {
        throw new Error('Elasticsearch search timed out')
      }
      // eslint-disable-next-line no-underscore-dangle
      if (response.body._shards.successful < response.body._shards.total) {
        throw new Error('Elasticsearch search partially failed')
      }
      return response
    }),
  scroll: (...args: Parameters<typeof elastic.scroll>) =>
    scheduleElasticsearchRequest(() => elastic.scroll(...args), 'scroll').then((response) => {
      if (response.body.timed_out) {
        throw new Error('Elasticsearch scroll timed out')
      }
      // eslint-disable-next-line no-underscore-dangle
      if (response.body._shards.successful < response.body._shards.total) {
        throw new Error('Elasticsearch scroll partially failed')
      }
      return response
    }),
  count: (...args: Parameters<typeof elastic.count>) =>
    scheduleElasticsearchRequest(() => elastic.count(...args), 'count').then((response) => {
      // eslint-disable-next-line no-underscore-dangle
      if (response.body._shards.successful < response.body._shards.total) {
        throw new Error('Elasticsearch count partially failed')
      }
      return response
    }),
  get: (...args: Parameters<typeof elastic.get>) =>
    scheduleElasticsearchRequest(() => elastic.get(...args), 'get'),
  mget: (...args: Parameters<typeof elastic.mget>) =>
    scheduleElasticsearchRequest(() => elastic.mget(...args), 'mget'),
}

export { limitedElastic as client }

import elasticsearch from '@elastic/elasticsearch'
import Bottleneck from 'bottleneck'
import config from './config'

import { UserVisibleError } from './errors'
import logger from './logger'

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

const scheduleElasticsearchRequest = (
  fn: any,
  label = 'elasticsearch',
) => {
  return new Promise((resolve, reject) => {
    let canceled = false

    const queuedAt = Date.now()

    logger.info({
      label,
      event: 'es_request_queued',
      queuedAt,
    })

    const timeout = setTimeout(() => {
      canceled = true
      logger.warn({
        label,
        event: 'es_request_queue_timeout',
      })
      reject(new UserVisibleError('Request timed out'))
    }, config.ELASTICSEARCH_QUEUE_TIMEOUT)

    esLimiter
      .schedule(async () => {
        const startExec = Date.now()
        const queueWait = startExec - queuedAt

        logger.info({
          label,
          event: 'es_request_started',
          queuedAt,
          startExec,
          queueWait,
        })

        clearTimeout(timeout)

        if (canceled) {
          return Promise.resolve(undefined)
        }

        try {
          const result = await fn()

          const endExec = Date.now()

          logger.info({
            label,
            event: 'es_request_finished',
            startExec,
            endExec,
            duration: endExec - startExec,
          })

          return result
        } catch (err) {
          const endExec = Date.now()

          logger.error({
            label,
            event: 'es_request_failed',
            startExec,
            endExec,
            duration: endExec - startExec,
            error: err,
          })

          throw err
        }
      })
      .then(resolve, (err: any) => {
        if (err.message === 'This job has been dropped by Bottleneck') {
          clearTimeout(timeout)
          logger.warn({
            label,
            event: 'es_request_dropped',
          })
          reject(new UserVisibleError('Service overloaded'))
        }

        reject(err)
      })
  })
}

// This wraps the ES methods used by the API and sends them through the rate limiter
const limitedElastic = {
  indices: elastic.indices,
  clearScroll: elastic.clearScroll.bind(elastic),
  search: (...args: Parameters<typeof elastic.search>) =>
    scheduleElasticsearchRequest(() => elastic.search(...args), 'search').then((response) => {
      // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
      if (response.body.timed_out) {
        throw new Error('Elasticsearch search timed out')
      }
      // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
      // eslint-disable-next-line no-underscore-dangle
      if (response.body._shards.successful < response.body._shards.total) {
        throw new Error('Elasticsearch search partially failed')
      }
      return response
    }),
  scroll: (...args: Parameters<typeof elastic.scroll>) =>
    scheduleElasticsearchRequest(() => elastic.scroll(...args), 'scroll').then((response) => {
      // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
      if (response.body.timed_out) {
        throw new Error('Elasticsearch scroll timed out')
      }
      // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
      // eslint-disable-next-line no-underscore-dangle
      if (response.body._shards.successful < response.body._shards.total) {
        throw new Error('Elasticsearch scroll partially failed')
      }
      return response
    }),
  count: (...args: Parameters<typeof elastic.count>) =>
    scheduleElasticsearchRequest(() => elastic.count(...args), 'count').then((response) => {
      // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
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

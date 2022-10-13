const elasticsearch = require('@elastic/elasticsearch')
const Bottleneck = require('bottleneck')

const config = require('./config')
const { UserVisibleError } = require('./errors')
const logger = require('./logger')

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

  elasticsearchConfig.auth = {
    username: config.ELASTICSEARCH_USERNAME,
    password: config.ELASTICSEARCH_PASSWORD,
  }
}

const elastic = new elasticsearch.Client(elasticsearchConfig)

const esLimiter = new Bottleneck({
  maxConcurrent: config.MAX_CONCURRENT_ELASTICSEARCH_REQUESTS,
  highWater: config.MAX_QUEUED_ELASTICSEARCH_REQUESTS,
  strategy: Bottleneck.strategy.OVERFLOW,
})

esLimiter.on('error', (error) => {
  logger.error(error)
})

const scheduleElasticsearchRequest = (fn) => {
  return new Promise((resolve, reject) => {
    let canceled = false

    // If task sits in the queue for more than 30s, cancel it and notify the user.
    const timeout = setTimeout(() => {
      canceled = true
      logger.warn('Elasticsearch request timed out in queue')
      reject(new UserVisibleError('Request timed out'))
    }, config.ELASTICSEARCH_QUEUE_TIMEOUT)

    esLimiter
      .schedule(() => {
        // When the request is taken out of the queue...

        // Cancel timeout timer.
        clearTimeout(timeout)

        // If the timeout has expired since the request was queued, do nothing.
        if (canceled) {
          return Promise.resolve(undefined)
        }

        // Otherwise, make the request.
        return fn()
      })
      .then(resolve, (err) => {
        // If Bottleneck refuses to schedule the request because the queue is full,
        // notify the user and cancel the timeout timer.
        if (err.message === 'This job has been dropped by Bottleneck') {
          clearTimeout(timeout)
          logger.warn('Elasticsearch request dropped')
          reject(new UserVisibleError('Service overloaded'))
        }

        // Otherwise, forward the error.
        reject(err)
      })
  })
}

// This wraps the ES methods used by the API and sends them through the rate limiter
const limitedElastic = {
  indices: elastic.indices,
  clearScroll: elastic.clearScroll.bind(elastic),
  search: (...args) =>
    scheduleElasticsearchRequest(() => elastic.search(...args)).then((response) => {
      if (response.body.timed_out) {
        throw new Error('Elasticsearch search timed out')
      }
      // eslint-disable-next-line no-underscore-dangle
      if (response.body._shards.successful < response.body._shards.total) {
        throw new Error('Elasticsearch search partially failed')
      }
      return response
    }),
  scroll: (...args) =>
    scheduleElasticsearchRequest(() => elastic.scroll(...args)).then((response) => {
      if (response.body.timed_out) {
        throw new Error('Elasticsearch scroll timed out')
      }
      // eslint-disable-next-line no-underscore-dangle
      if (response.body._shards.successful < response.body._shards.total) {
        throw new Error('Elasticsearch scroll partially failed')
      }
      return response
    }),
  count: (...args) =>
    scheduleElasticsearchRequest(() => elastic.count(...args)).then((response) => {
      // eslint-disable-next-line no-underscore-dangle
      if (response.body._shards.successful < response.body._shards.total) {
        throw new Error('Elasticsearch count partially failed')
      }
      return response
    }),
  get: (...args) => scheduleElasticsearchRequest(() => elastic.get(...args)),
  mget: (...args) => scheduleElasticsearchRequest(() => elastic.mget(...args)),
}

module.exports = {
  client: limitedElastic,
}

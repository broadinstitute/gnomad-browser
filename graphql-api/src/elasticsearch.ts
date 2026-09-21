import elasticsearch from '@elastic/elasticsearch'
import Bottleneck from 'bottleneck'

import config from './config'
import createLimitedElasticsearchClient from './limited-elasticsearch-client'
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

const limitedElastic = createLimitedElasticsearchClient(
  elastic,
  esLimiter,
  config.ELASTICSEARCH_QUEUE_TIMEOUT
)

export { limitedElastic as client }

export const closeClient = () => elastic.close()

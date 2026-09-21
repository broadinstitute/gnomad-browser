import type elasticsearch from '@elastic/elasticsearch'
import type Bottleneck from 'bottleneck'
import { performance } from 'perf_hooks'

import { UserVisibleError } from './errors'
import logger from './logger'
import { getRequestContext } from './request-context'

interface LimitedElasticsearchClient {
  indices: elasticsearch.Client['indices']
  clearScroll: elasticsearch.Client['clearScroll']
  search: (...args: Parameters<elasticsearch.Client['search']>) => Promise<any>
  scroll: (...args: Parameters<elasticsearch.Client['scroll']>) => Promise<any>
  count: (...args: Parameters<elasticsearch.Client['count']>) => Promise<any>
  get: (...args: Parameters<elasticsearch.Client['get']>) => Promise<any>
  mget: (...args: Parameters<elasticsearch.Client['mget']>) => Promise<any>
}

const createLimitedElasticsearchClient = (
  rawClient: elasticsearch.Client,
  limiter: Bottleneck,
  queueTimeoutMs: number
): LimitedElasticsearchClient => {
  const scheduleElasticsearchRequest = (fn: any, operation: string) => {
    const ctx = getRequestContext()
    const queuedAt = performance.now()
    let canceled = false

    // Reject the returned promise directly so timed-out work does not wait to be dequeued.
    let rejectQueue!: (reason?: any) => void
    const queueTimeout = new Promise<never>((_resolve, reject) => {
      rejectQueue = reject
    })
    const timeout = setTimeout(() => {
      canceled = true

      logger.warn({
        requestId: ctx?.requestId,
        event: 'esRequestQueueTimeout',
        operation,
        queueMs: performance.now() - queuedAt,
      })

      rejectQueue(new UserVisibleError('Request timed out'))
    }, queueTimeoutMs)

    const scheduled = limiter
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

    return Promise.race([scheduled, queueTimeout])
  }

  return {
    indices: rawClient.indices,
    clearScroll: rawClient.clearScroll.bind(rawClient),
    search: (...args: Parameters<typeof rawClient.search>) =>
      scheduleElasticsearchRequest(() => rawClient.search(...args), 'search').then((response) => {
        if (response.body.timed_out) {
          throw new Error('Elasticsearch search timed out')
        }
        // eslint-disable-next-line no-underscore-dangle
        if (response.body._shards.successful < response.body._shards.total) {
          throw new Error('Elasticsearch search partially failed')
        }
        return response
      }),
    scroll: (...args: Parameters<typeof rawClient.scroll>) =>
      scheduleElasticsearchRequest(() => rawClient.scroll(...args), 'scroll').then((response) => {
        if (response.body.timed_out) {
          throw new Error('Elasticsearch scroll timed out')
        }
        // eslint-disable-next-line no-underscore-dangle
        if (response.body._shards.successful < response.body._shards.total) {
          throw new Error('Elasticsearch scroll partially failed')
        }
        return response
      }),
    count: (...args: Parameters<typeof rawClient.count>) =>
      scheduleElasticsearchRequest(() => rawClient.count(...args), 'count').then((response) => {
        // eslint-disable-next-line no-underscore-dangle
        if (response.body._shards.successful < response.body._shards.total) {
          throw new Error('Elasticsearch count partially failed')
        }
        return response
      }),
    get: (...args: Parameters<typeof rawClient.get>) =>
      scheduleElasticsearchRequest(() => rawClient.get(...args), 'get'),
    mget: (...args: Parameters<typeof rawClient.mget>) =>
      scheduleElasticsearchRequest(() => rawClient.mget(...args), 'mget'),
  }
}

export default createLimitedElasticsearchClient

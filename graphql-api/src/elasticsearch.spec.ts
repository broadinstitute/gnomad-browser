import { describe, expect, jest, test } from '@jest/globals'

import { UserVisibleError } from './errors'
import logger from './logger'

jest.mock('./config', () => ({
  ELASTICSEARCH_URL: undefined,
  ELASTICSEARCH_USERNAME: 'unused-user',
  ELASTICSEARCH_PASSWORD: undefined,
  MAX_CONCURRENT_ELASTICSEARCH_REQUESTS: 1,
  MAX_QUEUED_ELASTICSEARCH_REQUESTS: 1,
  PARQUET_ONLY: true,
}))
jest.mock('./logger', () => ({ warn: jest.fn(), error: jest.fn() }))
jest.mock('./request-context', () => ({ getRequestContext: () => ({ requestId: 'request-1' }) }))

describe('Elasticsearch client in Parquet-only mode', () => {
  test('loads without Elasticsearch credentials', async () => {
    await expect(import('./elasticsearch')).resolves.toBeDefined()
  })

  test.each(['search', 'scroll', 'count', 'get', 'mget', 'clearScroll'] as const)(
    'rejects %s with a user-visible error and logs the operation',
    async (operation) => {
      const { client } = await import('./elasticsearch')

      await expect(client[operation]({} as never)).rejects.toThrow(UserVisibleError)
      expect(logger.warn).toHaveBeenCalledWith({
        requestId: 'request-1',
        event: 'esDisabledOperation',
        operation,
      })
    }
  )

  test('rejects index mapping lookups', async () => {
    const { client } = await import('./elasticsearch')

    await expect(client.indices.getMapping({} as never)).rejects.toThrow(UserVisibleError)
  })

  test('closes without contacting Elasticsearch', async () => {
    const { closeClient } = await import('./elasticsearch')

    await expect(closeClient()).resolves.toBeUndefined()
  })
})

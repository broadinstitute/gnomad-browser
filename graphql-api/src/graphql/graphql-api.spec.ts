/* eslint-disable import/first */
import { jest } from '@jest/globals'

const mockLoggerError = jest.fn()
jest.mock('../config', () => ({
  __esModule: true,
  default: {
    MAX_QUERY_COST: 10_000,
    REDIS_HOST: undefined,
    JSON_CACHE_ENABLE_ALL: false,
    JSON_CACHE_LARGE_GENES: false,
  },
}))
jest.mock('express-graphql', () => ({
  graphqlHTTP: (options: unknown) => options,
}))
jest.mock('./schema', () => ({
  __esModule: true,
  default: {},
}))
jest.mock('./rate-limiting', () => ({ applyRateLimits: jest.fn() }))
jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    error: (...args: any[]) => mockLoggerError(...args),
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

import { GraphQLError } from 'graphql'

import graphQLApi, { formatErrorAndSetNocache, recordGraphqlQueryCost } from './graphql-api'
import { joinedMethylationError } from './joined-phased-methylation-errors'

const request = {
  method: 'POST',
  protocol: 'https',
  hostname: 'example.test',
  originalUrl: '/api',
  headers: {},
  ip: '127.0.0.1',
  httpVersionMajor: 1,
  httpVersionMinor: 1,
}

const format = (error: GraphQLError) => {
  const response = { set: jest.fn() }
  const formatted = formatErrorAndSetNocache(error, request, { query: 'query' }, response)
  expect(response.set).toHaveBeenCalledWith('Cache-Control', 'no-store')
  return formatted as any
}

describe('production GraphQL joined methylation error formatting', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = 'production'
    mockLoggerError.mockReset()
  })

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  test.each(['BAD_USER_INPUT', 'JOINED_METHYLATION_RESULT_TOO_LARGE'] as const)(
    'preserves routine safe client code %s without logging',
    (code) => {
      const error = joinedMethylationError(code, 'Safe joined methylation message')
      ;(error.extensions as any).private_query_detail = 'do not expose'
      const formatted = format(error)
      expect(formatted.message).toBe('Safe joined methylation message')
      expect(formatted.extensions).toEqual({ code })
      expect(mockLoggerError).not.toHaveBeenCalled()
    }
  )

  test('masks and logs internal joined contract mismatches with safe receipt/run evidence', () => {
    const error = joinedMethylationError(
      'JOINED_METHYLATION_CONTRACT_MISMATCH',
      'private row detail stable_key=secret',
      {
        reason: 'duplicate_biological_observation',
        source_run_id: 'source-run',
        orientation_receipt_sha256: 'a'.repeat(64),
        chrom: 'chr22',
        start: 100,
        stop: 200,
      }
    )
    ;(error.extensions as any).private_query_detail = 'SELECT secret'
    const formatted = format(error)
    expect(formatted.message).toBe('Joined methylation contract mismatch')
    expect(formatted.extensions).toEqual({ code: 'JOINED_METHYLATION_CONTRACT_MISMATCH' })
    expect(JSON.stringify(formatted)).not.toContain('secret')
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Joined methylation contract mismatch',
        context: expect.objectContaining({
          joinedMethylation: expect.objectContaining({
            reason: 'duplicate_biological_observation',
            source_run_id: 'source-run',
            orientation_receipt_sha256: 'a'.repeat(64),
          }),
        }),
      })
    )
    expect(JSON.stringify(mockLoggerError.mock.calls)).not.toContain('SELECT secret')
  })

  test('allocates separate request contexts while retaining shared dependency clients', async () => {
    const applicationContext = { esClient: {} }
    const optionsForRequest = graphQLApi({ context: applicationContext }) as any
    const first = await optionsForRequest({}, {}, {})
    const second = await optionsForRequest({}, {}, {})
    expect(first.context).not.toBe(applicationContext)
    expect(first.context).not.toBe(second.context)
    expect(first.context.esClient).toBe(applicationContext.esClient)
    expect(second.context.esClient).toBe(applicationContext.esClient)
    first.context._lrTimings = ['request one only']
    expect(second.context._lrTimings).toBeUndefined()
    expect(applicationContext).not.toHaveProperty('_lrTimings')
  })

  test('records validated query cost on the request used by rate accounting', () => {
    const costedRequest: any = {}
    const params = { query: '{ joined_phased_methylation_region }' }
    recordGraphqlQueryCost(costedRequest, params, 25)
    expect(costedRequest).toMatchObject({ graphqlQueryCost: 25, graphqlParams: params })
  })

  test.each(['UNAPPROVED_INTERNAL_CODE', 'BAD_USER_INPUT'])(
    'keeps internal failures opaque for unapproved error shape %s',
    (code) => {
      const internal = new GraphQLError(
        'private ClickHouse failure',
        undefined,
        undefined,
        undefined,
        ['joined_phased_methylation_region'],
        new Error('socket and query details'),
        { code, private_detail: 'secret' }
      )
      expect(format(internal)).toEqual({ message: 'An unknown error occurred' })
      expect(mockLoggerError).toHaveBeenCalledTimes(1)
      mockLoggerError.mockReset()
    }
  )
})

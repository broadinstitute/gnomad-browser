import { UserVisibleError } from '../errors'
import logger from '../logger'
import { isWhitelistedIP } from '../whitelist'
import { applyRateLimits } from './rate-limiting'

const mockSet = jest.fn().mockReturnThis()
const mockIncrement = jest.fn().mockReturnThis()
const mockExec = jest.fn()

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    multi: () => ({ set: mockSet, incrby: mockIncrement, exec: mockExec }),
  })),
}))

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    REDIS_HOST: 'redis.test',
    REDIS_PORT: 6379,
    MAX_REQUESTS_PER_MINUTE: 30,
    MAX_QUERY_COST_PER_MINUTE: 300,
  },
}))

jest.mock('../logger', () => ({ __esModule: true, default: { warn: jest.fn() } }))
jest.mock('../whitelist', () => ({ isWhitelistedIP: jest.fn() }))

type TransactionReply = [Error | null, unknown][] | null

const queueReply = (replies: TransactionReply, error: Error | null = null) => {
  mockExec.mockImplementationOnce((callback) => callback(error, replies))
}

const queueCounter = (count: number) =>
  queueReply([
    [null, 'OK'],
    [null, count],
  ])
const request = { ip: '192.0.2.1', graphqlQueryCost: 25 }
const limitMessage = 'Query rate limit exceeded. Please try again in a few minutes.'

describe('applyRateLimits', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 8, 17, 18, 12))
    jest.clearAllMocks()
    mockExec.mockReset()
    mockExec.mockImplementation((callback) =>
      callback(null, [
        [null, 'OK'],
        [null, 0],
      ])
    )
    jest.mocked(isWhitelistedIP).mockReturnValue(false)
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  test.each([
    [1, 25],
    [30, 300],
  ])('allows request/cost counters %i/%i, including the exact limits', async (requests, cost) => {
    queueCounter(requests)
    queueCounter(cost)

    await expect(applyRateLimits(request)).resolves.toBeUndefined()

    expect(mockIncrement).toHaveBeenNthCalledWith(1, 'rate_limit:1m:requests:192.0.2.1:12', 1)
    expect(mockIncrement).toHaveBeenNthCalledWith(2, 'rate_limit:1m:cost:192.0.2.1:12', 25)
    expect(mockSet).toHaveBeenCalledWith('rate_limit:1m:requests:192.0.2.1:12', 0, 'EX', 59, 'NX')
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('rejects a request counter above the limit before incrementing query cost', async () => {
    queueCounter(31)

    await expect(applyRateLimits(request)).rejects.toEqual(new UserVisibleError(limitMessage))

    expect(mockExec).toHaveBeenCalledTimes(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('rejects a query cost counter above the limit', async () => {
    queueCounter(1)
    queueCounter(301)

    await expect(applyRateLimits(request)).rejects.toEqual(new UserVisibleError(limitMessage))

    expect(mockExec).toHaveBeenCalledTimes(2)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('accepts a null SET NX result when the counter already exists', async () => {
    queueReply([
      [null, null],
      [null, 31],
    ])

    await expect(applyRateLimits(request)).rejects.toEqual(new UserVisibleError(limitMessage))
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('preserves the whitelist bypass', async () => {
    jest.mocked(isWhitelistedIP).mockReturnValue(true)

    await expect(applyRateLimits(request)).resolves.toBeUndefined()

    expect(isWhitelistedIP).toHaveBeenCalledWith(request.ip)
    expect(mockExec).not.toHaveBeenCalled()
  })

  test.each(['SET', 'INCRBY'])(
    'warns and preserves fail-open behavior for a %s command error',
    async (command) => {
      const error = new Error(`${command} failed`)
      queueReply(
        command === 'SET'
          ? [
              [error, null],
              [null, 9999],
            ]
          : [
              [null, 'OK'],
              [error, null],
            ]
      )

      await expect(applyRateLimits(request)).resolves.toBeUndefined()

      expect(logger.warn).toHaveBeenCalledWith(`Failed to apply rate limits (${error})`)
      expect(mockExec).toHaveBeenCalledTimes(1)
    }
  )

  test('warns and preserves fail-open behavior for a transaction error', async () => {
    const error = new Error('Redis unavailable')
    queueReply(null, error)

    await expect(applyRateLimits(request)).resolves.toBeUndefined()

    expect(logger.warn).toHaveBeenCalledWith(`Failed to apply rate limits (${error})`)
  })

  test.each<{ description: string; replies: TransactionReply }>([
    { description: 'aborted transaction', replies: null },
    { description: 'empty transaction', replies: [] },
    { description: 'missing INCRBY result', replies: [[null, 'OK']] },
  ])('warns for incomplete transaction replies: $description', async ({ replies }) => {
    queueReply(replies)

    await expect(applyRateLimits(request)).resolves.toBeUndefined()

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to apply rate limits (Error: Invalid Redis rate limit transaction result)'
    )
    expect(mockExec).toHaveBeenCalledTimes(1)
  })

  test.each(['31', undefined, null, NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'warns rather than comparing an invalid counter: %s',
    async (count) => {
      queueReply([
        [null, 'OK'],
        [null, count],
      ])

      await expect(applyRateLimits(request)).resolves.toBeUndefined()

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to apply rate limits (Error: Invalid Redis rate limit counter)'
      )
      expect(mockExec).toHaveBeenCalledTimes(1)
    }
  )

  test('warns and preserves fail-open behavior when Redis times out', async () => {
    mockExec.mockImplementation(() => undefined)
    const result = applyRateLimits(request)
    await jest.advanceTimersByTimeAsync(500)

    await expect(result).resolves.toBeUndefined()

    expect(logger.warn).toHaveBeenCalledWith('Failed to apply rate limits (Error: Timed out)')
  })
})

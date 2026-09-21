import express from 'express'
import http, { Server } from 'http'

import createApp from './create-app'
import logger from './logger'
import {
  cancelRequest,
  getRequestAbortSignal,
  RequestCanceledError,
  RequestContext,
  requestStore,
} from './request-context'

jest.mock('./config', () => ({
  __esModule: true,
  default: { GCP_PROJECT: '', TRUST_PROXY: false },
}))

interface Deferred<Value> {
  promise: Promise<Value>
  resolve: (value: Value) => void
}

const createDeferred = <Value>(): Deferred<Value> => {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const createRequestContext = (): RequestContext => ({
  requestId: 'request-id',
  startAt: 0,
  startCpu: { system: 0, user: 0 },
  startHeapUsed: 0,
  trace: null,
  abortController: new AbortController(),
  cancellationReason: null,
  canceledAt: null,
})

const listen = async (middleware: express.RequestHandler) => {
  const app = createApp({
    elasticsearchClient: {},
    graphQLApi: () => middleware,
  })
  const server = app.listen(0)
  await new Promise<void>((resolve) => {
    server.once('listening', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected the test server to listen on a TCP port')
  }
  return { port: address.port, server }
}

const request = (port: number) =>
  new Promise<void>((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', path: '/api/', port }, (response) => {
        response.resume()
        response.once('end', resolve)
      })
      .once('error', reject)
  })

describe('request cancellation lifecycle', () => {
  let server: Server | undefined

  afterEach(async () => {
    jest.restoreAllMocks()
    if (server) {
      const activeServer = server
      await new Promise<void>((resolve, reject) => {
        activeServer.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      })
      server = undefined
    }
  })

  test('closing the client connection aborts its request context', async () => {
    const signalReceived = createDeferred<AbortSignal>()
    const listening = await listen((_request, _response) => {
      const signal = getRequestAbortSignal()
      if (!signal) throw new Error('Expected a request abort signal')
      signalReceived.resolve(signal)
    })
    server = listening.server

    const clientRequest = http.get({ host: '127.0.0.1', path: '/api/', port: listening.port })
    clientRequest.once('error', () => undefined)
    const signal = await signalReceived.promise
    const aborted = new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve(), { once: true })
    })

    clientRequest.destroy()
    await aborted

    expect(signal.aborted).toBe(true)
    expect(signal.reason).toEqual(new RequestCanceledError('client-disconnected'))
  })

  test('finishing a response does not abort its request context', async () => {
    const signalReceived = createDeferred<AbortSignal>()
    const responseClosed = createDeferred<void>()
    const listening = await listen((_request, response) => {
      const signal = getRequestAbortSignal()
      if (!signal) throw new Error('Expected a request abort signal')
      signalReceived.resolve(signal)
      response.once('close', () => responseClosed.resolve())
      response.send('ok')
    })
    server = listening.server

    await request(listening.port)
    await responseClosed.promise

    expect((await signalReceived.promise).aborted).toBe(false)
  })

  test('the first cancellation reason is retained', () => {
    const context = createRequestContext()

    requestStore.run(context, () => {
      expect(cancelRequest('client-disconnected')).toBe(true)
      const canceledAt = context.canceledAt

      expect(cancelRequest('deadline-exceeded')).toBe(false)
      expect(context.cancellationReason).toBe('client-disconnected')
      expect(context.canceledAt).toBe(canceledAt)
      expect(context.abortController.signal.reason).toEqual(
        new RequestCanceledError('client-disconnected')
      )
    })
  })

  test('closing the client connection emits one requestClientDisconnected event', async () => {
    const logInfo = jest.spyOn(logger, 'info').mockImplementation(() => undefined)
    const signalReceived = createDeferred<AbortSignal>()
    const listening = await listen((_request, _response) => {
      const signal = getRequestAbortSignal()
      if (!signal) throw new Error('Expected a request abort signal')
      signalReceived.resolve(signal)
    })
    server = listening.server

    const clientRequest = http.get({ host: '127.0.0.1', path: '/api/', port: listening.port })
    clientRequest.once('error', () => undefined)
    const signal = await signalReceived.promise
    const aborted = new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve(), { once: true })
    })

    clientRequest.destroy()
    await aborted

    const disconnectEvents = logInfo.mock.calls
      .map(([entry]) => entry)
      .filter((entry) => entry.event === 'requestClientDisconnected')
    expect(disconnectEvents).toHaveLength(1)
    expect(disconnectEvents[0]).toEqual(
      expect.objectContaining({
        requestId: expect.any(String),
        event: 'requestClientDisconnected',
        reason: 'client-disconnected',
        latencyMs: expect.any(Number),
      })
    )
  })
})

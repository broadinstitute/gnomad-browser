import http from 'http'
import elasticsearch from '@elastic/elasticsearch'

import { coalesceRequestHeaders, createCloudRunAuthTransport } from './elasticsearchCloudRunAuth'

const listen = (server: http.Server) =>
  new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

const close = (server: http.Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })

describe('Cloud Run Elasticsearch authentication', () => {
  let server: http.Server
  let url: string
  let receivedAuthorization: (string | undefined)[]
  let clients: elasticsearch.Client[]

  beforeEach(async () => {
    receivedAuthorization = []
    clients = []
    server = http.createServer((request, response) => {
      receivedAuthorization.push(request.headers.authorization)
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end('{}')
    })
    await listen(server)
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind a TCP port')
    }
    url = `http://127.0.0.1:${address.port}`
  })

  afterEach(async () => {
    await Promise.all(clients.map((client) => client.close()))
    await close(server)
  })

  const createClient = (getRequestHeaders: () => Promise<Record<string, string>>) => {
    const client = new elasticsearch.Client({
      node: url,
      maxRetries: 0,
      Transport: createCloudRunAuthTransport(coalesceRequestHeaders(getRequestHeaders)),
    })
    clients.push(client)
    return client
  }

  test('uses refreshed identity token headers on later requests', async () => {
    const getRequestHeaders = jest
      .fn()
      .mockResolvedValueOnce({ Authorization: 'Bearer token-1' })
      .mockResolvedValueOnce({ Authorization: 'Bearer token-2' })
    const client = createClient(getRequestHeaders)

    await client.info({}, { headers: { Authorization: 'Bearer stale-value' } })
    await client.info()

    expect(getRequestHeaders).toHaveBeenCalledTimes(2)
    expect(receivedAuthorization).toEqual(['Bearer token-1', 'Bearer token-2'])
  })

  test('coalesces concurrent token refresh checks', async () => {
    let resolveHeaders: (headers: Record<string, string>) => void = () => {}
    const getRequestHeaders = jest.fn(
      () =>
        new Promise<Record<string, string>>((resolve) => {
          resolveHeaders = resolve
        })
    )
    const client = createClient(getRequestHeaders)

    const requests = [client.info(), client.info()]
    await Promise.resolve()
    expect(getRequestHeaders).toHaveBeenCalledTimes(1)

    resolveHeaders({ Authorization: 'Bearer shared-token' })
    await Promise.all(requests)

    expect(receivedAuthorization).toEqual(['Bearer shared-token', 'Bearer shared-token'])
  })

  test('propagates token refresh failure and retries authentication on the next request', async () => {
    const refreshError = new Error('metadata server unavailable')
    const getRequestHeaders = jest
      .fn()
      .mockRejectedValueOnce(refreshError)
      .mockResolvedValueOnce({ Authorization: 'Bearer recovered-token' })
    const client = createClient(getRequestHeaders)

    await expect(client.info()).rejects.toBe(refreshError)
    expect(receivedAuthorization).toEqual([])

    await client.info()
    expect(getRequestHeaders).toHaveBeenCalledTimes(2)
    expect(receivedAuthorization).toEqual(['Bearer recovered-token'])
  })
})

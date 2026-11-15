import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import express from 'express'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import type { Server } from 'http'
import type { AddressInfo } from 'net'
import { tmpdir } from 'os'
import path from 'path'
import { gzipSync } from 'zlib'

import logger from './logger'
import {
  StaticResponseRequest,
  createStaticResponseMiddleware,
  staticResponsePath,
} from './static-responses'

jest.mock('./logger', () => ({ info: jest.fn(), warn: jest.fn() }))

const geneRequest: StaticResponseRequest = {
  operationName: 'VariantsInGene',
  query: 'query VariantsInGene($geneId: String!) { gene(gene_id: $geneId) { gene_id } }',
  variables: { geneId: 'ENSG00000012048', datasetId: 'gnomad_r4', referenceGenome: 'GRCh38' },
}

const storedBody = '{"data":{"gene":{"gene_id":"ENSG00000012048"}}}\n'

let directory: string
let server: Server
let baseUrl: string
let loggedGraphqlParams: Promise<unknown>

const writeStoredResponse = (request: StaticResponseRequest, body: string) => {
  const filePath = staticResponsePath(directory, request)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, gzipSync(body))
}

const post = (body: unknown, acceptEncoding = 'gzip') =>
  fetch(`${baseUrl}/api/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Encoding': acceptEncoding },
    body: JSON.stringify(body),
  })

beforeEach(async () => {
  jest.clearAllMocks()
  directory = mkdtempSync(path.join(tmpdir(), 'static-responses-'))

  const app = express()
  app.use(express.json())
  app.use((request, response, next) => {
    loggedGraphqlParams = new Promise((resolve) => {
      response.on('finish', () => resolve((request as any).graphqlParams))
    })
    next()
  })
  app.use('/api/', createStaticResponseMiddleware(directory))
  app.use('/api/', (_request, response) => {
    response.json({ fellThrough: true })
  })

  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve)
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterEach(async () => {
  server.closeAllConnections()
  await new Promise((resolve) => {
    server.close(resolve)
  })
  rmSync(directory, { recursive: true, force: true })
})

describe('stored gene page responses', () => {
  test('serves the stored gzip file as is to clients that accept gzip', async () => {
    writeStoredResponse(geneRequest, storedBody)

    const response = await post(geneRequest)

    expect(response.headers.get('content-encoding')).toBe('gzip')
    expect(response.headers.get('content-length')).toBe(String(gzipSync(storedBody).length))
    expect(await response.text()).toBe(storedBody)
    expect(response.headers.get('x-static-response')).toBe('hit')
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
  })

  test('decompresses for clients that do not accept gzip', async () => {
    writeStoredResponse(geneRequest, storedBody)

    const response = await post(geneRequest, 'identity')

    expect(response.headers.get('content-encoding')).toBeNull()
    expect(await response.text()).toBe(storedBody)
  })

  test('exposes the GraphQL parameters to request logging and logs the hit', async () => {
    writeStoredResponse(geneRequest, storedBody)

    await (await post(geneRequest)).text()

    expect(await loggedGraphqlParams).toEqual(geneRequest)
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'staticResponseHit', operationName: 'VariantsInGene' })
    )
  })

  test('matches variables regardless of key order', async () => {
    writeStoredResponse(geneRequest, storedBody)

    const response = await post({
      ...geneRequest,
      variables: { referenceGenome: 'GRCh38', datasetId: 'gnomad_r4', geneId: 'ENSG00000012048' },
    })

    expect(await response.text()).toBe(storedBody)
  })

  test.each([
    ['no stored file', geneRequest],
    ['different variables', { ...geneRequest, variables: { geneId: 'ENSG00000011295' } }],
    ['different query text', { ...geneRequest, query: `${geneRequest.query} ` }],
  ])('falls through to GraphQL for %s', async (_label, request) => {
    writeStoredResponse(
      { ...geneRequest, variables: { ...geneRequest.variables, datasetId: 'other' } },
      storedBody
    )

    const response = await post(request)

    expect(await response.json()).toEqual({ fellThrough: true })
    expect(response.headers.get('x-static-response')).toBeNull()
  })

  test('falls through for operations that are not allow-listed, even with a file at their key', async () => {
    const otherRequest = { ...geneRequest, operationName: 'VariantInRegion' }
    writeStoredResponse(otherRequest, storedBody)

    const response = await post(otherRequest)

    expect(await response.json()).toEqual({ fellThrough: true })
  })

  test('falls through when the key is not a readable file', async () => {
    mkdirSync(staticResponsePath(directory, geneRequest), { recursive: true })

    const response = await post(geneRequest)

    expect(await response.json()).toEqual({ fellThrough: true })
  })

  test('ignores GET requests', async () => {
    writeStoredResponse(geneRequest, storedBody)

    const response = await fetch(`${baseUrl}/api/?query=${encodeURIComponent(geneRequest.query)}`)

    expect(await response.json()).toEqual({ fellThrough: true })
  })

  test('names files after the gene and dataset', () => {
    expect(path.relative(directory, staticResponsePath(directory, geneRequest))).toMatch(
      /^VariantsInGene\/[0-9a-f]{16}\/ENSG00000012048\.gnomad_r4\.[0-9a-f]{16}\.json\.gz$/
    )
    expect(
      path.basename(
        staticResponsePath(directory, {
          ...geneRequest,
          operationName: 'Gene',
          variables: { geneSymbol: 'BRCA1', referenceGenome: 'GRCh38' },
        })
      )
    ).toMatch(/^BRCA1\.GRCh38\.[0-9a-f]{16}\.json\.gz$/)
  })

  test('keeps every path inside the directory', () => {
    const filePath = staticResponsePath(directory, {
      ...geneRequest,
      operationName: 'Gene',
      query: '../../etc/passwd',
      variables: { geneId: '../../../x', datasetId: '/etc' },
    })

    expect(path.relative(directory, filePath)).toMatch(
      /^Gene\/[0-9a-f]{16}\/_________x\._etc\.[0-9a-f]{16}\.json\.gz$/
    )
  })
})

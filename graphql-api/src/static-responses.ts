import { createHash } from 'crypto'
import { createReadStream, promises as fs } from 'fs'
import path from 'path'
import { createGunzip } from 'zlib'
import type { NextFunction, Request, Response } from 'express'

import logger from './logger'
import { getRequestContext } from './request-context'

export const STATIC_RESPONSE_OPERATIONS: ReadonlySet<string> = new Set([
  'Gene',
  'VariantsInGene',
  'GeneCoverage',
])

export type StaticResponseRequest = {
  operationName: string
  query: string
  variables?: Record<string, unknown> | null
}

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeys)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])])
    )
  }
  return value
}

const hashPrefix = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)

const toFileNamePart = (value: unknown) =>
  typeof value === 'string' && value !== ''
    ? value.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)
    : 'none'

// `<operation>/<query hash>/<gene>.<dataset>.<variables hash>.json.gz`. The hashes decide the match; the
// gene and dataset are only there for people, and are reduced to [A-Za-z0-9_-] so that, with the
// allow-listed operation name, no request can address a file outside the directory.
export const staticResponsePath = (
  directory: string,
  { operationName, query, variables }: StaticResponseRequest
) => {
  const gene = toFileNamePart(variables?.geneId ?? variables?.geneSymbol)
  const dataset = toFileNamePart(variables?.datasetId ?? variables?.referenceGenome)
  const variablesHash = hashPrefix(JSON.stringify(sortKeys(variables ?? {})))
  return path.join(
    directory,
    operationName,
    hashPrefix(query),
    `${gene}.${dataset}.${variablesHash}.json.gz`
  )
}

const toStaticResponseRequest = (request: Request): StaticResponseRequest | null => {
  const { operationName, query, variables } = request.body ?? {}
  if (
    request.method !== 'POST' ||
    typeof operationName !== 'string' ||
    !STATIC_RESPONSE_OPERATIONS.has(operationName) ||
    typeof query !== 'string'
  ) {
    return null
  }
  return { operationName, query, variables }
}

// Never writes: files are produced, gzip-compressed, ahead of time by the generator script. Any problem
// reading a file falls through to GraphQL rather than failing the request.
export const createStaticResponseMiddleware =
  (directory: string) => async (request: Request, response: Response, next: NextFunction) => {
    const staticRequest = toStaticResponseRequest(request)
    if (staticRequest === null) {
      next()
      return
    }

    const filePath = staticResponsePath(directory, staticRequest)
    let size: number
    try {
      const stat = await fs.stat(filePath)
      if (!stat.isFile()) {
        next()
        return
      }
      size = stat.size
    } catch {
      next()
      return
    }

    const stream = createReadStream(filePath)
    stream.once('error', (error) => {
      logger.warn({
        requestId: getRequestContext()?.requestId,
        event: 'staticResponseReadError',
        path: filePath,
        error: error.message,
      })
      if (response.headersSent) {
        response.destroy(error)
      } else {
        next()
      }
    })
    stream.once('open', () => {
      // `requestEnd` logging reads the GraphQL parameters from here; GraphQL never sees this request.
      ;(request as any).graphqlParams = staticRequest
      logger.info({
        requestId: getRequestContext()?.requestId,
        event: 'staticResponseHit',
        operationName: staticRequest.operationName,
        path: filePath,
      })
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Vary', 'Accept-Encoding')
      response.setHeader('X-Static-Response', 'hit')
      if (request.acceptsEncodings('gzip')) {
        response.setHeader('Content-Encoding', 'gzip')
        response.setHeader('Content-Length', size)
        stream.pipe(response)
      } else {
        const gunzip = createGunzip()
        gunzip.once('error', (error) => response.destroy(error))
        stream.pipe(gunzip).pipe(response)
      }
    })
  }

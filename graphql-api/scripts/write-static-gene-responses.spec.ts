import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { gunzipSync } from 'zlib'

import {
  buildGeneCoverageVariables,
  buildGeneVariables,
  buildVariantsInGeneVariables,
  geneCoverageFlags,
  geneCoverageQuery,
  geneQuery,
  variantsInGeneQuery,
} from '../../browser/src/GenePage/genePageQueries'
import { staticResponsePath } from '../src/static-responses'
import { writeStaticGeneResponses } from './write-static-gene-responses'

const BRCA1 = 'ENSG00000012048'

let outputDirectory: string

beforeEach(() => {
  outputDirectory = mkdtempSync(path.join(tmpdir(), 'static-gene-responses-'))
})

afterEach(() => {
  rmSync(outputDirectory, { recursive: true, force: true })
})

type FakeApiOptions = { geneErrors?: boolean; servesStoredResponses?: boolean }

const createFakeApi = ({
  geneErrors = false,
  servesStoredResponses = false,
}: FakeApiOptions = {}) => {
  const requests: any[] = []
  const fetchFn = (async (_url: string, init: { body: string }) => {
    const request = JSON.parse(init.body)
    requests.push(request)
    const headers = servesStoredResponses ? { 'X-Static-Response': 'hit' } : undefined
    if (request.operationName === 'Gene') {
      const body = geneErrors
        ? { errors: [{ message: 'boom' }], data: null }
        : { data: { gene: { gene_id: BRCA1, symbol: 'BRCA1' } } }
      return new Response(JSON.stringify(body), { headers })
    }
    return new Response(`{"data":{"operation":"${request.operationName}"}}`, { headers })
  }) as unknown as typeof fetch
  return { fetchFn, requests }
}

const readStored = (filePath: string) => gunzipSync(readFileSync(filePath)).toString('utf8')

const allFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? allFiles(path.join(directory, entry.name))
      : [path.join(directory, entry.name)]
  )

const responseFiles = (directory: string) =>
  allFiles(directory).filter((file) => file.endsWith('.json.gz'))

describe('writeStaticGeneResponses', () => {
  test('writes the responses the browser asks for, keyed as the API looks them up', async () => {
    const { fetchFn } = createFakeApi()

    const summary = await writeStaticGeneResponses({
      apiUrl: 'http://api/',
      outputDirectory,
      datasetIds: ['gnomad_r4'],
      genes: [BRCA1],
      fetchFn,
    })

    expect(summary).toEqual({ written: 3, failed: [] })
    const browserRequests = [
      {
        operationName: 'Gene',
        query: geneQuery,
        variables: buildGeneVariables('gnomad_r4', BRCA1),
      },
      {
        operationName: 'VariantsInGene',
        query: variantsInGeneQuery,
        variables: buildVariantsInGeneVariables('gnomad_r4', BRCA1),
      },
      {
        operationName: 'GeneCoverage',
        query: geneCoverageQuery,
        variables: buildGeneCoverageVariables('gnomad_r4', BRCA1, geneCoverageFlags('gnomad_r4')),
      },
    ]
    for (const request of browserRequests) {
      expect(existsSync(staticResponsePath(outputDirectory, request))).toBe(true)
    }
    expect(readStored(staticResponsePath(outputDirectory, browserRequests[1]))).toBe(
      '{"data":{"operation":"VariantsInGene"}}'
    )
    expect(
      readFileSync(
        path.join(
          path.dirname(staticResponsePath(outputDirectory, browserRequests[1])),
          'query.graphql'
        ),
        'utf8'
      )
    ).toBe(variantsInGeneQuery)
  })

  test('lists every file with its gene symbol in the manifest, without duplicates on reruns', async () => {
    const { fetchFn } = createFakeApi()
    const options = {
      apiUrl: 'http://api/',
      outputDirectory,
      datasetIds: ['gnomad_r4' as const],
      genes: [BRCA1],
      fetchFn,
    }

    await writeStaticGeneResponses(options)
    await writeStaticGeneResponses(options)

    const [header, ...rows] = readFileSync(path.join(outputDirectory, 'MANIFEST.tsv'), 'utf8')
      .trim()
      .split('\n')
    expect(header.split('\t')).toEqual([
      'gene_id',
      'symbol',
      'dataset',
      'operation',
      'file',
      'bytes',
      'gzip_bytes',
      'written_at',
    ])
    expect(rows.map((row) => row.split('\t').slice(0, 5))).toEqual(
      responseFiles(outputDirectory)
        .map((file) => path.relative(outputDirectory, file))
        .sort()
        .map((file) => [BRCA1, 'BRCA1', 'gnomad_r4', file.split('/')[0], file])
    )
  })

  test('asks for variants and coverage by Ensembl ID when given a symbol', async () => {
    const { fetchFn, requests } = createFakeApi()

    await writeStaticGeneResponses({
      apiUrl: 'http://api/',
      outputDirectory,
      datasetIds: ['gnomad_r4'],
      genes: ['BRCA1'],
      fetchFn,
    })

    expect(
      requests.map((request) => request.variables.geneSymbol ?? request.variables.geneId)
    ).toEqual(['BRCA1', BRCA1, BRCA1])
  })

  test('writes a request shared by several datasets once', async () => {
    const { fetchFn } = createFakeApi()
    const datasetIds = ['gnomad_r4', 'gnomad_r4_non_ukb'] as const

    const summary = await writeStaticGeneResponses({
      apiUrl: 'http://api/',
      outputDirectory,
      datasetIds: [...datasetIds],
      genes: [BRCA1],
      fetchFn,
    })

    const distinctBrowserRequests = new Set(
      datasetIds.flatMap((datasetId) =>
        [
          {
            operationName: 'Gene',
            query: geneQuery,
            variables: buildGeneVariables(datasetId, BRCA1),
          },
          {
            operationName: 'VariantsInGene',
            query: variantsInGeneQuery,
            variables: buildVariantsInGeneVariables(datasetId, BRCA1),
          },
          {
            operationName: 'GeneCoverage',
            query: geneCoverageQuery,
            variables: buildGeneCoverageVariables(datasetId, BRCA1, geneCoverageFlags(datasetId)),
          },
        ].map((request) => staticResponsePath(outputDirectory, request))
      )
    )
    expect(distinctBrowserRequests.size).toBeLessThan(6)
    expect(summary.written).toBe(distinctBrowserRequests.size)
    expect(responseFiles(outputDirectory).sort()).toEqual([...distinctBrowserRequests].sort())
  })

  test('skips responses with GraphQL errors and reports them', async () => {
    const { fetchFn } = createFakeApi({ geneErrors: true })

    const summary = await writeStaticGeneResponses({
      apiUrl: 'http://api/',
      outputDirectory,
      datasetIds: ['gnomad_r4'],
      genes: [BRCA1],
      fetchFn,
    })

    expect(summary.written).toBe(0)
    expect(summary.failed).toEqual([expect.stringContaining('GraphQL errors')])
    expect(allFiles(outputDirectory)).toEqual([])
  })

  test('refuses to copy responses from an API that serves stored responses', async () => {
    const { fetchFn } = createFakeApi({ servesStoredResponses: true })

    const summary = await writeStaticGeneResponses({
      apiUrl: 'http://api/',
      outputDirectory,
      datasetIds: ['gnomad_r4'],
      genes: [BRCA1],
      fetchFn,
    })

    expect(summary.failed).toEqual([expect.stringContaining('without STATIC_RESPONSE_DIR')])
    expect(allFiles(outputDirectory)).toEqual([])
  })

  test('leaves no temporary files behind', async () => {
    const { fetchFn } = createFakeApi()

    await writeStaticGeneResponses({
      apiUrl: 'http://api/',
      outputDirectory,
      datasetIds: ['gnomad_r4'],
      genes: [BRCA1],
      fetchFn,
    })

    expect(
      allFiles(outputDirectory).every(
        (file) =>
          file.endsWith('.json.gz') ||
          file.endsWith('/query.graphql') ||
          file.endsWith('/MANIFEST.tsv')
      )
    ).toBe(true)
  })
})

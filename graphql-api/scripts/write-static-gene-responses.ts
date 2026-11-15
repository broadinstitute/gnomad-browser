/* eslint-disable no-console */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import path from 'path'
import { gzipSync } from 'zlib'

import { DatasetId, allDatasetIds } from '@gnomad/dataset-metadata/metadata'

import {
  buildGeneCoverageVariables,
  buildGeneVariables,
  buildVariantsInGeneVariables,
  geneCoverageFlags,
  geneCoverageOperationName,
  geneCoverageQuery,
  geneOperationName,
  geneQuery,
  variantsInGeneOperationName,
  variantsInGeneQuery,
} from '../../browser/src/GenePage/genePageQueries'
import { StaticResponseRequest, staticResponsePath } from '../src/static-responses'

const USAGE = `Write the gene page's GraphQL responses for the static response store.

Usage:
  pnpm ts-node graphql-api/scripts/write-static-gene-responses.ts \\
    --api-url http://localhost:8010/api/ --output <STATIC_RESPONSE_DIR> \\
    [--dataset gnomad_r4 ...] [--genes-file <file>] [<gene ID or symbol> ...]

--dataset may repeat (default gnomad_r4). --genes-file lists one gene per line; # starts a comment.
Point --api-url at an API without STATIC_RESPONSE_DIR, or it would copy its own stored files.
Each query directory gets a query.graphql; MANIFEST.tsv lists every file with its gene symbol.`

export const buildGeneRequest = (datasetId: DatasetId, geneIdOrSymbol: string) => ({
  operationName: geneOperationName,
  query: geneQuery,
  variables: buildGeneVariables(datasetId, geneIdOrSymbol),
})

export const buildGeneDataRequests = (datasetId: DatasetId, geneId: string) => [
  {
    operationName: variantsInGeneOperationName,
    query: variantsInGeneQuery,
    variables: buildVariantsInGeneVariables(datasetId, geneId),
  },
  {
    operationName: geneCoverageOperationName,
    query: geneCoverageQuery,
    variables: buildGeneCoverageVariables(datasetId, geneId, geneCoverageFlags(datasetId)),
  },
]

type Fetch = typeof fetch

type WriteOptions = {
  apiUrl: string
  outputDirectory: string
  datasetIds: DatasetId[]
  genes: string[]
  fetchFn?: Fetch
  log?: (message: string) => void
}

export type WriteSummary = { written: number; failed: string[] }

const requestBody = async (
  fetchFn: Fetch,
  apiUrl: string,
  request: StaticResponseRequest
): Promise<string> => {
  const response = await fetchFn(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GnomAD-Client': 'static-response-generator',
    },
    body: JSON.stringify(request),
  })
  if (response.headers.get('x-static-response') === 'hit') {
    throw new Error(
      'the API answered from stored responses; use an API without STATIC_RESPONSE_DIR'
    )
  }
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const parsed = JSON.parse(body)
  if (parsed.errors?.length || !parsed.data) {
    throw new Error(`GraphQL errors: ${JSON.stringify(parsed.errors ?? 'no data').slice(0, 300)}`)
  }
  return body
}

const MANIFEST_FILE = 'MANIFEST.tsv'
const MANIFEST_COLUMNS = [
  'gene_id',
  'symbol',
  'dataset',
  'operation',
  'file',
  'bytes',
  'gzip_bytes',
  'written_at',
] as const
type ManifestRow = Record<(typeof MANIFEST_COLUMNS)[number], string>

const readManifest = (outputDirectory: string) => {
  const rows = new Map<string, ManifestRow>()
  const manifestPath = path.join(outputDirectory, MANIFEST_FILE)
  if (!existsSync(manifestPath)) {
    return rows
  }
  const [header, ...lines] = readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean)
  const columns = header.split('\t')
  lines.forEach((line) => {
    const values = line.split('\t')
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']))
    rows.set(row.file, row as ManifestRow)
  })
  return rows
}

const writeAtomically = (filePath: string, body: string | Buffer) => {
  mkdirSync(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp-${process.pid}`
  writeFileSync(temporaryPath, body)
  renameSync(temporaryPath, filePath)
}

export const writeStaticGeneResponses = async ({
  apiUrl,
  outputDirectory,
  datasetIds,
  genes,
  fetchFn = fetch,
  log = () => {},
}: WriteOptions): Promise<WriteSummary> => {
  const summary: WriteSummary = { written: 0, failed: [] }
  const writtenPaths = new Set<string>()
  const manifest = readManifest(outputDirectory)

  const writeResponse = (
    request: StaticResponseRequest,
    body: string,
    { geneId, symbol, datasetId }: { geneId: string; symbol: string; datasetId: string }
  ) => {
    const filePath = staticResponsePath(outputDirectory, request)
    if (writtenPaths.has(filePath)) {
      return
    }
    const compressed = gzipSync(body, { level: 9 })
    writeAtomically(filePath, compressed)
    const queryPath = path.join(path.dirname(filePath), 'query.graphql')
    if (!existsSync(queryPath)) {
      writeAtomically(queryPath, request.query)
    }
    writtenPaths.add(filePath)
    summary.written += 1
    const file = path.relative(outputDirectory, filePath)
    manifest.set(file, {
      gene_id: geneId,
      symbol,
      dataset: datasetId,
      operation: request.operationName,
      file,
      bytes: String(Buffer.byteLength(body)),
      gzip_bytes: String(compressed.length),
      written_at: new Date().toISOString(),
    })
    log(
      `wrote ${symbol} ${datasetId} ${request.operationName} (${compressed.length} bytes) -> ${file}`
    )
  }

  for (const gene of genes) {
    for (const datasetId of datasetIds) {
      const label = `${gene} ${datasetId}`
      try {
        const geneRequest = buildGeneRequest(datasetId, gene)
        // eslint-disable-next-line no-await-in-loop -- one request at a time keeps load off the API
        const geneBody = await requestBody(fetchFn, apiUrl, geneRequest)
        // Variants and coverage are requested by Ensembl ID even on /gene/SYMBOL pages.
        const geneRecord = JSON.parse(geneBody).data.gene
        if (!geneRecord?.gene_id) {
          throw new Error('gene not found')
        }
        const geneDetails = {
          geneId: geneRecord.gene_id,
          symbol: geneRecord.symbol ?? '',
          datasetId,
        }
        writeResponse(geneRequest, geneBody, geneDetails)
        for (const request of buildGeneDataRequests(datasetId, geneDetails.geneId)) {
          // eslint-disable-next-line no-await-in-loop
          writeResponse(request, await requestBody(fetchFn, apiUrl, request), geneDetails)
        }
      } catch (error) {
        summary.failed.push(`${label}: ${(error as Error).message}`)
        log(`failed ${label}: ${(error as Error).message}`)
      }
    }
  }
  if (summary.written > 0) {
    const manifestRows = [...manifest.values()].sort((a, b) => a.file.localeCompare(b.file))
    writeAtomically(
      path.join(outputDirectory, MANIFEST_FILE),
      [
        MANIFEST_COLUMNS.join('\t'),
        ...manifestRows.map((row) => MANIFEST_COLUMNS.map((column) => row[column]).join('\t')),
      ]
        .join('\n')
        .concat('\n')
    )
  }
  return summary
}

const parseArguments = (argv: string[]) => {
  const options = {
    apiUrl: '',
    outputDirectory: '',
    datasetIds: [] as string[],
    genes: [] as string[],
  }
  const genesFiles: string[] = []
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = () => {
      index += 1
      if (index >= argv.length) {
        throw new Error(`${argument} needs a value`)
      }
      return argv[index]
    }
    if (argument === '--api-url') options.apiUrl = value()
    else if (argument === '--output') options.outputDirectory = value()
    else if (argument === '--dataset') options.datasetIds.push(value())
    else if (argument === '--genes-file') genesFiles.push(value())
    else if (argument.startsWith('--')) throw new Error(`unknown option ${argument}`)
    else options.genes.push(argument)
  }
  return { ...options, genesFiles }
}

const main = async () => {
  const { apiUrl, outputDirectory, datasetIds, genes, genesFiles } = parseArguments(
    process.argv.slice(2)
  )
  for (const file of genesFiles) {
    genes.push(
      ...readFileSync(file, 'utf8')
        .split('\n')
        .map((line: string) => line.replace(/#.*/, '').trim())
        .filter(Boolean)
    )
  }
  const datasets = datasetIds.length ? datasetIds : ['gnomad_r4']
  const unknownDatasets = datasets.filter((id) => !(allDatasetIds as string[]).includes(id))
  if (!apiUrl || !outputDirectory || genes.length === 0 || unknownDatasets.length) {
    if (unknownDatasets.length) {
      console.error(`unknown dataset(s): ${unknownDatasets.join(', ')}`)
    }
    console.error(USAGE)
    process.exit(2)
  }

  const startedAt = Date.now()
  const summary = await writeStaticGeneResponses({
    apiUrl,
    outputDirectory,
    datasetIds: datasets as DatasetId[],
    genes,
    log: (message) => console.log(message),
  })
  console.log(
    `${summary.written} file(s) written, ${summary.failed.length} failure(s), ${
      Date.now() - startedAt
    } ms`
  )
  if (summary.failed.length) {
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

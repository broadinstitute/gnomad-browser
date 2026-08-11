#!/usr/bin/env node
/* eslint-disable no-await-in-loop, no-console, no-continue, no-restricted-syntax */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..')
const MANIFEST_FILE = path.join(REPO_ROOT, 'development/data/giab-v3.6-grch38-chr22.sources.json')
const ASSET_FILE = path.join(REPO_ROOT, 'browser/src/data/referenceSequenceContextChr22.json')
const PROVENANCE_FILE = path.join(
  REPO_ROOT,
  'browser/src/data/referenceSequenceContextChr22.provenance.json'
)
const PROCESSING_ALGORITHM = 'giab-reference-sequence-context-components-v1'
const MAX_LR_SPAN = 100_000
const STANDARD_CONTIG = /^chr(?:[1-9]|1\d|2[0-2]|X|Y|M)$/

const args = new Set(process.argv.slice(2))
if ([...args].some((arg) => arg !== '--check')) {
  throw new Error(
    `Usage: node ${path.relative(REPO_ROOT, fileURLToPath(import.meta.url))} [--check]`
  )
}
const checkOnly = args.has('--check')

function digest(algorithm, bytes) {
  return crypto.createHash(algorithm).update(bytes).digest('hex')
}

function contigRank(contig) {
  const name = contig.slice(3)
  if (/^\d+$/.test(name)) return Number(name)
  return { X: 23, Y: 24, M: 25 }[name] ?? 999
}

async function download(url) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`download failed (${response.status}) for ${url}`)
  return Buffer.from(await response.arrayBuffer())
}

async function parseBed(compressed, source) {
  const lines = readline.createInterface({
    input: Readable.from(compressed).pipe(createGunzip()),
    crlfDelay: Infinity,
  })
  const intervals = []
  let fileIntervals = 0
  let previous = null
  for await (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('track ') || line.startsWith('browser ')) {
      continue
    }
    const columns = line.split('\t')
    if (columns.length < 3)
      throw new Error(`${source.relativePath}: BED row has fewer than 3 columns`)
    const [contig, startText, endText] = columns
    if (!STANDARD_CONTIG.test(contig)) {
      throw new Error(`${source.relativePath}: unexpected contig ${JSON.stringify(contig)}`)
    }
    if (!/^\d+$/.test(startText) || !/^\d+$/.test(endText)) {
      throw new Error(`${source.relativePath}: non-integer BED coordinate`)
    }
    const start0 = Number(startText)
    const end0 = Number(endText)
    if (
      !Number.isSafeInteger(start0) ||
      !Number.isSafeInteger(end0) ||
      start0 < 0 ||
      start0 >= end0
    ) {
      throw new Error(
        `${source.relativePath}: invalid BED interval ${contig}:${startText}-${endText}`
      )
    }
    const order = [contigRank(contig), start0, end0]
    if (
      previous &&
      (order[0] < previous[0] ||
        (order[0] === previous[0] && order[1] < previous[1]) ||
        (order[0] === previous[0] && order[1] === previous[1] && order[2] < previous[2]))
    ) {
      throw new Error(`${source.relativePath}: BED rows are not sorted`)
    }
    previous = order
    fileIntervals += 1
    if (contig === 'chr22') intervals.push({ sourceId: source.sourceId, start0, end0 })
  }
  return { fileIntervals, intervals }
}

function boundedWindow(start, stop) {
  const span = stop - start + 1
  if (span <= MAX_LR_SPAN) return { start, stop }
  const midpoint = Math.floor((start + stop) / 2)
  let windowStart = midpoint - Math.floor((MAX_LR_SPAN - 1) / 2)
  if (windowStart < 1) windowStart = 1
  return { start: windowStart, stop: windowStart + MAX_LR_SPAN - 1 }
}

const reviewedAnchors = [
  { position: 21_277_237, label: 'LCR22' },
  { position: 22_474_494, label: 'IGL' },
  { position: 42_127_692, label: 'CYP2D6/CYP2D7 area' },
]

function mergeIntervals(allIntervals, sourceOrder) {
  const sorted = [...allIntervals].sort(
    (a, b) =>
      a.start0 - b.start0 ||
      a.end0 - b.end0 ||
      sourceOrder.get(a.sourceId) - sourceOrder.get(b.sourceId)
  )
  const components = []
  for (const evidence of sorted) {
    const current = components[components.length - 1]
    if (!current || evidence.start0 > current.end0) {
      components.push({ start0: evidence.start0, end0: evidence.end0, evidence: [evidence] })
    } else {
      current.end0 = Math.max(current.end0, evidence.end0)
      current.evidence.push(evidence)
    }
  }

  return components.map((component) => {
    const start = component.start0 + 1
    const stop = component.end0
    const categories = [...new Set(component.evidence.map((item) => item.sourceId))].sort(
      (a, b) => sourceOrder.get(a) - sourceOrder.get(b)
    )
    const anchor = reviewedAnchors.find(
      (candidate) => candidate.position >= start && candidate.position <= stop
    )
    const region = {
      id: `22:${component.start0}-${component.end0}`,
      start,
      stop,
      spanBp: component.end0 - component.start0,
      categories,
      evidence: component.evidence,
    }
    if (region.spanBp > MAX_LR_SPAN) region.lrWindow = boundedWindow(start, stop)
    if (anchor) region.curatedLabel = anchor.label
    return region
  })
}

function unionBp(regions) {
  return regions.reduce((total, region) => total + region.spanBp, 0)
}

function assertExpected(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, observed ${actual}`)
}

function compareOrWrite(file, content) {
  if (checkOnly) {
    if (!fs.existsSync(file))
      throw new Error(`generated file is missing: ${path.relative(REPO_ROOT, file)}`)
    const existing = fs.readFileSync(file)
    if (!existing.equals(content))
      throw new Error(`generated file has drifted: ${path.relative(REPO_ROOT, file)}`)
    return
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temporary, content)
  fs.renameSync(temporary, file)
}

async function main() {
  if (typeof fetch !== 'function') throw new Error('Node.js 18 or later is required')
  const manifestBytes = fs.readFileSync(MANIFEST_FILE)
  const manifest = JSON.parse(manifestBytes)
  if (manifest.sources.some((source) => source.relativePath.includes('alldifficultregions'))) {
    throw new Error('lossy alldifficultregions union must not be included')
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'giab-chr22-context-'))
  const allIntervals = []
  const sourceReceipts = []
  try {
    for (const source of manifest.sources) {
      const url = new URL(source.relativePath, manifest.pinnedRoot).href
      const compressed = await download(url)
      const localFile = path.join(temporaryDirectory, path.basename(source.relativePath))
      fs.writeFileSync(localFile, compressed)

      const sha256 = digest('sha256', compressed)
      assertExpected(sha256, source.sha256, `${source.sourceId} compressed SHA-256`)
      const md5 = digest('md5', compressed)
      assertExpected(md5, source.md5, `${source.sourceId} release MD5`)

      const { fileIntervals, intervals } = await parseBed(compressed, source)
      const chr22Bp = intervals.reduce(
        (total, interval) => total + interval.end0 - interval.start0,
        0
      )
      assertExpected(
        intervals.length,
        source.expectedChr22Intervals,
        `${source.sourceId} chr22 rows`
      )
      assertExpected(chr22Bp, source.expectedChr22Bp, `${source.sourceId} chr22 bp`)
      allIntervals.push(...intervals)
      sourceReceipts.push({
        sourceId: source.sourceId,
        url,
        relativePath: source.relativePath,
        md5,
        sha256,
        compressedBytes: compressed.length,
        fileIntervals,
        chr22Intervals: intervals.length,
        chr22Bp,
      })
      process.stdout.write(
        `${source.sourceId}: sha256=${sha256} md5=${md5} chr22=${intervals.length} intervals/${chr22Bp} bp\n`
      )
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }

  assertExpected(
    allIntervals.length,
    manifest.expected.chr22SourceIntervals,
    'total chr22 source rows'
  )
  assertExpected(
    allIntervals.reduce((total, interval) => total + interval.end0 - interval.start0, 0),
    manifest.expected.chr22SourceBp,
    'summed chr22 source bp'
  )

  const sourceOrder = new Map(manifest.sources.map((source, index) => [source.sourceId, index]))
  const regions = mergeIntervals(allIntervals, sourceOrder)
  assertExpected(regions.length, manifest.expected.connectedComponents, 'connected components')
  assertExpected(unionBp(regions), manifest.expected.unionBp, 'connected-component union bp')
  const defaultRegions = regions.filter(
    (region) => region.categories.length >= 2 || region.curatedLabel !== undefined
  ).length
  assertExpected(defaultRegions, manifest.expected.defaultRegions, 'default regions')

  for (const region of regions) {
    assertExpected(region.spanBp, region.stop - region.start + 1, `${region.id} coordinate span`)
    if (region.lrWindow && region.lrWindow.stop - region.lrWindow.start + 1 > MAX_LR_SPAN) {
      throw new Error(`${region.id}: LR window exceeds ${MAX_LR_SPAN} bp`)
    }
  }

  const asset = {
    schemaVersion: 1,
    release: manifest.release,
    referenceGenome: manifest.referenceGenome,
    contig: '22',
    coordinateSystem: '1-based-inclusive',
    categories: manifest.sources.map((source) => ({
      id: source.sourceId,
      label: source.label,
      shortLabel: source.shortLabel,
      definition: source.definition,
      sourcePath: source.relativePath,
      sourceUrl: new URL(source.relativePath, manifest.pinnedRoot).href,
    })),
    regions,
  }
  const assetBytes = Buffer.from(`${JSON.stringify(asset)}\n`)
  const assetSha256 = digest('sha256', assetBytes)
  const provenance = {
    schemaVersion: 1,
    release: manifest.release,
    releaseDate: manifest.releaseDate,
    pilotStatus: 'Pilot / experimental',
    referenceGenome: manifest.referenceGenome,
    referenceFasta: manifest.referenceFasta,
    sourceCoordinateSystem: manifest.coordinateSystem,
    browserCoordinateSystem: asset.coordinateSystem,
    processingAlgorithm: PROCESSING_ALGORITHM,
    processingDescription:
      'Verified compressed source SHA-256 and MD5; selected chr22; converted BED start0/end0 to 1-based-inclusive start0+1/end0; sorted by start0, end0, source order; merged overlapping or directly touching intervals without slop while preserving every source interval.',
    generatedAsset: path.relative(REPO_ROOT, ASSET_FILE),
    generatedAssetSha256: assetSha256,
    counts: {
      chr22SourceIntervals: allIntervals.length,
      chr22SummedSourceBp: manifest.expected.chr22SourceBp,
      connectedComponents: regions.length,
      connectedComponentUnionBp: unionBp(regions),
      defaultRegions,
    },
    sources: sourceReceipts,
    citation: manifest.citation,
    acknowledgement: manifest.acknowledgement,
    sharing: manifest.sharing,
    dataUsePolicy: manifest.dataUsePolicy,
    sourceManifestSha256: digest('sha256', manifestBytes),
  }
  const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`)

  compareOrWrite(ASSET_FILE, assetBytes)
  compareOrWrite(PROVENANCE_FILE, provenanceBytes)
  process.stdout.write(
    `${checkOnly ? 'verified' : 'wrote'} ${
      regions.length
    } components (${defaultRegions} default), ${unionBp(
      regions
    )} union bp, asset sha256=${assetSha256}\n`
  )
}

main().catch((error) => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})

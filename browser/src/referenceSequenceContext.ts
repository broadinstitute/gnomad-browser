import contextAssetJson from './data/referenceSequenceContextChr22.json'
import provenanceJson from './data/referenceSequenceContextChr22.provenance.json'

export const PAGE_SIZE = 50
export const MAX_LR_WINDOW_BP = 100_000
export const EXPECTED_REGION_COUNT = 9_440
export const EXPECTED_DEFAULT_COUNT = 1_005

export type ContextCategory = {
  id: string
  label: string
  shortLabel: string
  definition: string
  sourcePath: string
  sourceUrl: string
}

export type ContextEvidence = {
  sourceId: string
  start0: number
  end0: number
}

export type ContextRegion = {
  id: string
  start: number
  stop: number
  spanBp: number
  categories: string[]
  evidence: ContextEvidence[]
  curatedLabel?: string
  lrWindow?: { start: number; stop: number }
}

export type ContextAsset = {
  schemaVersion: 1
  release: string
  referenceGenome: 'GRCh38'
  contig: '22'
  coordinateSystem: '1-based-inclusive'
  categories: ContextCategory[]
  regions: ContextRegion[]
}

export type ContextProvenance = {
  schemaVersion: 1
  pilotStatus: string
  generatedAssetSha256: string
  processingDescription: string
  referenceFasta: { assemblyAccession: string; description: string; uncompressedMd5: string }
  counts: {
    chr22SourceIntervals: number
    chr22SummedSourceBp: number
    connectedComponents: number
    connectedComponentUnionBp: number
    defaultRegions: number
  }
  citation: { text: string; doi: string }
  acknowledgement: string
  sharing: string
  dataUsePolicy: string
  sources: Array<{
    sourceId: string
    url: string
    md5: string
    sha256: string
    fileIntervals: number
    chr22Intervals: number
    chr22Bp: number
  }>
}

export type MatchMode = 'any' | 'all'
export type SortMode = 'coordinate' | 'span' | 'category'

export type ContextFilters = {
  query: string
  categoryIds: string[]
  matchMode: MatchMode
  multipleOnly: boolean
  namedOnly: boolean
  minSpanBp?: number
  maxSpanBp?: number
  sort: SortMode
}

export type QueryProblem =
  | { kind: 'invalid'; message: string }
  | { kind: 'unsupported'; message: string }

const namedSourceIds = new Set(['false-duplication-correct-copy', 'vdj-igl'])

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

export function assertContextAsset(value: unknown): asserts value is ContextAsset {
  if (!value || typeof value !== 'object') throw new Error('context asset is not an object')
  const asset = value as Partial<ContextAsset>
  if (
    asset.schemaVersion !== 1 ||
    asset.referenceGenome !== 'GRCh38' ||
    asset.contig !== '22' ||
    asset.coordinateSystem !== '1-based-inclusive' ||
    !Array.isArray(asset.categories) ||
    asset.categories.length !== 7 ||
    !Array.isArray(asset.regions) ||
    asset.regions.length !== EXPECTED_REGION_COUNT
  ) {
    throw new Error('context asset header or expected counts are invalid')
  }
  const categoryIds = new Set(asset.categories.map((category) => category.id))
  let previousStop = 0
  let defaultCount = 0
  asset.regions.forEach((region) => {
    if (
      !isPositiveInteger(region.start) ||
      !isPositiveInteger(region.stop) ||
      region.start > region.stop ||
      region.spanBp !== region.stop - region.start + 1 ||
      region.start <= previousStop ||
      !Array.isArray(region.categories) ||
      region.categories.length === 0 ||
      region.categories.some((categoryId) => !categoryIds.has(categoryId)) ||
      !Array.isArray(region.evidence) ||
      region.evidence.length === 0 ||
      (region.lrWindow !== undefined &&
        region.lrWindow.stop - region.lrWindow.start + 1 > MAX_LR_WINDOW_BP)
    ) {
      throw new Error(`context asset region is invalid: ${region.id || 'unknown'}`)
    }
    previousStop = region.stop
    if (isDefaultRegion(region)) defaultCount += 1
  })
  if (defaultCount !== EXPECTED_DEFAULT_COUNT)
    throw new Error('context asset default count is invalid')
}

export function assertContextProvenance(value: unknown): asserts value is ContextProvenance {
  if (!value || typeof value !== 'object') throw new Error('context provenance is not an object')
  const provenance = value as Partial<ContextProvenance>
  if (
    provenance.schemaVersion !== 1 ||
    provenance.counts?.connectedComponents !== EXPECTED_REGION_COUNT ||
    provenance.counts?.defaultRegions !== EXPECTED_DEFAULT_COUNT ||
    !/^[a-f0-9]{64}$/.test(provenance.generatedAssetSha256 || '') ||
    !Array.isArray(provenance.sources) ||
    provenance.sources.length !== 7
  ) {
    throw new Error('context provenance is invalid')
  }
}

export const contextLoadResult: {
  asset?: ContextAsset
  provenance?: ContextProvenance
  error?: Error
} = (() => {
  try {
    const asset: unknown = contextAssetJson
    const provenance: unknown = provenanceJson
    assertContextAsset(asset)
    assertContextProvenance(provenance)
    return { asset, provenance }
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }
})()

export function isNamedRegion(region: ContextRegion) {
  return Boolean(
    region.curatedLabel || region.categories.some((categoryId) => namedSourceIds.has(categoryId))
  )
}

export function isDefaultRegion(region: ContextRegion) {
  return region.categories.length >= 2 || Boolean(region.curatedLabel)
}

export const defaultContextFilters = (categoryIds: string[]): ContextFilters => ({
  query: '',
  categoryIds: [...categoryIds],
  matchMode: 'any',
  multipleOnly: true,
  namedOnly: false,
  sort: 'coordinate',
})

export function formatRegion(region: Pick<ContextRegion, 'start' | 'stop'>) {
  return `22:${region.start.toLocaleString('en-US')}–${region.stop.toLocaleString('en-US')}`
}

export function formatSpan(spanBp: number) {
  if (spanBp >= 1_000_000) return `${(spanBp / 1_000_000).toFixed(2)} Mb`
  if (spanBp >= 1_000) return `${(spanBp / 1_000).toFixed(spanBp >= 100_000 ? 0 : 1)} kb`
  return `${spanBp.toLocaleString('en-US')} bp`
}

export function sourceIntervalLabel(evidence: ContextEvidence) {
  return `22:${(evidence.start0 + 1).toLocaleString('en-US')}–${evidence.end0.toLocaleString(
    'en-US'
  )}`
}

export function queryProblem(query: string): QueryProblem | null {
  const trimmed = query.trim()
  if (!trimmed.includes(':')) return null
  const match = trimmed.replace(/,/g, '').match(/^(?:chr)?([^:]+):(\d+)[-–](\d+)$/i)
  if (!match) {
    return { kind: 'invalid', message: 'Enter a coordinate as 22:start-stop.' }
  }
  if (match[1] !== '22') {
    return {
      kind: 'unsupported',
      message: 'This experimental release currently includes chromosome 22 only.',
    }
  }
  if (Number(match[2]) < 1 || Number(match[2]) > Number(match[3])) {
    return { kind: 'invalid', message: 'Enter a coordinate as 22:start-stop with start ≤ stop.' }
  }
  return null
}

function queryMatches(region: ContextRegion, query: string) {
  const trimmed = query.trim()
  if (!trimmed) return true
  if (trimmed.includes(':')) {
    const normalized = trimmed.replace(/^chr/i, '').replace(/,/g, '').replace('-', '–')
    return normalized === `22:${region.start}–${region.stop}`
  }
  return region.curatedLabel?.toLocaleLowerCase().includes(trimmed.toLocaleLowerCase()) || false
}

export function filterContextRegions(regions: ContextRegion[], filters: ContextFilters) {
  if (queryProblem(filters.query)) return []
  const selected = new Set(filters.categoryIds)
  const filtered = regions.filter((region) => {
    if (!queryMatches(region, filters.query)) return false
    if (filters.multipleOnly && !isDefaultRegion(region)) return false
    if (filters.namedOnly && !isNamedRegion(region)) return false
    if (filters.minSpanBp !== undefined && region.spanBp < filters.minSpanBp) return false
    if (filters.maxSpanBp !== undefined && region.spanBp > filters.maxSpanBp) return false
    if (selected.size === 0) return false
    if (filters.matchMode === 'all') {
      return [...selected].every((categoryId) => region.categories.includes(categoryId))
    }
    return region.categories.some((categoryId) => selected.has(categoryId))
  })
  if (filters.sort === 'span') {
    return filtered.sort((a, b) => b.spanBp - a.spanBp || a.start - b.start)
  }
  if (filters.sort === 'category') {
    return filtered.sort(
      (a, b) => a.categories.join('|').localeCompare(b.categories.join('|')) || a.start - b.start
    )
  }
  return filtered.sort((a, b) => a.start - b.start)
}

export function longReadSummaryUrl(region: ContextRegion) {
  const { start, stop } = region.lrWindow || region
  return `/region/22-${start}-${stop}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
}

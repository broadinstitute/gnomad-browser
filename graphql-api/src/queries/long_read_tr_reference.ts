import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { UserVisibleError } from '../errors'
import type { Y1SourceSnapshot } from './long_read_y1_provenance'
import {
  fetchBoundedShortTandemRepeatCatalog,
  fetchShortTandemRepeatById,
} from './short-tandem-repeat-queries'

export const LONG_READ_TR_REFERENCE_MAX_FIRST = 100
const CATALOG_CACHE_MS = 300_000
const artifactPath = path.join(__dirname, '../../config/long-read-tr-reference-crosswalk.json')

export type ReferenceStatus =
  | 'EXACT_UNIQUE'
  | 'NONE'
  | 'MULTIPLE'
  | 'AMBIGUOUS_CATALOG'
  | 'AMBIGUOUS_COMPONENT'
  | 'UNAVAILABLE'

type Component = { chrom: string; start0: number; end0: number; motif: string }
type Candidate = {
  canonical_id: string
  matched_component_index: number
  matched_component: Component
  matched_reference_region_index: number
}
type CohortResult = {
  status: ReferenceStatus
  reason_code: string | null
  source_database: string
  source_release: string
  source_run_id: string
  candidates: Candidate[]
}
type ValidatedCohortResult = CohortResult & { canonical_ids: string[] }

type ArtifactRow = {
  short: any
  cohorts: { hgsvc_hprc: CohortResult; aou: CohortResult }
}
type CrosswalkArtifact = {
  schema_version: number
  catalog: {
    dataset: string
    source: string
    endpoint: string
    queried_at: string
    row_count: number
    compact_sha256: string
    hard_ceiling: number
  }
  provenance: any
  reconciliation: any
  rows: ArtifactRow[]
}

const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as CrosswalkArtifact
if (
  artifact.schema_version !== 1 ||
  artifact.catalog.dataset !== 'gnomad_r4' ||
  artifact.catalog.row_count !== artifact.rows.length ||
  artifact.rows.length !== 78 ||
  artifact.catalog.hard_ceiling > 500
) {
  throw new Error('Invalid long-read TR reference crosswalk artifact')
}

const normalizedChrom = (value: unknown) => String(value).replace(/^chr/i, '').toUpperCase()
const exactRegion = (region: any, component: Component) =>
  region?.reference_genome === 'GRCh38' &&
  normalizedChrom(region.chrom) === normalizedChrom(component.chrom) &&
  Number(region.start) === component.start0 &&
  Number(region.stop) === component.end0

export const normalizeShortCatalogRows = (rows: any[]) =>
  rows
    .map((row) => ({
      id: String(row.id),
      gene: {
        ensembl_id: row.gene?.ensembl_id,
        symbol: row.gene?.symbol,
        region: row.gene?.region,
      },
      associated_diseases: (row.associated_diseases || []).map((disease: any) => ({
        name: disease.name,
        symbol: disease.symbol,
        omim_id: disease.omim_id || null,
        inheritance_mode: disease.inheritance_mode,
        repeat_size_classifications: (disease.repeat_size_classifications || []).map(
          (classification: any) => ({
            classification: classification.classification,
            min: classification.min == null ? null : Number(classification.min),
            max: classification.max == null ? null : Number(classification.max),
          })
        ),
      })),
      stripy_id: row.stripy_id || null,
      strchive_id: row.strchive_id || null,
      main_reference_region: row.main_reference_region,
      reference_repeat_unit: String(row.reference_repeat_unit),
    }))
    .sort((left, right) => left.id.localeCompare(right.id))

export const compactCatalogSha256 = (rows: any[]) =>
  createHash('sha256').update(JSON.stringify(normalizeShortCatalogRows(rows))).digest('hex')

type CatalogState = { available: boolean; reason: string | null; rows: any[] }
const catalogCache = new WeakMap<object, { expires: number; promise: Promise<CatalogState> }>()

const loadCatalogState = async (esClient: object): Promise<CatalogState> => {
  const now = Date.now()
  const cached = catalogCache.get(esClient)
  if (cached && cached.expires > now) return cached.promise
  const promise = (async () => {
    try {
      const rows = await fetchBoundedShortTandemRepeatCatalog(esClient, 'gnomad_r4')
      if (rows.length > artifact.catalog.hard_ceiling) {
        return { available: false, reason: 'CATALOG_HARD_CEILING_EXCEEDED', rows: [] }
      }
      if (rows.length !== artifact.catalog.row_count) {
        return { available: false, reason: 'CATALOG_ROW_COUNT_MISMATCH', rows: [] }
      }
      if (compactCatalogSha256(rows) !== artifact.catalog.compact_sha256) {
        return { available: false, reason: 'CATALOG_DIGEST_MISMATCH', rows: [] }
      }
      return { available: true, reason: null, rows }
    } catch (error) {
      return {
        available: false,
        reason:
          error instanceof Error &&
          error.message === 'SHORT_TANDEM_REPEAT_CATALOG_HARD_CEILING_EXCEEDED'
            ? 'CATALOG_HARD_CEILING_EXCEEDED'
            : 'CATALOG_UNAVAILABLE',
        rows: [],
      }
    }
  })()
  catalogCache.set(esClient, { expires: now + CATALOG_CACHE_MS, promise })
  return promise
}

const sourceMatches = (result: CohortResult, source: Y1SourceSnapshot | null) =>
  !!source &&
  source.reference_genome === 'GRCh38' &&
  source.database === result.source_database &&
  source.release === result.source_release &&
  source.run_id === result.source_run_id

const unavailableResult = (result: CohortResult, reason_code: string) => ({
  ...result,
  status: 'UNAVAILABLE' as ReferenceStatus,
  reason_code,
  candidates: [],
})

const chromRank = (chrom: string) => {
  const normalized = normalizedChrom(chrom)
  if (/^\d+$/.test(normalized)) return Number(normalized)
  if (normalized === 'X') return 23
  if (normalized === 'Y') return 24
  if (normalized === 'M' || normalized === 'MT') return 25
  return 100
}

const rowSearchText = (row: ArtifactRow) =>
  [
    row.short.id,
    row.short.gene?.symbol,
    row.short.gene?.ensembl_id,
    row.short.main_reference_region?.chrom,
    row.short.main_reference_region?.start,
    row.short.main_reference_region?.stop,
    row.short.reference_repeat_unit,
    ...row.short.associated_diseases.flatMap((disease: any) => [
      disease.name,
      disease.symbol,
      disease.omim_id,
    ]),
    ...Object.values(row.cohorts).flatMap((result) =>
      result.candidates.map((candidate) => candidate.canonical_id)
    ),
  ]
    .filter((value) => value != null)
    .join(' ')
    .toLowerCase()

const matchesStatusFilter = (row: ArtifactRow, filter?: string | null) => {
  if (!filter || filter === 'ALL') return true
  if (filter === 'EITHER')
    return Object.values(row.cohorts).some((result) => result.status === 'EXACT_UNIQUE')
  const hgsvc = row.cohorts.hgsvc_hprc.status
  const aou = row.cohorts.aou.status
  if (filter === 'BOTH') return hgsvc === 'EXACT_UNIQUE' && aou === 'EXACT_UNIQUE'
  if (filter === 'HGSVC_HPRC_ONLY') return hgsvc === 'EXACT_UNIQUE' && aou !== 'EXACT_UNIQUE'
  if (filter === 'AOU_ONLY') return aou === 'EXACT_UNIQUE' && hgsvc !== 'EXACT_UNIQUE'
  if (filter === 'NONE') return hgsvc === 'NONE' && aou === 'NONE'
  if (filter === 'MULTIPLE') return hgsvc === 'MULTIPLE' || aou === 'MULTIPLE'
  if (filter === 'UNAVAILABLE_OR_AMBIGUOUS')
    return [hgsvc, aou].some((status) => status === 'UNAVAILABLE' || status.startsWith('AMBIGUOUS'))
  return false
}

const cursorFingerprint = (args: any) =>
  createHash('sha256')
    .update(JSON.stringify([args.query || '', args.chrom || '', args.match_status || '', args.sort || 'SHORT_ID_ASC']))
    .digest('hex')
    .slice(0, 16)

export const encodeReferenceCursor = (offset: number, fingerprint: string) =>
  Buffer.from(JSON.stringify({ version: 1, offset, fingerprint }), 'utf8').toString('base64url')

export const decodeReferenceCursor = (value: string | null | undefined, fingerprint: string) => {
  if (!value) return 0
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (
      cursor.version !== 1 ||
      !Number.isInteger(cursor.offset) ||
      cursor.offset < 0 ||
      cursor.fingerprint !== fingerprint
    )
      throw new Error('invalid')
    return cursor.offset
  } catch {
    throw new UserVisibleError('Invalid long-read TR reference cursor')
  }
}

const referenceStatusRank: Record<ReferenceStatus, number> = {
  EXACT_UNIQUE: 0,
  MULTIPLE: 1,
  NONE: 2,
  AMBIGUOUS_CATALOG: 3,
  AMBIGUOUS_COMPONENT: 4,
  UNAVAILABLE: 5,
}

const compareCohortResult = (left: CohortResult, right: CohortResult) =>
  referenceStatusRank[left.status] - referenceStatusRank[right.status] ||
  right.candidates.length - left.candidates.length

const compareRows = (sort: string) => (left: ArtifactRow, right: ArtifactRow) => {
  const stable = left.short.id.localeCompare(right.short.id)
  if (sort === 'GENOMIC_ASC') {
    const leftRegion = left.short.main_reference_region
    const rightRegion = right.short.main_reference_region
    return (
      chromRank(leftRegion.chrom) - chromRank(rightRegion.chrom) ||
      Number(leftRegion.start) - Number(rightRegion.start) ||
      Number(leftRegion.stop) - Number(rightRegion.stop) ||
      stable
    )
  }
  if (sort === 'MOTIF_ASC') {
    return (
      left.short.reference_repeat_unit.length - right.short.reference_repeat_unit.length ||
      left.short.reference_repeat_unit.localeCompare(right.short.reference_repeat_unit) ||
      stable
    )
  }
  if (sort === 'HGSVC_HPRC_STATUS') {
    return compareCohortResult(left.cohorts.hgsvc_hprc, right.cohorts.hgsvc_hprc) || stable
  }
  if (sort === 'AOU_STATUS') {
    return compareCohortResult(left.cohorts.aou, right.cohorts.aou) || stable
  }
  return stable
}

export const buildLongReadTrReferenceConnection = async (
  args: any,
  esClient: object,
  getSource: (cohort: 'hgsvc_hprc' | 'aou', chrom: string) => Promise<Y1SourceSnapshot | null>
) => {
  const first = args.first == null ? 50 : args.first
  if (!Number.isInteger(first) || first < 1 || first > LONG_READ_TR_REFERENCE_MAX_FIRST) {
    throw new UserVisibleError(`first must be between 1 and ${LONG_READ_TR_REFERENCE_MAX_FIRST}`)
  }
  const catalogState = await loadCatalogState(esClient)
  const sourceKeys = new Map<string, Promise<Y1SourceSnapshot | null>>()
  for (const row of artifact.rows) {
    const chrom = `chr${normalizedChrom(row.short.main_reference_region.chrom)}`
    for (const cohort of ['hgsvc_hprc', 'aou'] as const) {
      const key = `${cohort}\u0000${chrom}`
      if (!sourceKeys.has(key)) sourceKeys.set(key, getSource(cohort, chrom))
    }
  }
  const sources = new Map<string, Y1SourceSnapshot | null>()
  await Promise.all(
    [...sourceKeys].map(async ([key, promise]) => {
      sources.set(key, await promise)
    })
  )

  let rows = artifact.rows.map((row) => {
    const chrom = `chr${normalizedChrom(row.short.main_reference_region.chrom)}`
    const cohorts = Object.fromEntries(
      (['hgsvc_hprc', 'aou'] as const).map((cohort) => {
        const result = row.cohorts[cohort]
        let validated: CohortResult
        if (!catalogState.available) {
          validated = unavailableResult(result, catalogState.reason || 'CATALOG_UNAVAILABLE')
        } else {
          const source = sources.get(`${cohort}\u0000${chrom}`) || null
          validated = sourceMatches(result, source)
            ? result
            : unavailableResult(result, source ? 'SOURCE_PROVENANCE_MISMATCH' : 'SOURCE_UNAVAILABLE')
        }
        return [
          cohort,
          {
            ...validated,
            canonical_ids: [...new Set(validated.candidates.map((candidate) => candidate.canonical_id))],
          },
        ]
      })
    ) as unknown as { hgsvc_hprc: ValidatedCohortResult; aou: ValidatedCohortResult }
    return { ...row, cohorts }
  })
  const query = String(args.query || '').trim().toLowerCase()
  if (query) rows = rows.filter((row) => rowSearchText(row).includes(query))
  if (args.chrom) {
    const chrom = normalizedChrom(args.chrom)
    rows = rows.filter((row) => normalizedChrom(row.short.main_reference_region.chrom) === chrom)
  }
  rows = rows.filter((row) => matchesStatusFilter(row, args.match_status))
  rows.sort(compareRows(args.sort || 'SHORT_ID_ASC'))

  const fingerprint = cursorFingerprint(args)
  const offset = decodeReferenceCursor(args.after, fingerprint)
  if (offset > rows.length) throw new UserVisibleError('Invalid long-read TR reference cursor')
  const page = rows.slice(offset, offset + first)
  const endOffset = offset + page.length
  return {
    nodes: page.map((row) => ({
      id: row.short.id,
      gene_symbol: row.short.gene?.symbol || null,
      reference_region: row.short.main_reference_region,
      reference_repeat_unit: row.short.reference_repeat_unit,
      associated_diseases: row.short.associated_diseases,
      short_record: row.short,
      hgsvc_hprc: row.cohorts.hgsvc_hprc,
      aou: row.cohorts.aou,
    })),
    total_count: rows.length,
    page_info: {
      has_next_page: endOffset < rows.length,
      end_cursor: endOffset < rows.length ? encodeReferenceCursor(endOffset, fingerprint) : null,
    },
    provenance: {
      ...artifact.catalog,
      reference_genome: artifact.provenance.reference_genome,
      coordinate_system: artifact.provenance.coordinate_system,
      motif_identity: artifact.provenance.motif_identity,
      catalog_available: catalogState.available,
      catalog_unavailable_reason: catalogState.reason,
    },
  }
}

const contextCache = new WeakMap<object, Promise<any>>()

export const resolveLongReadTrShortReadContext = (
  locus: any,
  esClient: object,
  getSource: (cohort: 'hgsvc_hprc' | 'aou', chrom: string) => Promise<Y1SourceSnapshot | null>
) => {
  const cached = contextCache.get(locus)
  if (cached) return cached
  const promise = (async () => {
    const catalogState = await loadCatalogState(esClient)
    const base = {
      catalog_dataset: 'gnomad_r4',
      catalog_source: artifact.catalog.source,
      catalog_digest: artifact.catalog.compact_sha256,
      candidates: [] as Candidate[],
      pathogenic_component_highlight: false,
    }
    if (!catalogState.available) {
      return { ...base, status: 'CATALOG_UNAVAILABLE', reason_code: catalogState.reason }
    }
    let source: Y1SourceSnapshot | null
    try {
      source = await getSource(locus.lr_cohort, `chr${normalizedChrom(locus.chrom)}`)
    } catch {
      return { ...base, status: 'CATALOG_UNAVAILABLE', reason_code: 'SOURCE_UNAVAILABLE' }
    }
    const containing = artifact.rows.flatMap((row) => {
      const result = row.cohorts[locus.lr_cohort as 'hgsvc_hprc' | 'aou']
      return result.candidates
        .filter((candidate) => candidate.canonical_id === locus.id)
        .map((candidate) => ({ row, result, candidate }))
    })
    if (!containing.length) return { ...base, status: 'NONE', reason_code: 'NO_EXACT_COMPONENT' }
    if (!source || containing.some(({ result }) => !sourceMatches(result, source))) {
      return {
        ...base,
        status: 'CATALOG_UNAVAILABLE',
        reason_code: source ? 'SOURCE_PROVENANCE_MISMATCH' : 'SOURCE_UNAVAILABLE',
        candidates: containing.map(({ candidate }) => candidate),
      }
    }
    const valid = containing.filter(({ result }) => result.status === 'EXACT_UNIQUE')
    if (valid.length !== 1 || containing.length !== 1) {
      return {
        ...base,
        status: containing.some(({ result }) => result.status === 'AMBIGUOUS_CATALOG')
          ? 'AMBIGUOUS_CATALOG'
          : 'AMBIGUOUS_COMPONENT',
        reason_code: 'NON_BIJECTIVE_EXACT_IDENTITY',
        candidates: containing.map(({ candidate }) => candidate),
      }
    }
    const { row, candidate } = valid[0]
    let record: any
    try {
      record = await fetchShortTandemRepeatById(esClient, 'gnomad_r4', row.short.id)
    } catch {
      return { ...base, status: 'CATALOG_UNAVAILABLE', reason_code: 'CATALOG_DETAIL_UNAVAILABLE' }
    }
    if (!record) {
      return { ...base, status: 'CATALOG_UNAVAILABLE', reason_code: 'CATALOG_DETAIL_UNAVAILABLE' }
    }
    if (JSON.stringify(normalizeShortCatalogRows([record])[0]) !== JSON.stringify(row.short)) {
      return { ...base, status: 'CATALOG_UNAVAILABLE', reason_code: 'CATALOG_DETAIL_DIGEST_MISMATCH' }
    }
    const regions = Array.isArray(record.reference_regions) && record.reference_regions.length
      ? record.reference_regions
      : [record.main_reference_region]
    const exactIndices = regions.flatMap((region: any, index: number) =>
      exactRegion(region, candidate.matched_component) &&
      record.reference_repeat_unit === candidate.matched_component.motif
        ? [index]
        : []
    )
    if (exactIndices.length !== 1) {
      return {
        ...base,
        status: 'AMBIGUOUS_COMPONENT',
        reason_code: 'CATALOG_DETAIL_REFERENCE_REGION_MISMATCH',
        candidates: [candidate],
      }
    }
    const pathogenic =
      record.reference_repeat_unit === candidate.matched_component.motif &&
      (record.repeat_units || []).some(
        (unit: any) =>
          unit.repeat_unit === candidate.matched_component.motif && unit.classification === 'pathogenic'
      )
    return {
      ...base,
      status: 'EXACT_UNIQUE',
      reason_code: null,
      catalog_record: record,
      matched_component_index: candidate.matched_component_index,
      matched_component: candidate.matched_component,
      matched_reference_region_index: exactIndices[0],
      pathogenic_component_highlight: pathogenic,
      candidates: [candidate],
      lr_database: source!.database,
      lr_release: source!.release,
      lr_run_id: source!.run_id,
      lr_cohort: source!.cohort,
    }
  })()
  contextCache.set(locus, promise)
  return promise
}

export const legacyMatchesFromContext = async (contextPromise: Promise<any>) => {
  const context = await contextPromise
  if (context.status !== 'EXACT_UNIQUE' || !context.catalog_record) return []
  const record = context.catalog_record
  return [
    {
      id: record.id,
      gene_symbol: record.gene?.symbol || null,
      reference_repeat_unit: record.reference_repeat_unit,
      stripy_id: record.stripy_id || null,
      strchive_id: record.strchive_id || null,
    },
  ]
}

export const resetLongReadTrReferenceCachesForTests = () => {
  // WeakMap entries are tied to test-local clients and response objects; this function
  // exists as an explicit lifecycle seam without retaining those objects globally.
}

export const longReadTrReferenceArtifactForTests = artifact

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
  distribution_receipt: {
    sha256: string
    serialized_bytes: number
    allele_source_rows: number
    genotype_source_rows: number
    allele_bins: number
    genotype_bins: number
  }
  cohorts: { hgsvc_hprc: CohortResult; aou: CohortResult }
}
type ExpectedSource = {
  cohort: 'hgsvc_hprc' | 'aou'
  chrom: string
  source_database: string
  source_release: string
  source_run_id: string
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
  distribution: any
  provenance: any
  reconciliation: any
  sources: ExpectedSource[]
  rows: ArtifactRow[]
}

const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as CrosswalkArtifact
if (
  artifact.schema_version !== 3 ||
  artifact.catalog.dataset !== 'gnomad_r4' ||
  artifact.catalog.row_count !== artifact.rows.length ||
  artifact.rows.length !== 78 ||
  artifact.catalog.hard_ceiling > 500 ||
  artifact.distribution?.limits?.max_serialized_bytes !== 2 * 1024 * 1024 ||
  artifact.distribution?.limits?.max_total_bins !== 20000 ||
  artifact.rows.some((row) => !/^[0-9a-f]{64}$/.test(row.distribution_receipt?.sha256 || ''))
) {
  throw new Error('Invalid long-read TR reference crosswalk artifact')
}

const normalizedChrom = (value: unknown) => String(value).replace(/^chr/i, '').toUpperCase()
const exactRegion = (region: any, component: Component) =>
  region?.reference_genome === 'GRCh38' &&
  normalizedChrom(region.chrom) === normalizedChrom(component.chrom) &&
  Number(region.start) === component.start0 &&
  Number(region.stop) === component.end0

const requireOwn = (value: any, key: string, context: string) => {
  if (value == null || !Object.prototype.hasOwnProperty.call(value, key)) {
    throw new Error(`${context} is missing required transfer field ${key}`)
  }
  return value[key]
}

const normalizeRegion = (region: any, context: string) => {
  requireOwn(region, 'reference_genome', context)
  requireOwn(region, 'chrom', context)
  requireOwn(region, 'start', context)
  requireOwn(region, 'stop', context)
  return {
    reference_genome: region.reference_genome,
    chrom: region.chrom,
    start: Number(region.start),
    stop: Number(region.stop),
  }
}

export const normalizeShortCatalogRows = (rows: any[]) =>
  rows
    .map((row, rowIndex) => {
      const context = `catalog row ${row?.id || rowIndex}`
      for (const key of [
        'id',
        'gene',
        'associated_diseases',
        'main_reference_region',
        'reference_regions',
        'reference_repeat_unit',
        'repeat_units',
      ]) {
        requireOwn(row, key, context)
      }
      if (!Array.isArray(row.associated_diseases)) {
        throw new Error(`${context} associated_diseases is not an array`)
      }
      if (!Array.isArray(row.reference_regions) || !row.reference_regions.length) {
        throw new Error(`${context} reference_regions is not a non-empty array`)
      }
      if (!Array.isArray(row.repeat_units) || !row.repeat_units.length) {
        throw new Error(`${context} repeat_units is not a non-empty array`)
      }
      return {
        id: String(row.id),
        gene: {
          ensembl_id: requireOwn(row.gene, 'ensembl_id', `${context} gene`),
          symbol: requireOwn(row.gene, 'symbol', `${context} gene`),
          region: requireOwn(row.gene, 'region', `${context} gene`),
        },
        associated_diseases: row.associated_diseases.map((disease: any, diseaseIndex: number) => {
          const diseaseContext = `${context} disease ${diseaseIndex}`
          for (const key of ['name', 'symbol', 'inheritance_mode', 'repeat_size_classifications']) {
            requireOwn(disease, key, diseaseContext)
          }
          if (!Array.isArray(disease.repeat_size_classifications)) {
            throw new Error(`${diseaseContext} repeat_size_classifications is not an array`)
          }
          return {
            name: disease.name,
            symbol: disease.symbol,
            omim_id: disease.omim_id == null ? null : disease.omim_id,
            inheritance_mode: disease.inheritance_mode,
            notes: disease.notes == null ? null : disease.notes,
            repeat_size_classifications: disease.repeat_size_classifications.map(
              (classification: any, classificationIndex: number) => {
                const classificationContext = `${diseaseContext} classification ${classificationIndex}`
                requireOwn(classification, 'classification', classificationContext)
                if (
                  !Object.prototype.hasOwnProperty.call(classification, 'min') &&
                  !Object.prototype.hasOwnProperty.call(classification, 'max')
                ) {
                  throw new Error(`${classificationContext} is missing both min and max`)
                }
                return {
                  classification: classification.classification,
                  min: classification.min == null ? null : Number(classification.min),
                  max: classification.max == null ? null : Number(classification.max),
                }
              }
            ),
          }
        }),
        stripy_id: row.stripy_id == null ? null : row.stripy_id,
        strchive_id: row.strchive_id == null ? null : row.strchive_id,
        main_reference_region: normalizeRegion(row.main_reference_region, `${context} main region`),
        reference_regions: row.reference_regions.map((region: any, index: number) =>
          normalizeRegion(region, `${context} reference region ${index}`)
        ),
        reference_repeat_unit: String(row.reference_repeat_unit),
        repeat_units: row.repeat_units.map((unit: any, index: number) => {
          requireOwn(unit, 'repeat_unit', `${context} repeat unit ${index}`)
          requireOwn(unit, 'classification', `${context} repeat unit ${index}`)
          return { repeat_unit: unit.repeat_unit, classification: unit.classification }
        }),
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id))

export const compactCatalogSha256 = (rows: any[]) =>
  createHash('sha256')
    .update(JSON.stringify(normalizeShortCatalogRows(rows)))
    .digest('hex')

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

const sourceKey = (cohort: string, chrom: string) => `${cohort}\u0000chr${normalizedChrom(chrom)}`

const expectedSources = new Map<string, ExpectedSource>()
for (const source of artifact.sources || []) {
  const key = sourceKey(source.cohort, source.chrom)
  if (expectedSources.has(key)) throw new Error(`Duplicate crosswalk source identity ${key}`)
  expectedSources.set(key, source)
}
if (expectedSources.size !== 48) {
  throw new Error('Invalid long-read TR reference source identity bundle')
}

const sourceMatches = (
  result: Pick<CohortResult, 'source_database' | 'source_release' | 'source_run_id'>,
  source: Y1SourceSnapshot | null
) =>
  !!source &&
  source.reference_genome === 'GRCh38' &&
  source.database === result.source_database &&
  source.release === result.source_release &&
  source.run_id === result.source_run_id

const componentMatches = (left: any, right: Component | undefined) =>
  !!left &&
  !!right &&
  normalizedChrom(left.chrom) === normalizedChrom(right.chrom) &&
  Number(left.start0) === right.start0 &&
  Number(left.end0) === right.end0 &&
  String(left.motif) === right.motif

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
    .update(
      JSON.stringify([
        args.query || '',
        args.chrom || '',
        args.match_status || '',
        args.sort || 'SHORT_ID_ASC',
      ])
    )
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
  type SourceLookup = { source: Y1SourceSnapshot | null; failed: boolean }
  const sourceKeys = new Map<string, Promise<SourceLookup>>()
  for (const row of artifact.rows) {
    const chrom = `chr${normalizedChrom(row.short.main_reference_region.chrom)}`
    for (const cohort of ['hgsvc_hprc', 'aou'] as const) {
      const key = sourceKey(cohort, chrom)
      if (!sourceKeys.has(key)) {
        sourceKeys.set(
          key,
          Promise.resolve()
            .then(() => getSource(cohort, chrom))
            .then((source) => ({ source, failed: false }))
            .catch(() => ({ source: null, failed: true }))
        )
      }
    }
  }
  const sources = new Map<string, SourceLookup>()
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
          const lookup = sources.get(sourceKey(cohort, chrom)) || { source: null, failed: true }
          validated = sourceMatches(result, lookup.source)
            ? result
            : unavailableResult(
                result,
                lookup.source ? 'SOURCE_PROVENANCE_MISMATCH' : 'SOURCE_UNAVAILABLE'
              )
        }
        return [
          cohort,
          {
            ...validated,
            canonical_ids: [
              ...new Set(validated.candidates.map((candidate) => candidate.canonical_id)),
            ],
          },
        ]
      })
    ) as unknown as { hgsvc_hprc: ValidatedCohortResult; aou: ValidatedCohortResult }
    return { ...row, cohorts }
  })
  const query = String(args.query || '')
    .trim()
    .toLowerCase()
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
      exact_reference_component_outline_authorized: false,
      matched_reference_repeat_unit_classifications: [] as string[],
      // Deprecated compatibility field. New clients authorize the neutral identity outline above.
      pathogenic_component_highlight: false,
    }
    if (!catalogState.available) {
      return { ...base, status: 'CATALOG_UNAVAILABLE', reason_code: catalogState.reason }
    }

    const cohort = locus.lr_cohort as 'hgsvc_hprc' | 'aou'
    const chrom = `chr${normalizedChrom(locus.chrom)}`
    const expectedSource = expectedSources.get(sourceKey(cohort, chrom))
    let source: Y1SourceSnapshot | null
    try {
      source = await getSource(cohort, chrom)
    } catch {
      return { ...base, status: 'UNAVAILABLE', reason_code: 'SOURCE_UNAVAILABLE' }
    }
    if (!expectedSource || !source) {
      return { ...base, status: 'UNAVAILABLE', reason_code: 'SOURCE_UNAVAILABLE' }
    }
    if (!sourceMatches(expectedSource, source)) {
      return { ...base, status: 'UNAVAILABLE', reason_code: 'SOURCE_PROVENANCE_MISMATCH' }
    }

    const containing = artifact.rows.flatMap((row) => {
      const result = row.cohorts[cohort]
      return result.candidates.some((candidate) => candidate.canonical_id === locus.id)
        ? [{ row, result }]
        : []
    })
    if (!containing.length) return { ...base, status: 'NONE', reason_code: 'NO_EXACT_COMPONENT' }

    const candidates = containing.flatMap(({ result }) => result.candidates)
    if (containing.some(({ result }) => !sourceMatches(result, source))) {
      return {
        ...base,
        status: 'UNAVAILABLE',
        reason_code: 'SOURCE_PROVENANCE_MISMATCH',
        candidates,
      }
    }
    const nonExactStatus = (['MULTIPLE', 'AMBIGUOUS_CATALOG', 'AMBIGUOUS_COMPONENT'] as const).find(
      (status) => containing.some(({ result }) => result.status === status)
    )
    if (nonExactStatus) {
      const reasons = [
        ...new Set(containing.map(({ result }) => result.reason_code).filter(Boolean)),
      ]
      return {
        ...base,
        status: nonExactStatus,
        reason_code: reasons.length === 1 ? reasons[0] : 'NON_BIJECTIVE_EXACT_IDENTITY',
        candidates,
      }
    }

    const valid = containing.flatMap(({ row, result }) =>
      result.status === 'EXACT_UNIQUE'
        ? result.candidates
            .filter((candidate) => candidate.canonical_id === locus.id)
            .map((candidate) => ({ row, result, candidate }))
        : []
    )
    if (valid.length !== 1 || containing.length !== 1 || candidates.length !== 1) {
      return {
        ...base,
        status: 'AMBIGUOUS_COMPONENT',
        reason_code: 'NON_BIJECTIVE_EXACT_IDENTITY',
        candidates,
      }
    }
    const { row, candidate } = valid[0]
    if (
      !Number.isInteger(candidate.matched_component_index) ||
      !componentMatches(
        locus.components?.[candidate.matched_component_index],
        candidate.matched_component
      )
    ) {
      return {
        ...base,
        status: 'AMBIGUOUS_COMPONENT',
        reason_code: 'LR_LOCUS_COMPONENT_MISMATCH',
        candidates: [candidate],
      }
    }

    let record: any
    try {
      record = await fetchShortTandemRepeatById(esClient, 'gnomad_r4', row.short.id)
    } catch {
      return { ...base, status: 'CATALOG_UNAVAILABLE', reason_code: 'CATALOG_DETAIL_UNAVAILABLE' }
    }
    if (!record) {
      return { ...base, status: 'CATALOG_UNAVAILABLE', reason_code: 'CATALOG_DETAIL_UNAVAILABLE' }
    }
    let normalizedRecord: any
    try {
      normalizedRecord = normalizeShortCatalogRows([record])[0]
    } catch {
      return {
        ...base,
        status: 'CATALOG_UNAVAILABLE',
        reason_code: 'CATALOG_DETAIL_DIGEST_MISMATCH',
      }
    }
    if (JSON.stringify(normalizedRecord) !== JSON.stringify(row.short)) {
      return {
        ...base,
        status: 'CATALOG_UNAVAILABLE',
        reason_code: 'CATALOG_DETAIL_DIGEST_MISMATCH',
      }
    }
    const exactIndices = normalizedRecord.reference_regions.flatMap((region: any, index: number) =>
      exactRegion(region, candidate.matched_component) &&
      normalizedRecord.reference_repeat_unit === candidate.matched_component.motif
        ? [index]
        : []
    )
    // The validated detail record's unique exact index is authoritative for the response.
    if (exactIndices.length !== 1) {
      return {
        ...base,
        status: 'AMBIGUOUS_COMPONENT',
        reason_code: 'CATALOG_DETAIL_REFERENCE_REGION_MISMATCH',
        candidates: [candidate],
      }
    }
    const validatedCandidate = {
      ...candidate,
      matched_reference_region_index: exactIndices[0],
    }
    const matchedReferenceRepeatUnitClassifications = normalizedRecord.repeat_units
      .filter((unit: any) => unit.repeat_unit === candidate.matched_component.motif)
      .map((unit: any) => unit.classification)
    const pathogenic = matchedReferenceRepeatUnitClassifications.includes('pathogenic')
    return {
      ...base,
      status: 'EXACT_UNIQUE',
      reason_code: null,
      catalog_record: record,
      matched_component_index: candidate.matched_component_index,
      matched_component: candidate.matched_component,
      matched_reference_region_index: exactIndices[0],
      exact_reference_component_outline_authorized: true,
      matched_reference_repeat_unit_classifications: matchedReferenceRepeatUnitClassifications,
      pathogenic_component_highlight: pathogenic,
      candidates: [validatedCandidate],
      lr_database: source.database,
      lr_release: source.release,
      lr_run_id: source.run_id,
      lr_cohort: source.cohort,
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

import { createHash } from 'node:crypto'
import { UserVisibleError } from '../errors'
import { parseTrLocusId } from '../../../dataset-metadata/longReadTrLocusId'
import type { Y1SourceSnapshot } from './long_read_y1_provenance'
import {
  longReadTrReferenceArtifactForTests,
  normalizeShortCatalogRows,
} from './long_read_tr_reference'
import { fetchShortTandemRepeatDetailReceipt } from './short-tandem-repeat-queries'

const artifact: any = longReadTrReferenceArtifactForTests
const CACHE_MS = 300_000
const CACHE_MAX_ITEMS = 100
const RESPONSE_SAFETY_BYTES = 1024

const normalizedChrom = (value: unknown) => String(value).replace(/^chr/i, '').toUpperCase()
const exactRegion = (region: any, component: any) =>
  region?.reference_genome === 'GRCh38' &&
  normalizedChrom(region.chrom) === normalizedChrom(component.chrom) &&
  Number(region.start) === Number(component.start0) &&
  Number(region.stop) === Number(component.end0)

const sourceMatches = (result: any, source: Y1SourceSnapshot | null) =>
  !!source &&
  source.reference_genome === 'GRCh38' &&
  source.database === result.source_database &&
  source.release === result.source_release &&
  source.run_id === result.source_run_id

const exactContexts = new Map<string, any>()
const ambiguousContexts = new Set<string>()
for (const row of artifact.rows) {
  for (const cohort of ['hgsvc_hprc', 'aou']) {
    const result = row.cohorts[cohort]
    if (result.status === 'EXACT_UNIQUE' && result.candidates.length === 1) {
      const candidate = result.candidates[0]
      const key = `${cohort}\u0000${candidate.canonical_id}`
      if (exactContexts.has(key)) {
        exactContexts.delete(key)
        ambiguousContexts.add(key)
      } else if (!ambiguousContexts.has(key)) {
        exactContexts.set(key, { row, result, candidate })
      }
    }
  }
}

const artifactReceiptRows = artifact.rows
  .map((row: any) => ({ id: row.short.id, ...row.distribution_receipt }))
  .sort((left: any, right: any) => left.id.localeCompare(right.id))
const artifactReceiptDigest = createHash('sha256')
  .update(JSON.stringify(artifactReceiptRows))
  .digest('hex')
const distributionLimits = artifact.distribution?.limits
if (
  artifact.distribution?.source_index !== 'gnomad_v3_short_tandem_repeats' ||
  !artifact.distribution?.concrete_index ||
  !artifact.distribution?.index_uuid ||
  artifact.distribution?.surface?.join('\u0000') !==
    'allele_size_distribution\u0000genotype_distribution' ||
  artifact.distribution?.inventory_sha256 !== artifactReceiptDigest ||
  artifactReceiptRows.some(
    (row: any) =>
      row.serialized_bytes > distributionLimits?.max_serialized_bytes ||
      row.allele_bins + row.genotype_bins > distributionLimits?.max_total_bins ||
      row.allele_source_rows > distributionLimits?.max_allele_source_rows ||
      row.genotype_source_rows > distributionLimits?.max_genotype_source_rows
  )
) {
  throw new Error('Invalid short-read distribution provenance bundle')
}

type DistributionReceipt = {
  sha256: string
  serialized_bytes: number
  allele_source_rows: number
  genotype_source_rows: number
  allele_bins: number
  genotype_bins: number
}

export const shortReadDistributionReceipt = (record: any): DistributionReceipt | null => {
  const allele = record?.allele_size_distribution
  const genotype = record?.genotype_distribution
  if (!Array.isArray(allele) || !Array.isArray(genotype)) return null
  const serialized = JSON.stringify({
    allele_size_distribution: allele,
    genotype_distribution: genotype,
  })
  return {
    sha256: createHash('sha256').update(serialized).digest('hex'),
    serialized_bytes: Buffer.byteLength(serialized),
    allele_source_rows: allele.length,
    genotype_source_rows: genotype.length,
    allele_bins: allele.reduce(
      (total: number, row: any) =>
        total + (Array.isArray(row?.distribution) ? row.distribution.length : 0),
      0
    ),
    genotype_bins: genotype.reduce(
      (total: number, row: any) =>
        total + (Array.isArray(row?.distribution) ? row.distribution.length : 0),
      0
    ),
  }
}

const receiptMatches = (actual: DistributionReceipt, expected: DistributionReceipt) =>
  (Object.keys(expected) as (keyof DistributionReceipt)[]).every(
    (key) => actual[key] === expected[key]
  )

const finiteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const nonemptyString = (value: unknown) => typeof value === 'string' && value.length > 0
const positiveInteger = (value: unknown) => Number.isInteger(value) && Number(value) > 0
const integer = (value: unknown) => Number.isInteger(value)

const unavailablePart = (
  reason_code: string,
  sourceRows: number | null,
  sourceBins: number | null
) => ({
  status: 'UNAVAILABLE',
  reason_code,
  source_rows: sourceRows,
  source_bins: sourceBins,
  returned_rows: 0,
  returned_bins: 0,
  serialized_bytes: 2,
  distributions: [],
})

const sanitizeAllele = (record: any, motif: string, receipt: DistributionReceipt) => {
  const limits = artifact.distribution.limits
  if (receipt.allele_source_rows > limits.max_allele_source_rows) {
    return unavailablePart(
      'ALLELE_SOURCE_ROW_LIMIT_EXCEEDED',
      receipt.allele_source_rows,
      receipt.allele_bins
    )
  }
  const rows = record.allele_size_distribution.filter((row: any) => row?.repunit === motif)
  if (!rows.length) {
    return unavailablePart(
      'EXACT_ALLELE_MOTIF_MISSING',
      receipt.allele_source_rows,
      receipt.allele_bins
    )
  }
  const sanitized: any[] = []
  for (const row of rows) {
    if (
      !nonemptyString(row.ancestry_group) ||
      !nonemptyString(row.sex) ||
      !nonemptyString(row.quality_description) ||
      !finiteNumber(row.q_score) ||
      !Array.isArray(row.distribution)
    ) {
      return unavailablePart(
        'INVALID_ALLELE_SOURCE_ITEM',
        receipt.allele_source_rows,
        receipt.allele_bins
      )
    }
    const distribution = []
    for (const bin of row.distribution) {
      if (!integer(bin?.repunit_count) || !positiveInteger(bin?.frequency)) {
        return unavailablePart(
          'INVALID_ALLELE_SOURCE_ITEM',
          receipt.allele_source_rows,
          receipt.allele_bins
        )
      }
      distribution.push({ repunit_count: bin.repunit_count, frequency: bin.frequency })
    }
    sanitized.push({
      ancestry_group: row.ancestry_group,
      sex: row.sex,
      repunit: motif,
      quality_description: row.quality_description,
      q_score: row.q_score,
      distribution,
    })
  }
  const returnedBins = sanitized.reduce((total, row) => total + row.distribution.length, 0)
  if (!returnedBins) {
    return unavailablePart(
      'EXACT_ALLELE_BINS_MISSING',
      receipt.allele_source_rows,
      receipt.allele_bins
    )
  }
  const serializedBytes = Buffer.byteLength(JSON.stringify(sanitized))
  if (returnedBins > limits.max_total_bins) {
    return unavailablePart(
      'ALLELE_BIN_LIMIT_EXCEEDED',
      receipt.allele_source_rows,
      receipt.allele_bins
    )
  }
  if (serializedBytes > limits.max_serialized_bytes - RESPONSE_SAFETY_BYTES) {
    return unavailablePart(
      'ALLELE_BYTE_LIMIT_EXCEEDED',
      receipt.allele_source_rows,
      receipt.allele_bins
    )
  }
  return {
    status: 'AVAILABLE',
    reason_code: null,
    source_rows: receipt.allele_source_rows,
    source_bins: receipt.allele_bins,
    returned_rows: sanitized.length,
    returned_bins: returnedBins,
    serialized_bytes: serializedBytes,
    distributions: sanitized,
  }
}

const sanitizeGenotype = (record: any, motif: string, receipt: DistributionReceipt) => {
  const limits = artifact.distribution.limits
  if (receipt.genotype_source_rows > limits.max_genotype_source_rows) {
    return unavailablePart(
      'GENOTYPE_SOURCE_ROW_LIMIT_EXCEEDED',
      receipt.genotype_source_rows,
      receipt.genotype_bins
    )
  }
  const rows = record.genotype_distribution.filter(
    (row: any) => row?.short_allele_repunit === motif && row?.long_allele_repunit === motif
  )
  if (!rows.length) {
    return unavailablePart(
      'EXACT_GENOTYPE_MOTIF_PAIR_MISSING',
      receipt.genotype_source_rows,
      receipt.genotype_bins
    )
  }
  const sanitized: any[] = []
  for (const row of rows) {
    if (
      !nonemptyString(row.ancestry_group) ||
      !nonemptyString(row.sex) ||
      !nonemptyString(row.quality_description) ||
      !finiteNumber(row.q_score) ||
      !Array.isArray(row.distribution)
    ) {
      return unavailablePart(
        'INVALID_GENOTYPE_SOURCE_ITEM',
        receipt.genotype_source_rows,
        receipt.genotype_bins
      )
    }
    const distribution = []
    for (const bin of row.distribution) {
      if (
        !integer(bin?.short_allele_repunit_count) ||
        !integer(bin?.long_allele_repunit_count) ||
        !positiveInteger(bin?.frequency)
      ) {
        return unavailablePart(
          'INVALID_GENOTYPE_SOURCE_ITEM',
          receipt.genotype_source_rows,
          receipt.genotype_bins
        )
      }
      distribution.push({
        short_allele_repunit_count: bin.short_allele_repunit_count,
        long_allele_repunit_count: bin.long_allele_repunit_count,
        frequency: bin.frequency,
      })
    }
    sanitized.push({
      ancestry_group: row.ancestry_group,
      sex: row.sex,
      short_allele_repunit: motif,
      long_allele_repunit: motif,
      quality_description: row.quality_description,
      q_score: row.q_score,
      distribution,
    })
  }
  const returnedBins = sanitized.reduce((total, row) => total + row.distribution.length, 0)
  if (!returnedBins) {
    return unavailablePart(
      'EXACT_GENOTYPE_BINS_MISSING',
      receipt.genotype_source_rows,
      receipt.genotype_bins
    )
  }
  const serializedBytes = Buffer.byteLength(JSON.stringify(sanitized))
  if (returnedBins > limits.max_total_bins) {
    return unavailablePart(
      'GENOTYPE_BIN_LIMIT_EXCEEDED',
      receipt.genotype_source_rows,
      receipt.genotype_bins
    )
  }
  if (serializedBytes > limits.max_serialized_bytes - RESPONSE_SAFETY_BYTES) {
    return unavailablePart(
      'GENOTYPE_BYTE_LIMIT_EXCEEDED',
      receipt.genotype_source_rows,
      receipt.genotype_bins
    )
  }
  return {
    status: 'AVAILABLE',
    reason_code: null,
    source_rows: receipt.genotype_source_rows,
    source_bins: receipt.genotype_bins,
    returned_rows: sanitized.length,
    returned_bins: returnedBins,
    serialized_bytes: serializedBytes,
    distributions: sanitized,
  }
}

export const admitShortReadDistributions = (
  record: any,
  motif: string,
  expectedReceipt: DistributionReceipt
) => {
  const actualReceipt = shortReadDistributionReceipt(record)
  if (!actualReceipt) {
    return {
      reason_code: 'DISTRIBUTION_FIELDS_MISSING',
      receipt: null,
      allele: unavailablePart('DISTRIBUTION_FIELDS_MISSING', null, null),
      genotype: unavailablePart('DISTRIBUTION_FIELDS_MISSING', null, null),
    }
  }
  if (!receiptMatches(actualReceipt, expectedReceipt)) {
    return {
      reason_code: 'DISTRIBUTION_RECEIPT_MISMATCH',
      receipt: actualReceipt,
      allele: unavailablePart(
        'DISTRIBUTION_RECEIPT_MISMATCH',
        actualReceipt.allele_source_rows,
        actualReceipt.allele_bins
      ),
      genotype: unavailablePart(
        'DISTRIBUTION_RECEIPT_MISMATCH',
        actualReceipt.genotype_source_rows,
        actualReceipt.genotype_bins
      ),
    }
  }
  let allele = sanitizeAllele(record, motif, actualReceipt)
  let genotype = sanitizeGenotype(record, motif, actualReceipt)
  const limits = artifact.distribution.limits
  if (
    allele.status === 'AVAILABLE' &&
    genotype.status === 'AVAILABLE' &&
    allele.returned_bins + genotype.returned_bins > limits.max_total_bins
  ) {
    allele = unavailablePart(
      'TOTAL_BIN_LIMIT_EXCEEDED',
      actualReceipt.allele_source_rows,
      actualReceipt.allele_bins
    )
    genotype = unavailablePart(
      'TOTAL_BIN_LIMIT_EXCEEDED',
      actualReceipt.genotype_source_rows,
      actualReceipt.genotype_bins
    )
  }
  if (
    allele.status === 'AVAILABLE' &&
    genotype.status === 'AVAILABLE' &&
    allele.serialized_bytes + genotype.serialized_bytes >
      limits.max_serialized_bytes - RESPONSE_SAFETY_BYTES
  ) {
    if (allele.serialized_bytes >= genotype.serialized_bytes) {
      allele = unavailablePart(
        'TOTAL_BYTE_LIMIT_EXCEEDED',
        actualReceipt.allele_source_rows,
        actualReceipt.allele_bins
      )
    } else {
      genotype = unavailablePart(
        'TOTAL_BYTE_LIMIT_EXCEEDED',
        actualReceipt.genotype_source_rows,
        actualReceipt.genotype_bins
      )
    }
  }
  return { reason_code: null, receipt: actualReceipt, allele, genotype }
}

type DetailCacheEntry = { expires: number; promise: Promise<any> }
const detailCaches = new WeakMap<object, Map<string, DetailCacheEntry>>()

const fetchCachedDetail = (esClient: object, shortId: string, distributionDigest: string) => {
  let cache = detailCaches.get(esClient)
  if (!cache) {
    cache = new Map()
    detailCaches.set(esClient, cache)
  }
  const key = [
    artifact.catalog.dataset,
    artifact.catalog.compact_sha256,
    distributionDigest,
    shortId,
  ].join('\u0000')
  const now = Date.now()
  const existing = cache.get(key)
  if (existing && existing.expires > now) return existing.promise
  if (existing) cache.delete(key)
  while (cache.size >= CACHE_MAX_ITEMS) cache.delete(cache.keys().next().value)
  const promise = fetchShortTandemRepeatDetailReceipt(esClient, artifact.catalog.dataset, shortId)
  cache.set(key, { expires: now + CACHE_MS, promise })
  return promise
}

const emptyResponse = (status: string, reason_code: string) => ({
  status,
  reason_code,
  catalog_dataset: artifact.catalog.dataset,
  catalog_source: artifact.catalog.source,
  catalog_digest: artifact.catalog.compact_sha256,
  distribution_digest: null,
  distribution_source_index: artifact.distribution.source_index,
  distribution_concrete_index: artifact.distribution.concrete_index,
  distribution_index_uuid: artifact.distribution.index_uuid,
  short_id: null,
  matched_component_index: null,
  matched_component: null,
  main_reference_region: null,
  reference_repeat_unit: null,
  reference_repeat_count: null,
  source_serialized_bytes: null,
  source_total_bins: null,
  allele: unavailablePart(reason_code, null, null),
  genotype: unavailablePart(reason_code, null, null),
})

export const resolveLongReadTrShortReadDistributions = async (
  args: any,
  esClient: object,
  getSource: (cohort: 'hgsvc_hprc' | 'aou', chrom: string) => Promise<Y1SourceSnapshot | null>
) => {
  const parsed = parseTrLocusId(args.id)
  if (!parsed) throw new UserVisibleError('Invalid tandem-repeat locus ID')
  const cohort = args.lr_cohort as 'hgsvc_hprc' | 'aou'
  const key = `${cohort}\u0000${parsed.canonicalId}`
  if (ambiguousContexts.has(key)) {
    return emptyResponse('UNAVAILABLE', 'NON_BIJECTIVE_EXACT_IDENTITY')
  }
  const context = exactContexts.get(key)
  if (!context) return emptyResponse('NONE', 'NO_EXACT_MAIN_COMPONENT')
  const { row, result, candidate } = context
  const parsedComponent = parsed.components[candidate.matched_component_index]
  if (
    !parsedComponent ||
    normalizedChrom(parsedComponent.chrom) !== normalizedChrom(candidate.matched_component.chrom) ||
    parsedComponent.start0 !== candidate.matched_component.start0 ||
    parsedComponent.end0 !== candidate.matched_component.end0 ||
    parsedComponent.motif !== candidate.matched_component.motif ||
    !exactRegion(row.short.main_reference_region, candidate.matched_component) ||
    row.short.reference_repeat_unit !== candidate.matched_component.motif
  ) {
    return emptyResponse('UNAVAILABLE', 'EXACT_MAIN_COMPONENT_MISMATCH')
  }

  let source: Y1SourceSnapshot | null
  try {
    source = await getSource(cohort, `chr${normalizedChrom(candidate.matched_component.chrom)}`)
  } catch {
    return emptyResponse('UNAVAILABLE', 'SOURCE_UNAVAILABLE')
  }
  if (!source) return emptyResponse('UNAVAILABLE', 'SOURCE_UNAVAILABLE')
  if (!sourceMatches(result, source)) {
    return emptyResponse('UNAVAILABLE', 'SOURCE_PROVENANCE_MISMATCH')
  }

  let detail: any
  try {
    detail = await fetchCachedDetail(esClient, row.short.id, row.distribution_receipt.sha256)
  } catch {
    return emptyResponse('UNAVAILABLE', 'CATALOG_DETAIL_UNAVAILABLE')
  }
  if (!detail?.record) return emptyResponse('UNAVAILABLE', 'CATALOG_DETAIL_UNAVAILABLE')
  if (detail.concrete_index !== artifact.distribution.concrete_index) {
    return emptyResponse('UNAVAILABLE', 'DISTRIBUTION_PROVENANCE_MISMATCH')
  }

  let normalizedRecord: any
  try {
    normalizedRecord = normalizeShortCatalogRows([detail.record])[0]
  } catch {
    return emptyResponse('UNAVAILABLE', 'CATALOG_DETAIL_DIGEST_MISMATCH')
  }
  if (JSON.stringify(normalizedRecord) !== JSON.stringify(row.short)) {
    return emptyResponse('UNAVAILABLE', 'CATALOG_DETAIL_DIGEST_MISMATCH')
  }

  const admitted = admitShortReadDistributions(
    detail.record,
    row.short.reference_repeat_unit,
    row.distribution_receipt
  )
  if (admitted.reason_code) {
    const failed = emptyResponse('UNAVAILABLE', admitted.reason_code)
    return {
      ...failed,
      short_id: row.short.id,
      distribution_digest: row.distribution_receipt.sha256,
      allele: admitted.allele,
      genotype: admitted.genotype,
    }
  }

  const regionLength =
    Number(row.short.main_reference_region.stop) - Number(row.short.main_reference_region.start)
  const motifLength = row.short.reference_repeat_unit.length
  const response = {
    status: 'AVAILABLE',
    reason_code: null,
    catalog_dataset: artifact.catalog.dataset,
    catalog_source: artifact.catalog.source,
    catalog_digest: artifact.catalog.compact_sha256,
    distribution_digest: row.distribution_receipt.sha256,
    distribution_source_index: artifact.distribution.source_index,
    distribution_concrete_index: artifact.distribution.concrete_index,
    distribution_index_uuid: artifact.distribution.index_uuid,
    short_id: row.short.id,
    matched_component_index: candidate.matched_component_index,
    matched_component: candidate.matched_component,
    main_reference_region: row.short.main_reference_region,
    reference_repeat_unit: row.short.reference_repeat_unit,
    reference_repeat_count:
      motifLength > 0 && regionLength % motifLength === 0 ? regionLength / motifLength : null,
    source_serialized_bytes: admitted.receipt!.serialized_bytes,
    source_total_bins: admitted.receipt!.allele_bins + admitted.receipt!.genotype_bins,
    allele: admitted.allele,
    genotype: admitted.genotype,
  }
  if (
    Buffer.byteLength(JSON.stringify(response)) > artifact.distribution.limits.max_serialized_bytes
  ) {
    return {
      ...response,
      status: 'UNAVAILABLE',
      reason_code: 'RESPONSE_BYTE_LIMIT_EXCEEDED',
      allele: unavailablePart(
        'RESPONSE_BYTE_LIMIT_EXCEEDED',
        admitted.receipt!.allele_source_rows,
        admitted.receipt!.allele_bins
      ),
      genotype: unavailablePart(
        'RESPONSE_BYTE_LIMIT_EXCEEDED',
        admitted.receipt!.genotype_source_rows,
        admitted.receipt!.genotype_bins
      ),
    }
  }
  return response
}

export const longReadTrShortReadDistributionArtifactForTests = artifact

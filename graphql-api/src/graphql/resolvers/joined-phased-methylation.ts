import { joinedPhasedMethylationRoute, y1PrimaryManifests } from '../../clickhouse'
import {
  JOINED_PHASED_MAX_RECORDS,
  JOINED_PHASED_MAX_SAMPLES,
  JOINED_PHASED_MAX_SPAN_BP,
  type JoinedBrowserEntry,
  type JoinedPhasedMethylationRoute,
} from '../../joined_phased_methylation_config'
import type { SourcePhasedMethylationRoute } from '../../source_phased_methylation_config'
import { getY1SourceSnapshot } from '../../queries/long_read_y1_provenance'
import { joinedMethylationError } from '../joined-phased-methylation-errors'

let activeRoute: JoinedPhasedMethylationRoute | null = null

export const resetJoinedPhasedMethylation = () => {
  activeRoute = null
}
export const getJoinedPhasedMethylationRoute = () => activeRoute

const sameObject = (actual: any, expected: any, prefix: 'source' | 'source_index') =>
  actual.uri === expected[`${prefix}_uri`] &&
  actual.generation === expected[`${prefix}_generation`] &&
  actual.size_bytes === expected[`${prefix}_size_bytes`] &&
  actual.checksum_algorithm === expected[`${prefix}_checksum_algorithm`] &&
  actual.checksum === expected[`${prefix}_checksum`]

export const preflightJoinedPhasedMethylation = async (
  route: JoinedPhasedMethylationRoute,
  admittedRawRoute: SourcePhasedMethylationRoute | null,
  primaryManifests = y1PrimaryManifests,
  sourceSnapshot = getY1SourceSnapshot
) => {
  activeRoute = null
  if (
    !admittedRawRoute ||
    admittedRawRoute.database !== route.database ||
    admittedRawRoute.run_id !== route.run_id ||
    admittedRawRoute.receipt_path !== route.raw_receipt_path
  ) {
    throw new Error('Joined methylation requires the exact admitted raw source-labelled route')
  }
  if (!primaryManifests) throw new Error('Joined methylation requires exact primary manifests')
  for (const expected of route.receipt.browser_product.entries) {
    const manifest = primaryManifests.get(`hgsvc_hprc\u0000${expected.chrom}`)
    if (
      !manifest ||
      manifest.run_id !== expected.run_id ||
      manifest.manifest_sha256 !== expected.manifest_sha256 ||
      manifest.carrier_loading_status !== 'available' ||
      !sameObject(expected.vcf, manifest.source, 'source') ||
      !sameObject(expected.tbi, manifest.source, 'source_index')
    ) {
      throw new Error(`Joined methylation browser identity mismatch for ${expected.chrom}`)
    }
    const snapshot = await sourceSnapshot('hgsvc_hprc', expected.chrom)
    if (!snapshot?.carriers_available || snapshot.run_id !== expected.run_id) {
      throw new Error(`Joined methylation requires active primary carriers for ${expected.chrom}`)
    }
  }
  activeRoute = route
}

export type JoinedIdentity = {
  source_run_id: string
  source_completion_receipt_sha256: string
  source_manifest_sha256: string
  browser_vcf_manifest_bundle_sha256: string
  browser_vcf_manifest_sha256: string
  browser_vcf_run_id: string
  orientation_receipt_id: string
  orientation_receipt_sha256: string
  mapping_artifact_sha256: null
  mapping_scope: 'CHROMOSOME_WIDE'
}

const browserEntry = (
  route: JoinedPhasedMethylationRoute,
  chrom: string
): JoinedBrowserEntry | null =>
  route.receipt.browser_product.entries.find((entry) => entry.chrom === chrom) || null

export const joinedIdentity = (
  route: JoinedPhasedMethylationRoute,
  chrom: string
): JoinedIdentity => {
  const browser = browserEntry(route, chrom)
  if (!browser)
    throw joinedMethylationError(
      'JOINED_METHYLATION_CONTRACT_MISMATCH',
      `Joined methylation has no approved browser identity for ${chrom}`,
      {
        reason: 'missing_approved_browser_identity',
        source_run_id: route.run_id,
        orientation_receipt_sha256: route.orientation_receipt_sha256,
        chrom,
      }
    )
  return {
    source_run_id: route.run_id,
    source_completion_receipt_sha256: route.receipt.source_product.completion_receipt_sha256,
    source_manifest_sha256: route.receipt.source_product.source_manifest_sha256,
    browser_vcf_manifest_bundle_sha256:
      route.receipt.browser_product.primary_manifest_bundle_sha256,
    browser_vcf_manifest_sha256: browser.manifest_sha256,
    browser_vcf_run_id: browser.run_id,
    orientation_receipt_id: route.receipt.receipt_id,
    orientation_receipt_sha256: route.orientation_receipt_sha256,
    mapping_artifact_sha256: null,
    mapping_scope: 'CHROMOSOME_WIDE',
  }
}

export const joinedPhasedCapability = async (
  cohort: string | null | undefined,
  chromInput: string,
  route = activeRoute,
  sourceSnapshot = getY1SourceSnapshot
) => {
  const chrom = chromInput.startsWith('chr') ? chromInput : `chr${chromInput}`
  const common = {
    max_span_bp: JOINED_PHASED_MAX_SPAN_BP,
    max_samples: JOINED_PHASED_MAX_SAMPLES,
    max_records: JOINED_PHASED_MAX_RECORDS,
  }
  const unavailable = { ...common, source_sample_ids: [] as string[] }
  if (cohort === 'aou')
    return {
      ...unavailable,
      available: false,
      joinable_to_vcf: false,
      status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
      identity: null,
      reason: 'AoU is summary-only; joined HGSVC/HPRC methylation is never a fallback',
    }
  if (cohort !== 'hgsvc_hprc')
    throw joinedMethylationError(
      'BAD_USER_INPUT',
      'Joined methylation requires the hgsvc_hprc cohort'
    )
  if (!/^chr(?:[1-9]|1[0-9]|2[0-2]|X|Y)$/.test(chrom))
    throw joinedMethylationError('BAD_USER_INPUT', `Unknown joined methylation contig ${chrom}`)
  if (chrom === 'chrX' || chrom === 'chrY')
    return {
      ...unavailable,
      available: false,
      joinable_to_vcf: false,
      status: 'UNAVAILABLE_ORIENTATION_EXCLUDED_CONTIG',
      identity: null,
      reason: `${chrom} is excluded by the admitted orientation receipt`,
    }
  if (!route)
    return {
      ...unavailable,
      available: false,
      joinable_to_vcf: false,
      status: 'UNAVAILABLE_NOT_CONFIGURED',
      identity: null,
      reason: 'No admitted joined methylation route',
    }
  const primary = await sourceSnapshot('hgsvc_hprc', chrom)
  if (!primary?.carriers_available || primary.run_id !== browserEntry(route, chrom)?.run_id)
    return {
      ...unavailable,
      available: false,
      joinable_to_vcf: false,
      status: 'UNAVAILABLE_PRIMARY_CARRIERS',
      identity: null,
      reason: `Active primary carriers do not match the approved receipt for ${chrom}`,
    }
  return {
    ...common,
    available: true,
    joinable_to_vcf: true,
    status: 'AVAILABLE_CONFIRMED',
    identity: joinedIdentity(route, chrom),
    source_sample_ids: route.receipt.coverage.roster
      .filter((row) => row.source_status === 'source_present')
      .map((row) => row.sample_id),
    reason: 'Operator-approved chromosome-wide direct HAP1-to-GT1 and HAP2-to-GT2 mapping',
  }
}

export const joinedRegionScope = (
  chromInput: string,
  start: number,
  stop: number,
  sampleIds: string[],
  expectedReceiptSha256: string,
  route = activeRoute
) => {
  if (!route)
    throw joinedMethylationError(
      'JOINED_METHYLATION_CONTRACT_MISMATCH',
      'Joined methylation route is unavailable'
    )
  const chrom = chromInput.startsWith('chr') ? chromInput : `chr${chromInput}`
  if (!browserEntry(route, chrom))
    throw joinedMethylationError(
      'JOINED_METHYLATION_CONTRACT_MISMATCH',
      `Joined methylation is unavailable for ${chrom}`,
      {
        reason: 'chromosome_outside_admitted_browser_identity',
        source_run_id: route.run_id,
        orientation_receipt_sha256: route.orientation_receipt_sha256,
        chrom,
        start,
        stop,
      }
    )
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(stop) ||
    start < 1 ||
    stop < start ||
    stop - start + 1 > JOINED_PHASED_MAX_SPAN_BP
  )
    throw joinedMethylationError(
      'BAD_USER_INPUT',
      'Joined methylation range must be one-based (start >= 1), ordered, and at most 100 kb'
    )
  if (
    !Array.isArray(sampleIds) ||
    sampleIds.length < 1 ||
    sampleIds.length > JOINED_PHASED_MAX_SAMPLES
  )
    throw joinedMethylationError('BAD_USER_INPUT', 'Joined methylation requires 1 to 25 samples')
  if (new Set(sampleIds).size !== sampleIds.length)
    throw joinedMethylationError('BAD_USER_INPUT', 'Joined methylation sample IDs must be unique')
  if (expectedReceiptSha256 !== route.orientation_receipt_sha256)
    throw joinedMethylationError(
      'JOINED_METHYLATION_CONTRACT_MISMATCH',
      'Joined methylation orientation receipt is stale',
      {
        reason: 'stale_orientation_receipt',
        source_run_id: route.run_id,
        orientation_receipt_sha256: route.orientation_receipt_sha256,
        chrom,
        start,
        stop,
      }
    )
  const roster = new Map(
    route.receipt.coverage.roster.map((row) => [row.sample_id, row.source_status])
  )
  for (const sampleId of sampleIds)
    if (!roster.has(sampleId))
      throw joinedMethylationError(
        'BAD_USER_INPUT',
        `Unknown joined methylation sample ${sampleId}`
      )
  const completed_sample_ids = sampleIds.filter(
    (sampleId) => roster.get(sampleId) === 'source_present'
  )
  const unavailable_samples = sampleIds
    .filter((sampleId) => roster.get(sampleId) !== 'source_present')
    .map((sample_id) => {
      const status = roster.get(sample_id)
      return {
        sample_id,
        status:
          status === 'source_marked_skip'
            ? 'UNAVAILABLE_SOURCE_MARKED_SKIP'
            : 'UNAVAILABLE_NO_ASSAY_SOURCE',
        reason:
          status === 'source_marked_skip'
            ? 'Source inventory explicitly marks this sample skipped'
            : 'No phased methylation source output exists for this roster sample',
      }
    })
  return {
    chrom,
    start,
    stop,
    requested_sample_ids: [...sampleIds],
    completed_sample_ids,
    unavailable_samples,
  }
}

export type JoinedProjectionContract = {
  completed_sample_ids: string[]
  chrom: string
  start: number
  stop: number
  source_run_id?: string
  orientation_receipt_sha256?: string
}

const numeric = (value: unknown): number | null => {
  if (value === null || value === undefined || typeof value === 'boolean' || value === '')
    return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const projectJoinedRows = (rows: any[], contract: JoinedProjectionContract) => {
  if (rows.length > JOINED_PHASED_MAX_RECORDS)
    throw joinedMethylationError(
      'JOINED_METHYLATION_RESULT_TOO_LARGE',
      `Joined methylation result exceeds ${JOINED_PHASED_MAX_RECORDS} records`
    )
  const completed = new Set(contract.completed_sample_ids)
  const sourceKeys = new Set<string>()
  const biologicalKeys = new Set<string>()
  const mismatch = (reason: string) =>
    joinedMethylationError(
      'JOINED_METHYLATION_CONTRACT_MISMATCH',
      `Joined methylation row integrity mismatch: ${reason}`,
      {
        reason,
        source_run_id: contract.source_run_id,
        orientation_receipt_sha256: contract.orientation_receipt_sha256,
        chrom: contract.chrom,
        start: contract.start,
        stop: contract.stop,
      }
    )

  return rows.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw mismatch('malformed_row')
    const sourceRowKey = typeof row.source_row_key === 'string' ? row.source_row_key : ''
    const sample = typeof row.sample === 'string' ? row.sample : ''
    const chrom = typeof row.chr === 'string' ? row.chr : ''
    const rawStart0 = numeric(row.pos1)
    const rawEnd0 = numeric(row.pos2)
    const source = numeric(row.source_haplotype)
    const vcfStrand = numeric(row.vcf_strand)
    const methylation = numeric(row.methylation)
    const coverage = numeric(row.coverage)

    if (!/^[a-f0-9]{64}$/.test(sourceRowKey)) throw mismatch('invalid_source_row_key')
    if (sourceKeys.has(sourceRowKey)) throw mismatch('duplicate_source_row_key')
    sourceKeys.add(sourceRowKey)
    if (!completed.has(sample)) throw mismatch('sample_outside_completed_set')
    if (chrom !== contract.chrom) throw mismatch('wrong_chromosome')
    if (
      rawStart0 === null ||
      rawEnd0 === null ||
      !Number.isSafeInteger(rawStart0) ||
      !Number.isSafeInteger(rawEnd0) ||
      rawStart0 < 0 ||
      rawEnd0 !== rawStart0 + 1
    )
      throw mismatch('non_one_base_raw_bed_interval')
    const canonicalPos1 = rawStart0 + 1
    const canonicalPos2 = rawEnd0 + 1
    if (canonicalPos1 < contract.start || canonicalPos1 > contract.stop)
      throw mismatch('row_outside_requested_range')
    if ((source !== 1 && source !== 2) || vcfStrand !== source)
      throw mismatch('source_haplotype_vcf_strand_mismatch')
    if (methylation === null || methylation < 0 || methylation > 100)
      throw mismatch('invalid_methylation')
    if (coverage === null || !Number.isSafeInteger(coverage) || coverage < 0)
      throw mismatch('invalid_coverage')

    const biologicalKey = JSON.stringify([sample, chrom, canonicalPos1, source, vcfStrand])
    if (biologicalKeys.has(biologicalKey)) throw mismatch('duplicate_biological_observation')
    biologicalKeys.add(biologicalKey)

    return {
      source_row_key: sourceRowKey,
      chr: chrom,
      pos1: canonicalPos1,
      pos2: canonicalPos2,
      sample,
      methylation,
      coverage,
      source_haplotype: source === 1 ? 'HAP1' : 'HAP2',
      vcf_strand: vcfStrand,
      mapping_scope: 'CHROMOSOME_WIDE',
      phase_set: null,
    }
  })
}

export { joinedPhasedMethylationRoute }

import type { DiplotypeSample } from '../Haplotypes/haplotypeCompute'

export type JoinedPhasedMethylationIdentity = {
  source_run_id: string
  source_completion_receipt_sha256: string
  source_manifest_sha256: string
  browser_vcf_manifest_bundle_sha256: string
  browser_vcf_manifest_sha256: string
  browser_vcf_run_id: string
  orientation_receipt_id: string
  orientation_receipt_sha256: string
  mapping_artifact_sha256: string | null
  mapping_scope: 'CHROMOSOME_WIDE'
}

export type JoinedPhasedMethylationCapability = {
  available: boolean
  joinable_to_vcf: boolean
  status:
    | 'AVAILABLE_CONFIRMED'
    | 'UNAVAILABLE_NOT_CONFIGURED'
    | 'UNAVAILABLE_PRIMARY_CARRIERS'
    | 'UNAVAILABLE_ORIENTATION_EXCLUDED_CONTIG'
    | 'UNAVAILABLE_AOU_SUMMARY_ONLY'
  identity: JoinedPhasedMethylationIdentity | null
  source_sample_ids: string[]
  max_span_bp: number
  max_samples: number
  max_records: number
  reason: string
}

export type JoinedPhasedMethylationRecord = {
  source_row_key: string
  chr: string
  pos1: number
  pos2: number
  sample: string
  methylation: number
  coverage: number
  source_haplotype: 'HAP1' | 'HAP2'
  vcf_strand: 1 | 2
  mapping_scope: 'CHROMOSOME_WIDE'
  phase_set: null
}

export type JoinedPhasedMethylationUnavailableSample = {
  sample_id: string
  status: 'UNAVAILABLE_NO_ASSAY_SOURCE' | 'UNAVAILABLE_SOURCE_MARKED_SKIP'
  reason: string
}

export type JoinedPhasedMethylationRegion = {
  identity: JoinedPhasedMethylationIdentity
  requested_sample_ids: string[]
  completed_sample_ids: string[]
  unavailable_samples: JoinedPhasedMethylationUnavailableSample[]
  records: JoinedPhasedMethylationRecord[]
}

export type PerCopyMethylationSampleState =
  | { status: 'loading' }
  | { status: 'complete'; recordCount: number }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; code: string; reason: string }

export type PerCopyMethylationPoint = {
  copy: 'A' | 'B'
  pos1: number
  pos2: number
  meanMethylation: number
  meanCoverage: number
  sampleCount: number
  sourceHaplotypes: ('HAP1' | 'HAP2')[]
  vcfStrands: (1 | 2)[]
  mappingScope: 'CHROMOSOME_WIDE'
}

export const COPY_VARIANT_ROW_HEIGHT = 25
export const PER_COPY_METHYLATION_BAND_HEIGHT = 28
export const DIPLOID_ROW_PADDING = 8

export const diploidPerCopyLayout = (rowY: number, enabled: boolean) => {
  const variantABaseline = rowY + COPY_VARIANT_ROW_HEIGHT / 2
  const methylationABandTop = enabled ? rowY + COPY_VARIANT_ROW_HEIGHT : null
  const variantBTop =
    rowY + COPY_VARIANT_ROW_HEIGHT + (enabled ? PER_COPY_METHYLATION_BAND_HEIGHT : 0)
  const variantBBaseline = variantBTop + COPY_VARIANT_ROW_HEIGHT / 2
  const methylationBBandTop = enabled ? variantBTop + COPY_VARIANT_ROW_HEIGHT : null
  const afterCopies =
    variantBTop + COPY_VARIANT_ROW_HEIGHT + (enabled ? PER_COPY_METHYLATION_BAND_HEIGHT : 0)

  return {
    variantABaseline,
    methylationABandTop,
    variantBBaseline,
    methylationBBandTop,
    // Keep the ROH relationship mark clear of the methylation band while retaining it
    // between the two copy baselines.
    relationshipMarkY: enabled ? variantBTop + 4 : (variantABaseline + variantBBaseline) / 2,
    afterCopies,
    rowHeight: afterCopies - rowY + DIPLOID_ROW_PADDING,
  }
}

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const admittedSourceRosterComplete = (sampleIds: unknown): sampleIds is string[] =>
  Array.isArray(sampleIds) &&
  sampleIds.length === 231 &&
  sampleIds.every(nonEmptyString) &&
  new Set(sampleIds).size === sampleIds.length &&
  sampleIds.every((sampleId, index) => index === 0 || sampleIds[index - 1] < sampleId)

const admittedIdentityComplete = (
  identity: JoinedPhasedMethylationIdentity | null | undefined
): identity is JoinedPhasedMethylationIdentity =>
  Boolean(
    identity &&
      nonEmptyString(identity.source_run_id) &&
      nonEmptyString(identity.source_completion_receipt_sha256) &&
      nonEmptyString(identity.source_manifest_sha256) &&
      nonEmptyString(identity.browser_vcf_manifest_bundle_sha256) &&
      nonEmptyString(identity.browser_vcf_manifest_sha256) &&
      nonEmptyString(identity.browser_vcf_run_id) &&
      nonEmptyString(identity.orientation_receipt_id) &&
      nonEmptyString(identity.orientation_receipt_sha256) &&
      (identity.mapping_artifact_sha256 === null ||
        nonEmptyString(identity.mapping_artifact_sha256)) &&
      identity.mapping_scope === 'CHROMOSOME_WIDE'
  )

export const joinedCapabilityConfirmed = (
  capability: JoinedPhasedMethylationCapability | null | undefined
): capability is JoinedPhasedMethylationCapability & {
  identity: JoinedPhasedMethylationIdentity
} =>
  capability?.available === true &&
  capability.joinable_to_vcf === true &&
  capability.status === 'AVAILABLE_CONFIRMED' &&
  admittedIdentityComplete(capability.identity) &&
  admittedSourceRosterComplete(capability.source_sample_ids)

export type JoinedMethylationRegionUsability =
  | {
      usable: true
      capability: JoinedPhasedMethylationCapability & {
        identity: JoinedPhasedMethylationIdentity
      }
      reason: null
    }
  | { usable: false; reason: string }

export const inclusiveRegionSpanBp = (start: number, stop: number) => stop - start + 1

export const joinedMethylationUsabilityForRegion = (
  capability: JoinedPhasedMethylationCapability | null | undefined,
  regionSpanBp: number,
  isDiploidView: boolean
): JoinedMethylationRegionUsability => {
  if (!isDiploidView) return { usable: false, reason: 'Unavailable outside Diploid view' }
  if (!capability) return { usable: false, reason: 'Per-copy methylation capability is loading' }
  if (!joinedCapabilityConfirmed(capability)) {
    const claimsAvailability =
      capability.available === true &&
      capability.joinable_to_vcf === true &&
      capability.status === 'AVAILABLE_CONFIRMED'
    return {
      usable: false,
      reason: claimsAvailability
        ? 'Unavailable: capability identity is not admitted'
        : capability.reason || 'Per-copy methylation is unavailable',
    }
  }
  if (
    !Number.isInteger(capability.max_span_bp) ||
    !Number.isInteger(capability.max_samples) ||
    !Number.isInteger(capability.max_records) ||
    capability.max_span_bp <= 0 ||
    capability.max_samples <= 0 ||
    capability.max_records <= 0
  ) {
    return { usable: false, reason: 'Unavailable: capability limits are malformed' }
  }
  if (!Number.isFinite(regionSpanBp) || regionSpanBp < 0) {
    return { usable: false, reason: 'Unavailable: current region span is invalid' }
  }
  if (regionSpanBp > capability.max_span_bp) {
    return {
      usable: false,
      reason: `Unavailable: region spans ${regionSpanBp.toLocaleString()} bp; maximum is ${capability.max_span_bp.toLocaleString()} bp`,
    }
  }
  return { usable: true, capability, reason: null }
}

export const joinedMethylationRequestScope = ({
  cohort,
  chrom,
  start,
  stop,
  enabled,
  identity,
  mode = 'diploid',
}: {
  cohort: string
  chrom: string
  start: number
  stop: number
  enabled: boolean
  identity: JoinedPhasedMethylationIdentity | null
  mode?: string
}) =>
  JSON.stringify([
    'JOINED_PHASED',
    cohort,
    chrom,
    start,
    stop,
    mode,
    enabled,
    identity?.orientation_receipt_sha256 ?? null,
    identity?.orientation_receipt_id ?? null,
    identity?.source_run_id ?? null,
    identity?.source_completion_receipt_sha256 ?? null,
    identity?.source_manifest_sha256 ?? null,
    identity?.browser_vcf_manifest_bundle_sha256 ?? null,
    identity?.browser_vcf_manifest_sha256 ?? null,
    identity?.browser_vcf_run_id ?? null,
    identity?.mapping_artifact_sha256 ?? null,
    identity?.mapping_scope ?? null,
  ])

export const filterGroupsToSourceSamples = <T extends { samples: Array<{ sample_id: string }> }>(
  groups: readonly T[],
  sourceSampleIds: readonly string[]
): T[] => {
  const admitted = new Set(sourceSampleIds)
  return groups
    .map((group) => ({
      ...group,
      samples: group.samples.filter((sample) => admitted.has(sample.sample_id)),
    }))
    .filter((group) => group.samples.length > 0) as T[]
}

export type PerCopyLoadingProgress = {
  status: 'empty' | 'loading' | 'loaded' | 'error'
  terminalCount: number
  totalCount: number
  errorCodes: string[]
}

export const perCopyLoadingProgress = (
  sampleIds: readonly string[],
  sampleStates: ReadonlyMap<string, PerCopyMethylationSampleState>
): PerCopyLoadingProgress => {
  const uniqueIds = Array.from(new Set(sampleIds))
  const states = uniqueIds.map((sampleId) => sampleStates.get(sampleId))
  const errors = states.filter(
    (state): state is Extract<PerCopyMethylationSampleState, { status: 'error' }> =>
      state?.status === 'error'
  )
  const terminalCount = states.filter(
    (state) => state?.status === 'complete' || state?.status === 'unavailable'
  ).length
  if (uniqueIds.length === 0) {
    return { status: 'empty', terminalCount: 0, totalCount: 0, errorCodes: [] }
  }
  if (errors.length > 0) {
    return {
      status: 'error',
      terminalCount,
      totalCount: uniqueIds.length,
      errorCodes: Array.from(new Set(errors.map((error) => error.code))).sort(),
    }
  }
  return {
    status: terminalCount === uniqueIds.length ? 'loaded' : 'loading',
    terminalCount,
    totalCount: uniqueIds.length,
    errorCodes: [],
  }
}

export const deterministicSampleBatches = (
  sampleIds: readonly string[],
  maxSamples = 25
): string[][] => {
  if (maxSamples < 1 || maxSamples > 25) {
    throw new Error('Joined methylation batch size must be 1 to 25')
  }
  const sorted = Array.from(new Set(sampleIds)).sort((a, b) => a.localeCompare(b))
  const batches: string[][] = []
  for (let i = 0; i < sorted.length; i += maxSamples) {
    batches.push(sorted.slice(i, i + maxSamples))
  }
  return batches
}

const sameIdentitySet = (left: readonly string[], right: readonly string[]) => {
  const a = Array.from(new Set(left)).sort()
  const b = Array.from(new Set(right)).sort()
  return (
    a.length === left.length &&
    b.length === right.length &&
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  )
}

const identityFields: (keyof JoinedPhasedMethylationIdentity)[] = [
  'source_run_id',
  'source_completion_receipt_sha256',
  'source_manifest_sha256',
  'browser_vcf_manifest_bundle_sha256',
  'browser_vcf_manifest_sha256',
  'browser_vcf_run_id',
  'orientation_receipt_id',
  'orientation_receipt_sha256',
  'mapping_artifact_sha256',
  'mapping_scope',
]

const canonicalChromosome = (chrom: string) => {
  const withoutPrefix = chrom.trim().replace(/^chr/i, '').toUpperCase()
  return withoutPrefix === 'M' ? 'MT' : withoutPrefix
}

export type JoinedMethylationBatchExpectation = {
  requestedSampleIds: readonly string[]
  identity: JoinedPhasedMethylationIdentity
  chrom: string
  start: number
  stop: number
}

export const validateJoinedMethylationBatch = (
  region: JoinedPhasedMethylationRegion,
  expectation: JoinedMethylationBatchExpectation
) => {
  if (
    !region ||
    typeof region !== 'object' ||
    !admittedIdentityComplete(region.identity) ||
    !Array.isArray(region.requested_sample_ids) ||
    !Array.isArray(region.completed_sample_ids) ||
    !Array.isArray(region.unavailable_samples) ||
    !Array.isArray(region.records) ||
    region.requested_sample_ids.some((sampleId) => !nonEmptyString(sampleId)) ||
    region.completed_sample_ids.some((sampleId) => !nonEmptyString(sampleId))
  ) {
    throw new Error('JOINED_RESPONSE_SHAPE_MISMATCH')
  }
  if (identityFields.some((field) => region.identity[field] !== expectation.identity[field])) {
    throw new Error('JOINED_IDENTITY_MISMATCH')
  }
  if (!sameIdentitySet(region.requested_sample_ids, expectation.requestedSampleIds)) {
    throw new Error('JOINED_REQUEST_ACCOUNTING_MISMATCH')
  }
  if (
    region.unavailable_samples.some(
      (sample) =>
        !sample ||
        typeof sample !== 'object' ||
        !nonEmptyString(sample.sample_id) ||
        !nonEmptyString(sample.reason) ||
        !['UNAVAILABLE_NO_ASSAY_SOURCE', 'UNAVAILABLE_SOURCE_MARKED_SKIP'].includes(sample.status)
    )
  ) {
    throw new Error('JOINED_COMPLETION_ACCOUNTING_MISMATCH')
  }
  const unavailableIds = region.unavailable_samples.map((sample) => sample.sample_id)
  if (
    !sameIdentitySet(
      [...region.completed_sample_ids, ...unavailableIds],
      expectation.requestedSampleIds
    )
  ) {
    throw new Error('JOINED_COMPLETION_ACCOUNTING_MISMATCH')
  }
  const expectedChrom = canonicalChromosome(expectation.chrom)
  if (
    !expectedChrom ||
    !Number.isInteger(expectation.start) ||
    !Number.isInteger(expectation.stop) ||
    expectation.start < 1 ||
    expectation.stop < expectation.start
  ) {
    throw new Error('JOINED_REQUEST_REGION_MISMATCH')
  }
  const completed = new Set(region.completed_sample_ids)
  const recordIdentities = new Set<string>()
  const biologicalObservations = new Set<string>()
  const sourceRowKeys = new Set<string>()
  for (const record of region.records) {
    if (!record || typeof record !== 'object') {
      throw new Error('JOINED_RECORD_CONTRACT_MISMATCH')
    }
    const recordIdentity = joinedMethylationRecordIdentity(record)
    const biologicalObservation = JSON.stringify([
      record.sample,
      typeof record.chr === 'string' ? canonicalChromosome(record.chr) : null,
      record.pos1,
      record.source_haplotype,
      record.vcf_strand,
    ])
    if (
      !nonEmptyString(record.source_row_key) ||
      !nonEmptyString(record.chr) ||
      sourceRowKeys.has(record.source_row_key) ||
      recordIdentities.has(recordIdentity) ||
      biologicalObservations.has(biologicalObservation) ||
      canonicalChromosome(record.chr) !== expectedChrom ||
      !Number.isInteger(record.pos1) ||
      !Number.isInteger(record.pos2) ||
      record.pos1 < expectation.start ||
      record.pos1 > expectation.stop ||
      record.pos2 !== record.pos1 + 1 ||
      !nonEmptyString(record.sample) ||
      !completed.has(record.sample) ||
      !Number.isFinite(record.methylation) ||
      record.methylation < 0 ||
      record.methylation > 100 ||
      !Number.isFinite(record.coverage) ||
      record.coverage < 0 ||
      record.mapping_scope !== 'CHROMOSOME_WIDE' ||
      (record.vcf_strand !== 1 && record.vcf_strand !== 2) ||
      (record.source_haplotype !== 'HAP1' && record.source_haplotype !== 'HAP2') ||
      (record.source_haplotype === 'HAP1' ? record.vcf_strand !== 1 : record.vcf_strand !== 2) ||
      record.phase_set !== null
    ) {
      throw new Error('JOINED_RECORD_CONTRACT_MISMATCH')
    }
    sourceRowKeys.add(record.source_row_key)
    recordIdentities.add(recordIdentity)
    biologicalObservations.add(biologicalObservation)
  }
  return region
}

export const joinedMethylationRecordIdentity = (record: JoinedPhasedMethylationRecord) =>
  JSON.stringify([
    record.source_row_key,
    record.sample,
    record.chr,
    record.pos1,
    record.pos2,
    record.source_haplotype,
    record.vcf_strand,
  ])

export const aggregatePerCopyMethylation = (
  records: readonly JoinedPhasedMethylationRecord[],
  samples: readonly DiplotypeSample[]
): { A: PerCopyMethylationPoint[]; B: PerCopyMethylationPoint[] } => {
  const mappings = new Map(samples.map((sample) => [sample.sample_id, sample.strand_mapping]))
  const values = new Map<
    string,
    {
      copy: 'A' | 'B'
      pos1: number
      pos2: number
      bySample: Map<string, { methylation: number; coverage: number }>
      sourceHaplotypes: Set<'HAP1' | 'HAP2'>
      vcfStrands: Set<1 | 2>
    }
  >()

  for (const record of records) {
    // This narrower joined shape prevents sample-total and raw source rows from leaking in.
    if (
      record.mapping_scope !== 'CHROMOSOME_WIDE' ||
      record.phase_set !== null ||
      (record.vcf_strand !== 1 && record.vcf_strand !== 2) ||
      (record.source_haplotype !== 'HAP1' && record.source_haplotype !== 'HAP2') ||
      (record.source_haplotype === 'HAP1' ? record.vcf_strand !== 1 : record.vcf_strand !== 2)
    ) {
      continue
    }
    const mapping = mappings.get(record.sample)
    if (!mapping) continue
    const copy =
      mapping.strandA === record.vcf_strand
        ? 'A'
        : mapping.strandB === record.vcf_strand
        ? 'B'
        : null
    if (!copy) continue
    const key = `${copy}:${record.pos1}:${record.pos2}`
    const aggregate = values.get(key) || {
      copy,
      pos1: record.pos1,
      pos2: record.pos2,
      bySample: new Map(),
      sourceHaplotypes: new Set<'HAP1' | 'HAP2'>(),
      vcfStrands: new Set<1 | 2>(),
    }
    aggregate.bySample.set(record.sample, {
      methylation: record.methylation,
      coverage: record.coverage,
    })
    aggregate.sourceHaplotypes.add(record.source_haplotype)
    aggregate.vcfStrands.add(record.vcf_strand)
    values.set(key, aggregate)
  }

  const result: { A: PerCopyMethylationPoint[]; B: PerCopyMethylationPoint[] } = {
    A: [],
    B: [],
  }
  values.forEach((aggregate) => {
    const observations = [...aggregate.bySample.values()]
    if (observations.length === 0) return
    result[aggregate.copy].push({
      copy: aggregate.copy,
      pos1: aggregate.pos1,
      pos2: aggregate.pos2,
      meanMethylation:
        observations.reduce((sum, value) => sum + value.methylation, 0) / observations.length,
      meanCoverage:
        observations.reduce((sum, value) => sum + value.coverage, 0) / observations.length,
      sampleCount: observations.length,
      sourceHaplotypes: [...aggregate.sourceHaplotypes].sort(),
      vcfStrands: [...aggregate.vcfStrands].sort(),
      mappingScope: 'CHROMOSOME_WIDE',
    })
  })
  result.A.sort((a, b) => a.pos1 - b.pos1 || a.pos2 - b.pos2)
  result.B.sort((a, b) => a.pos1 - b.pos1 || a.pos2 - b.pos2)
  return result
}

export type PerCopyRowReadiness = 'loading' | 'error' | 'ready'

export const perCopyRowReadiness = (
  sampleIds: readonly string[],
  sampleStates: ReadonlyMap<string, PerCopyMethylationSampleState>
): PerCopyRowReadiness => {
  const states = sampleIds.map((sampleId) => sampleStates.get(sampleId))
  if (states.some((state) => state?.status === 'error')) return 'error'
  if (
    states.length === 0 ||
    states.some((state) => state === undefined || state.status === 'loading')
  ) {
    return 'loading'
  }
  return 'ready'
}

export const perCopyMethylationForReadyRow = (
  records: readonly JoinedPhasedMethylationRecord[],
  samples: readonly DiplotypeSample[],
  sampleStates: ReadonlyMap<string, PerCopyMethylationSampleState>
) => {
  const readiness = perCopyRowReadiness(
    samples.map((sample) => sample.sample_id),
    sampleStates
  )
  return {
    readiness,
    points:
      readiness === 'ready' ? aggregatePerCopyMethylation(records, samples) : { A: [], B: [] },
  }
}

export const perCopyEmptyLabel = (
  sampleIds: readonly string[],
  sampleStates: ReadonlyMap<string, PerCopyMethylationSampleState>
): string => {
  const readiness = perCopyRowReadiness(sampleIds, sampleStates)
  if (readiness !== 'ready') return readiness
  const states = sampleIds.map(
    (sampleId) => sampleStates.get(sampleId) as PerCopyMethylationSampleState
  )
  if (states.every((state) => state.status === 'unavailable')) return 'unavailable'
  if (states.some((state) => state.status === 'complete')) return 'no CpGs'
  return 'unavailable'
}

import logger from '../../logger'
import {
  isPhasedMethylationEvaluationEnabled,
  isY1PilotEnabled,
  phasedMethylationEvaluationClickhouseClient,
  y1ClickhouseClient,
} from '../../clickhouse'
import { getY1DiscoveredTableColumns } from '../../queries/long_read_y1_provenance'

export type AncillaryModality = 'coverage' | 'methylation' | 'str_histogram' | 'mqtl'
export type AncillaryDecision = {
  available: boolean
  source: 'LEGACY_V1' | 'Y1_DATABASE' | 'UNAVAILABLE'
  reason: string | null
}

const capabilities = new Map<AncillaryModality, AncillaryDecision>()

export type MethylationAvailabilityStatus =
  | 'AVAILABLE_COMPLETE'
  | 'UNAVAILABLE_INCOMPLETE'
  | 'UNAVAILABLE_NO_ASSAY_SOURCE'
  | 'UNAVAILABLE_NO_CHR22'
  | 'UNAVAILABLE_SOURCE_MARKED_SKIP'
  | 'UNAVAILABLE_NO_CONTIG'
  | 'UNAVAILABLE_ORIENTATION_UNCONFIRMED'
  | 'UNAVAILABLE_AOU_SUMMARY_ONLY'

export type MethylationSampleAvailability = {
  sample_id: string
  available: boolean
  status: MethylationAvailabilityStatus
  reason: string | null
}

let methylationAvailability: MethylationSampleAvailability[] = []
let phasedEvaluationAvailable = false

export const typedMethylationStatus = (status: string): MethylationAvailabilityStatus => {
  const normalized = status.toUpperCase() as MethylationAvailabilityStatus
  if (![
    'AVAILABLE_COMPLETE',
    'UNAVAILABLE_INCOMPLETE',
    'UNAVAILABLE_NO_ASSAY_SOURCE',
    'UNAVAILABLE_NO_CHR22',
    'UNAVAILABLE_SOURCE_MARKED_SKIP',
    'UNAVAILABLE_NO_CONTIG',
    'UNAVAILABLE_ORIENTATION_UNCONFIRMED',
    'UNAVAILABLE_AOU_SUMMARY_ONLY',
  ].includes(normalized)) {
    throw new Error(`Unknown methylation availability status: ${status}`)
  }
  return normalized
}

export const methylationSampleAvailability = (
  cohort: string | null | undefined
): MethylationSampleAvailability[] => (
  ancillaryDecision(cohort, 'methylation').available ? methylationAvailability : []
)

export const filterAvailableMethylationSampleIds = (
  requested: string[] | null | undefined,
  roster: MethylationSampleAvailability[]
) => {
  const availableIds = new Set(roster.filter((row) => row.available).map((row) => row.sample_id))
  return (requested || [...availableIds]).filter((sampleId) => availableIds.has(sampleId))
}

export const sampleTotalMethylationRecords = (rows: any[]) => rows.map((row) => ({
  ...row,
  data_layer: 'SAMPLE_TOTAL' as const,
  source_haplotype: null,
  vcf_strand: null,
  phase_set: null,
}))

export type PhasedMethylationCapability = {
  data_layer: 'SOURCE_PHASED'
  available: boolean
  joinable_to_vcf: false
  status: 'AVAILABLE_ORIENTATION_UNCONFIRMED' | 'UNAVAILABLE_ORIENTATION_UNCONFIRMED' | 'UNAVAILABLE_AOU_SUMMARY_ONLY'
  orientation_status: 'UNCONFIRMED'
  reason: string
}

export const sourcePhasedEvaluationScope = (chrom: string, start: number, stop: number) => {
  const normalizedChrom = chrom.startsWith('chr') ? chrom : `chr${chrom}`
  if (normalizedChrom !== 'chr22' || start < 47_040_000 || stop > 47_050_000 || start > stop) {
    throw new Error('Source-phased evaluation is restricted to HG00097 chr22:47040000-47050000')
  }
  return { chrom: 'chr22', start, stop, sample_id: 'HG00097' as const }
}

export const sourcePhasedMethylationRecords = (rows: any[]) => rows.map((row) => {
  const sourceHaplotype = Number(row.source_haplotype)
  if (sourceHaplotype !== 1 && sourceHaplotype !== 2) {
    throw new Error(`Unexpected source haplotype: ${row.source_haplotype}`)
  }
  return {
    chr: String(row.chr),
    pos1: Number(row.pos1),
    pos2: Number(row.pos2),
    methylation: Number(row.methylation),
    sample: 'HG00097',
    coverage: Number(row.coverage),
    data_layer: 'SOURCE_PHASED' as const,
    source_haplotype: sourceHaplotype === 1 ? 'HAP1' as const : 'HAP2' as const,
    vcf_strand: null,
    phase_set: null,
  }
})

export const phasedMethylationCapability = (
  cohort: string | null | undefined,
  evaluationAvailable = phasedEvaluationAvailable
): PhasedMethylationCapability => {
  if (cohort === 'aou') {
    return {
      data_layer: 'SOURCE_PHASED', available: false, joinable_to_vcf: false,
      status: 'UNAVAILABLE_AOU_SUMMARY_ONLY', orientation_status: 'UNCONFIRMED',
      reason: 'AoU is summary-only; HGSVC/HPRC methylation is never used as a fallback',
    }
  }
  if (evaluationAvailable) {
    return {
      data_layer: 'SOURCE_PHASED', available: true, joinable_to_vcf: false,
      status: 'AVAILABLE_ORIENTATION_UNCONFIRMED', orientation_status: 'UNCONFIRMED',
      reason: 'Raw HG00097 source hap1/hap2 tracks are available for visual evaluation only; they are not joined to VCF haplotypes',
    }
  }
  return {
    data_layer: 'SOURCE_PHASED', available: false, joinable_to_vcf: false,
    status: 'UNAVAILABLE_ORIENTATION_UNCONFIRMED', orientation_status: 'UNCONFIRMED',
    reason: 'Phased methylation cannot be joined to VCF haplotypes until source orientation is confirmed',
  }
}

export const ancillaryDecision = (
  cohort: string | null | undefined,
  modality: AncillaryModality,
  y1Enabled = isY1PilotEnabled
): AncillaryDecision => {
  if (cohort === 'aou') {
    return { available: false, source: 'UNAVAILABLE', reason: 'AoU is summary-only' }
  }
  if (!y1Enabled) return { available: true, source: 'LEGACY_V1', reason: null }
  if (modality === 'mqtl') {
    return { available: false, source: 'UNAVAILABLE', reason: 'Unavailable in Y1' }
  }
  return capabilities.get(modality) || {
    available: false,
    source: 'UNAVAILABLE',
    reason: 'Optional table is unavailable',
  }
}

export const isAncillaryUnavailableForCohort = (
  cohort: string | null | undefined,
  y1Enabled = isY1PilotEnabled,
  modality: AncillaryModality = 'methylation'
) => !ancillaryDecision(cohort, modality, y1Enabled).available

const hasColumns = (table: string, required: string[]) => {
  const columns = getY1DiscoveredTableColumns()?.get(table)
  return !!columns && required.every((column) => columns.has(column))
}

const queryY1Rows = async (query: string) => {
  const result = await y1ClickhouseClient.query({ query, format: 'JSONEachRow' })
  return (await result.json()) as any[]
}

const queryEvaluationRows = async (query: string, query_params: Record<string, unknown> = {}) => {
  const result = await phasedMethylationEvaluationClickhouseClient.query({
    query, query_params, format: 'JSONEachRow',
  })
  return (await result.json()) as any[]
}

const preflightOptionalY1Ancillaries = async () => {
  const definitions: Array<[AncillaryModality, boolean]> = [
    ['coverage', hasColumns('lr_y1_coverage', [
      'release', 'cohort', 'reference_genome', 'modality', 'chrom', 'position',
      'mean', 'median', 'over_1', 'over_5', 'over_10', 'over_15', 'over_20',
      'over_25', 'over_30', 'over_50', 'over_100',
    ])],
    ['str_histogram', hasColumns('lr_str_histograms', [
      'chrom', 'position', 'end_position', 'motif', 'allele_size_histogram',
      'biallelic_histogram', 'min_repeats', 'mode_repeats', 'mean_repeats',
      'stdev_repeats', 'median_repeats', 'p99_repeats', 'max_repeats',
      'unique_allele_lengths', 'num_called_alleles', 'populations', 'mapping_status',
    ])],
    ['methylation',
      hasColumns('lr_methylation_canonical_prototype', [
        'chrom', 'pos1', 'pos2', 'methylation', 'coverage', 'sample_id',
      ]) &&
      hasColumns('lr_methylation_summary_canonical_prototype', [
        'chrom', 'pos1', 'pos2', 'mean_methylation', 'mean_coverage',
        'observed_sample_count', 'std_methylation', 'min_methylation', 'max_methylation',
      ]) &&
      hasColumns('lr_methylation_sample_availability_canonical_prototype', [
        'sample_id', 'availability', 'included', 'reason',
      ])],
  ]
  for (const [modality, available] of definitions) {
    capabilities.set(modality, available
      ? { available: true, source: 'Y1_DATABASE', reason: null }
      : { available: false, source: 'UNAVAILABLE', reason: 'Optional table is unavailable' })
  }
  if (capabilities.get('methylation')?.available) {
    const availability = await queryY1Rows(`
      SELECT sample_id, availability, included, reason
      FROM lr_methylation_sample_availability_canonical_prototype
      ORDER BY sample_id
    `)
    methylationAvailability = availability.map((row) => ({
      sample_id: String(row.sample_id),
      available: Number(row.included) === 1,
      status: typedMethylationStatus(String(row.availability)),
      reason: String(row.reason || '').trim() || null,
    }))
  }
}

const preflightPhasedMethylationEvaluation = async () => {
  const table = 'lr_y1_methylation_phased_staging'
  const schema = await queryEvaluationRows(
    `SELECT name FROM system.columns WHERE database = currentDatabase() AND table = {table:String}`,
    { table }
  )
  const required = [
    'ancillary_run_id', 'attempt_id', 'release', 'cohort', 'reference_genome', 'modality',
    'chrom', 'source_start0', 'source_end0', 'position', 'sample_id', 'source_haplotype',
    'methylation', 'coverage', 'estimated_modified_count', 'estimated_unmodified_count',
    'discretized_methylation',
  ]
  const columns = new Set(schema.map((row) => row.name))
  const missing = required.filter((column) => !columns.has(column))
  if (missing.length) throw new Error(`${table} is missing columns: ${missing.join(', ')}`)
  const rows = await queryEvaluationRows(`
    SELECT count() AS combined,
      countIf(source_haplotype = 1) AS hap1,
      countIf(source_haplotype = 2) AS hap2,
      countIf(ancillary_run_id != 'single-owner-evaluation:gnomad_lr_y1_scratch_phased_methylation_evaluation_v5_hg00097_chr22_47040000_47050000_v1'
        OR attempt_id != 'single-owner' OR release != 'y1' OR cohort != 'hgsvc_hprc'
        OR reference_genome != 'GRCh38' OR modality != 'per_haplotype_methylation' OR chrom != 'chr22'
        OR sample_id != 'HG00097' OR source_haplotype NOT IN (1, 2)
        OR position < 47040000 OR position > 47050000
        OR source_end0 != position OR source_start0 + 1 != source_end0
        OR estimated_modified_count + estimated_unmodified_count != coverage) AS invalid
    FROM ${table}
  `)
  const row = rows[0] || {}
  if (
    Number(row.hap1) <= 0 || Number(row.hap2) <= 0 ||
    Number(row.combined) !== Number(row.hap1) + Number(row.hap2) || Number(row.invalid) !== 0
  ) throw new Error('Retained phased-methylation evaluation rows do not match the fixed HG00097 contract')
}

export const preflightY1Ancillaries = async () => {
  capabilities.clear()
  methylationAvailability = []
  phasedEvaluationAvailable = false
  if (isY1PilotEnabled) await preflightOptionalY1Ancillaries()
  if (isPhasedMethylationEvaluationEnabled) {
    try {
      await preflightPhasedMethylationEvaluation()
      phasedEvaluationAvailable = true
      logger.info('Phased methylation evaluation preflight PASS')
    } catch (error: any) {
      logger.error(`Phased methylation evaluation preflight FAIL: ${error.message}`)
    }
  }
}

export const y1AncillaryCapabilities = () => new Map(capabilities)

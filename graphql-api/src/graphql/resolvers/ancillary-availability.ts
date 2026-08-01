import { isY1PilotEnabled } from '../../clickhouse'

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
  _evaluationAvailable = phasedEvaluationAvailable
): PhasedMethylationCapability => {
  if (cohort === 'aou') {
    return {
      data_layer: 'SOURCE_PHASED', available: false, joinable_to_vcf: false,
      status: 'UNAVAILABLE_AOU_SUMMARY_ONLY', orientation_status: 'UNCONFIRMED',
      reason: 'AoU is summary-only; HGSVC/HPRC methylation is never used as a fallback',
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

export const preflightY1Ancillaries = async () => {
  capabilities.clear()
  methylationAvailability = []
  phasedEvaluationAvailable = false
  if (!isY1PilotEnabled) return

  // Schema presence is not provenance. Until each modality has one uniquely
  // reconciled ancillary_run_id, Y1 must not query or advertise any optional
  // ancillary source (including retained/prototype methylation tables).
  for (const modality of ['coverage', 'methylation', 'str_histogram', 'mqtl'] as const) {
    capabilities.set(modality, {
      available: false,
      source: 'UNAVAILABLE',
      reason: 'Unavailable until a unique ancillary run and provenance are validated',
    })
  }
}

export const y1AncillaryCapabilities = () => new Map(capabilities)

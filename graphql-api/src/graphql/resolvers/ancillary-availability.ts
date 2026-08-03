import {
  getY1AncillaryClickhouseClient,
  isY1PilotEnabled,
  y1AncillaryRoutes,
} from '../../clickhouse'
import type { Y1AncillaryRoute } from '../../y1_config'

export type AncillaryModality = 'coverage' | 'methylation' | 'str_histogram' | 'mqtl'
export type AncillaryDecision = {
  available: boolean
  source: 'LEGACY_V1' | 'Y1_DATABASE' | 'UNAVAILABLE'
  reason: string | null
}

const capabilities = new Map<string, AncillaryDecision>()
const activeRoutes = new Map<string, Y1AncillaryRoute>()
const routeKey = (cohort: string | null | undefined, modality: AncillaryModality) =>
  `${cohort || 'hgsvc_hprc'}:${modality}`
const canonicalChromosomes = [
  ...Array.from({ length: 22 }, (_, index) => `chr${index + 1}`),
  'chrX',
  'chrY',
]

export type MethylationAvailabilityStatus =
  | 'AVAILABLE_COMPLETE'
  | 'AVAILABLE_PARTIAL'
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
    'AVAILABLE_PARTIAL',
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
  if (!y1Enabled) {
    if (cohort === 'aou') return { available: false, source: 'UNAVAILABLE', reason: 'AoU is summary-only' }
    return { available: true, source: 'LEGACY_V1', reason: null }
  }
  if (modality === 'mqtl') {
    return { available: false, source: 'UNAVAILABLE', reason: 'Unavailable in Y1' }
  }
  const configured = capabilities.get(routeKey(cohort, modality))
  if (configured) return configured
  if (cohort === 'aou') {
    return { available: false, source: 'UNAVAILABLE', reason: 'AoU is summary-only' }
  }
  return {
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

const requiredAncillaryColumns: Record<Exclude<AncillaryModality, 'mqtl'>, Record<string, string[]>> = {
  coverage: {
    lr_y1_coverage: ['ancillary_run_id', 'cohort', 'chrom', 'position'],
  },
  str_histogram: {
    lr_y1_str_histograms: [
      'ancillary_run_id', 'cohort', 'chrom', 'source_start', 'source_end', 'motif',
      'allele_size_histogram', 'biallelic_histogram', 'populations',
    ],
  },
  methylation: {
    lr_methylation: ['chrom', 'pos1', 'pos2', 'sample_id', 'methylation', 'coverage'],
    lr_methylation_summary: [
      'chrom', 'pos1', 'pos2', 'mean_methylation', 'mean_coverage', 'num_samples',
      'std_methylation',
    ],
    lr_methylation_sample_availability: [
      'ancillary_run_id', 'cohort', 'sample_id', 'availability', 'included',
      'indexed_contigs', 'detail_rows', 'reason',
    ],
    lr_methylation_cohort_availability: [
      'ancillary_run_id', 'cohort', 'availability', 'reason',
    ],
  },
}

const queryRows = async (
  route: Y1AncillaryRoute,
  query: string,
  query_params: Record<string, unknown> = {}
) => {
  const result = await getY1AncillaryClickhouseClient(route).query({
    query, query_params, format: 'JSONEachRow',
  })
  return (await result.json()) as any[]
}

const requireAncillarySchema = async (route: Y1AncillaryRoute) => {
  const required = requiredAncillaryColumns[route.modality]
  const rows = await queryRows(route, `
    SELECT table, name FROM system.columns
    WHERE database = currentDatabase() AND table IN {tables:Array(String)}
  `, { tables: Object.keys(required) })
  const actual = new Map<string, Set<string>>()
  for (const row of rows) {
    const columns = actual.get(String(row.table)) || new Set<string>()
    columns.add(String(row.name))
    actual.set(String(row.table), columns)
  }
  for (const [table, expected] of Object.entries(required)) {
    const missing = expected.filter((column) => !actual.get(table)?.has(column))
    if (missing.length) throw new Error(`${route.database}.${table} is missing: ${missing.join(', ')}`)
  }
}

const preflightConfiguredRoute = async (route: Y1AncillaryRoute) => {
  await requireAncillarySchema(route)
  if (route.modality === 'coverage') {
    const counts = await queryRows(route, `
      SELECT count() AS rows, groupUniqArray(chrom) AS chromosomes
      FROM lr_y1_coverage
      WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
    `, { runId: route.run_id, cohort: route.cohort })
    const chromosomes = new Set((counts[0]?.chromosomes || []).map(String))
    if (Number(counts[0]?.rows || 0) <= 0 || !canonicalChromosomes.every((chrom) => chromosomes.has(chrom))) {
      throw new Error(`Configured coverage route ${route.cohort}/${route.run_id} is not full-genome`)
    }
  } else if (route.modality === 'str_histogram') {
    const counts = await queryRows(route, `
      SELECT count() AS rows, groupUniqArray(chrom) AS chromosomes
      FROM lr_y1_str_histograms
      WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
    `, { runId: route.run_id, cohort: route.cohort })
    const chromosomes = new Set((counts[0]?.chromosomes || []).map(String))
    if (Number(counts[0]?.rows || 0) <= 0 || !canonicalChromosomes.every((chrom) => chromosomes.has(chrom))) {
      throw new Error(`Configured STR route ${route.cohort}/${route.run_id} is not full-genome`)
    }
  } else {
    const [cohortRows, sampleRows, partRows, chromosomeRows] = await Promise.all([
      queryRows(route, `
        SELECT availability, count() AS rows
        FROM lr_methylation_cohort_availability
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
        GROUP BY availability
      `, { runId: route.run_id, cohort: route.cohort }),
      queryRows(route, `
        SELECT sample_id, availability, included, indexed_contigs, reason
        FROM lr_methylation_sample_availability
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
        ORDER BY sample_id
      `, { runId: route.run_id, cohort: route.cohort }),
      queryRows(route, `
        SELECT table, sum(rows) AS rows FROM system.parts
        WHERE active AND database = currentDatabase()
          AND table IN ('lr_methylation', 'lr_methylation_summary')
        GROUP BY table
      `),
      queryRows(route, `SELECT groupUniqArray(chrom) AS chromosomes FROM lr_methylation_summary`),
    ])
    if (
      cohortRows.length !== 1 || cohortRows[0].availability !== 'available_sample_total' ||
      Number(cohortRows[0].rows) !== 1
    ) throw new Error(`Configured methylation route ${route.run_id} lacks exact cohort availability`)
    const parts = new Map(partRows.map((row) => [String(row.table), Number(row.rows)]))
    if ((parts.get('lr_methylation') || 0) <= 0 || (parts.get('lr_methylation_summary') || 0) <= 0) {
      throw new Error(`Configured methylation route ${route.run_id} has empty detail or summary data`)
    }
    const chromosomes = new Set((chromosomeRows[0]?.chromosomes || []).map(String))
    if (!canonicalChromosomes.every((chrom) => chromosomes.has(chrom))) {
      throw new Error(`Configured methylation route ${route.run_id} is not full-genome`)
    }
    if (!sampleRows.length) throw new Error(`Configured methylation route ${route.run_id} has no sample availability`)
    methylationAvailability = sampleRows.map((row) => {
      const availability = String(row.availability)
      const available = Number(row.included) === 1
      let status: MethylationAvailabilityStatus
      if (availability === 'available_complete_source') status = 'AVAILABLE_COMPLETE'
      else if (availability === 'available_partial_source') status = 'AVAILABLE_PARTIAL'
      else status = typedMethylationStatus(availability)
      return { sample_id: String(row.sample_id), available, status, reason: row.reason || null }
    })
  }
  activeRoutes.set(routeKey(route.cohort, route.modality), route)
  capabilities.set(routeKey(route.cohort, route.modality), {
    available: true,
    source: 'Y1_DATABASE',
    reason: null,
  })
}

export const preflightY1Ancillaries = async () => {
  capabilities.clear()
  activeRoutes.clear()
  methylationAvailability = []
  phasedEvaluationAvailable = false
  if (!isY1PilotEnabled) return

  for (const modality of ['coverage', 'methylation', 'str_histogram'] as const) {
    capabilities.set(routeKey('hgsvc_hprc', modality), {
      available: false,
      source: 'UNAVAILABLE',
      reason: 'Unavailable until a unique ancillary run and provenance are validated',
    })
  }
  await Promise.all(y1AncillaryRoutes.map((route) => preflightConfiguredRoute(route)))
}

export const getY1AncillaryRoute = (
  cohort: string | null | undefined,
  modality: Exclude<AncillaryModality, 'mqtl'>
) => activeRoutes.get(routeKey(cohort, modality)) || null

export const y1AncillaryCapabilities = () => new Map(capabilities)

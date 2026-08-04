import {
  getY1AncillaryClickhouseClient,
  isY1PilotEnabled,
  y1AncillaryRoutes,
} from '../../clickhouse'
import { canonicalY1ContigLengths } from '../../y1_admission_config'
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
  if (
    ![
      'AVAILABLE_COMPLETE',
      'AVAILABLE_PARTIAL',
      'UNAVAILABLE_INCOMPLETE',
      'UNAVAILABLE_NO_ASSAY_SOURCE',
      'UNAVAILABLE_NO_CHR22',
      'UNAVAILABLE_SOURCE_MARKED_SKIP',
      'UNAVAILABLE_NO_CONTIG',
      'UNAVAILABLE_ORIENTATION_UNCONFIRMED',
      'UNAVAILABLE_AOU_SUMMARY_ONLY',
    ].includes(normalized)
  ) {
    throw new Error(`Unknown methylation availability status: ${status}`)
  }
  return normalized
}

export const methylationSampleAvailability = (
  cohort: string | null | undefined
): MethylationSampleAvailability[] =>
  ancillaryDecision(cohort, 'methylation').available ? methylationAvailability : []

export const filterAvailableMethylationSampleIds = (
  requested: string[] | null | undefined,
  roster: MethylationSampleAvailability[]
) => {
  const availableIds = new Set(roster.filter((row) => row.available).map((row) => row.sample_id))
  return (requested || [...availableIds]).filter((sampleId) => availableIds.has(sampleId))
}

export const sampleTotalMethylationRecords = (rows: any[]) =>
  rows.map((row) => ({
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
  status:
    | 'AVAILABLE_ORIENTATION_UNCONFIRMED'
    | 'UNAVAILABLE_ORIENTATION_UNCONFIRMED'
    | 'UNAVAILABLE_AOU_SUMMARY_ONLY'
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

export const sourcePhasedMethylationRecords = (rows: any[]) =>
  rows.map((row) => {
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
      source_haplotype: sourceHaplotype === 1 ? ('HAP1' as const) : ('HAP2' as const),
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
      data_layer: 'SOURCE_PHASED',
      available: false,
      joinable_to_vcf: false,
      status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
      orientation_status: 'UNCONFIRMED',
      reason: 'AoU is summary-only; HGSVC/HPRC methylation is never used as a fallback',
    }
  }
  return {
    data_layer: 'SOURCE_PHASED',
    available: false,
    joinable_to_vcf: false,
    status: 'UNAVAILABLE_ORIENTATION_UNCONFIRMED',
    orientation_status: 'UNCONFIRMED',
    reason:
      'Phased methylation cannot be joined to VCF haplotypes until source orientation is confirmed',
  }
}

export const ancillaryDecision = (
  cohort: string | null | undefined,
  modality: AncillaryModality,
  y1Enabled = isY1PilotEnabled
): AncillaryDecision => {
  if (!y1Enabled) {
    if (cohort === 'aou')
      return { available: false, source: 'UNAVAILABLE', reason: 'AoU is summary-only' }
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

const requiredAncillaryColumns: Record<
  Exclude<AncillaryModality, 'mqtl'>,
  Record<string, string[]>
> = {
  coverage: {
    lr_y1_coverage: ['ancillary_run_id', 'cohort', 'chrom', 'position'],
  },
  str_histogram: {
    lr_y1_str_histograms: [
      'ancillary_run_id',
      'cohort',
      'y1_source_variant_id',
      'chrom',
      'source_start',
      'source_end',
      'motif',
      'allele_size_histogram',
      'biallelic_histogram',
      'populations',
    ],
    lr_y1_str_histogram_mapping: [
      'ancillary_run_id',
      'cohort',
      'y1_source_variant_id',
      'chrom',
      'source_start',
      'source_end',
      'motif',
      'mapping_status',
    ],
  },
  methylation: {
    lr_methylation: ['chrom', 'pos1', 'pos2', 'sample_id', 'methylation', 'coverage'],
    lr_methylation_summary: [
      'chrom',
      'pos1',
      'pos2',
      'mean_methylation',
      'mean_coverage',
      'num_samples',
      'std_methylation',
    ],
    lr_methylation_sample_availability: [
      'ancillary_run_id',
      'cohort',
      'sample_id',
      'availability',
      'included',
      'indexed_contigs',
      'detail_rows',
      'reason',
    ],
    lr_methylation_cohort_availability: ['ancillary_run_id', 'cohort', 'availability', 'reason'],
  },
}

const queryRows = async (
  route: Y1AncillaryRoute,
  query: string,
  query_params: Record<string, unknown> = {}
) => {
  const result = await getY1AncillaryClickhouseClient(route).query({
    query,
    query_params,
    format: 'JSONEachRow',
  })
  return (await result.json()) as any[]
}

const requireAncillarySchema = async (route: Y1AncillaryRoute) => {
  const required = requiredAncillaryColumns[route.modality]
  const rows = await queryRows(
    route,
    `
    SELECT table, name FROM system.columns
    WHERE database = currentDatabase() AND table IN {tables:Array(String)}
  `,
    { tables: Object.keys(required) }
  )
  const actual = new Map<string, Set<string>>()
  for (const row of rows) {
    const columns = actual.get(String(row.table)) || new Set<string>()
    columns.add(String(row.name))
    actual.set(String(row.table), columns)
  }
  for (const [table, expected] of Object.entries(required)) {
    const missing = expected.filter((column) => !actual.get(table)?.has(column))
    if (missing.length)
      throw new Error(`${route.database}.${table} is missing: ${missing.join(', ')}`)
  }
}

const sortedContigRows = (rows: any[], coordinateFields: string[] = []) =>
  rows
    .map((row) => ({
      chrom: String(row.chrom),
      rows: Number(row.rows),
      ...Object.fromEntries(coordinateFields.map((field) => [field, Number(row[field])])),
    }))
    .sort((left, right) => left.chrom.localeCompare(right.chrom))

const exactJson = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)

const preflightConfiguredRoute = async (route: Y1AncillaryRoute) => {
  await requireAncillarySchema(route)
  const reconciliation = route.receipt.reconciliation as any
  if (route.modality === 'coverage') {
    const physical = await queryRows(
      route,
      `
      SELECT chrom, count() AS rows, uniqExact(position) AS unique_positions,
        min(position) AS min_position, max(position) AS max_position,
        countIf(release = 'y1' AND cohort = {cohort:String}
          AND reference_genome = 'GRCh38') AS exact
      FROM lr_y1_coverage
      WHERE ancillary_run_id = {runId:String}
      GROUP BY chrom
      ORDER BY chrom
    `,
      { runId: route.run_id, cohort: route.cohort }
    )
    const observed = sortedContigRows(physical, [
      'min_position',
      'max_position',
      'unique_positions',
    ])
    const expected = sortedContigRows(reconciliation.contigs, [
      'min_position',
      'max_position',
      'unique_positions',
    ])
    const total = physical.reduce((sum, row) => sum + Number(row.rows), 0)
    if (
      physical.some((row) => Number(row.exact) !== Number(row.rows)) ||
      total !== Number(reconciliation.canonical_rows) ||
      !exactJson(observed, expected)
    ) {
      throw new Error(
        `Configured coverage route ${route.cohort}/${route.run_id} does not match its completion receipt`
      )
    }
  } else if (route.modality === 'str_histogram') {
    const [physical, mappingRows, keyRows] = await Promise.all([
      queryRows(
        route,
        `
      SELECT chrom, count() AS rows, min(source_start) AS min_start,
        max(source_end) AS max_end,
        countIf(release = 'y1' AND cohort = {cohort:String}
          AND reference_genome = 'GRCh38') AS exact
      FROM lr_y1_str_histograms
      WHERE ancillary_run_id = {runId:String}
      GROUP BY chrom
      ORDER BY chrom
    `,
        { runId: route.run_id, cohort: route.cohort }
      ),
      queryRows(
        route,
        `
      SELECT count() AS mapping_rows,
        countIf(mapping_status = 'available_exact') AS available_rows,
        countIf(mapping_status = 'unavailable_no_exact_key') AS unavailable_rows,
        countIf(mapping_status = 'unavailable_ambiguous') AS ambiguous_rows,
        countIf(mapping_status NOT IN (
          'available_exact', 'unavailable_no_exact_key', 'unavailable_ambiguous'
        )) AS unknown_rows
      FROM lr_y1_str_histogram_mapping
      WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
    `,
        { runId: route.run_id, cohort: route.cohort }
      ),
      queryRows(
        route,
        `
      SELECT countIf(mapping_rows != 1 OR canonical_rows != 1) AS key_mismatches
      FROM (
        SELECT y1_source_variant_id, chrom, source_start, source_end, motif,
          count() AS mapping_rows
        FROM lr_y1_str_histogram_mapping
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
          AND mapping_status = 'available_exact'
        GROUP BY y1_source_variant_id, chrom, source_start, source_end, motif
      ) AS mapping
      FULL OUTER JOIN (
        SELECT y1_source_variant_id, chrom, source_start, source_end, motif,
          count() AS canonical_rows
        FROM lr_y1_str_histograms
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
        GROUP BY y1_source_variant_id, chrom, source_start, source_end, motif
      ) AS canonical
      USING (y1_source_variant_id, chrom, source_start, source_end, motif)
    `,
        { runId: route.run_id, cohort: route.cohort }
      ),
    ])
    const observed = sortedContigRows(physical, ['min_start', 'max_end'])
    const expected = sortedContigRows(reconciliation.contigs, ['min_start', 'max_end'])
    const total = physical.reduce((sum, row) => sum + Number(row.rows), 0)
    if (
      physical.some((row) => Number(row.exact) !== Number(row.rows)) ||
      total !== Number(reconciliation.canonical_rows) ||
      !exactJson(observed, expected) ||
      Number(mappingRows[0]?.mapping_rows || 0) !== Number(reconciliation.mapping_rows) ||
      Number(mappingRows[0]?.available_rows || 0) !== Number(reconciliation.available_rows) ||
      Number(mappingRows[0]?.unavailable_rows || 0) !== Number(reconciliation.unavailable_rows) ||
      Number(mappingRows[0]?.ambiguous_rows || 0) !== Number(reconciliation.ambiguous_rows) ||
      Number(mappingRows[0]?.unknown_rows || 0) !== 0 ||
      Number(keyRows[0]?.key_mismatches ?? -1) !== Number(reconciliation.key_mismatches)
    ) {
      throw new Error(
        `Configured STR route ${route.cohort}/${route.run_id} does not match its completion receipt`
      )
    }
  } else {
    const [cohortRows, sampleRows, detailRows, summaryRows] = await Promise.all([
      queryRows(
        route,
        `
        SELECT availability, count() AS rows
        FROM lr_methylation_cohort_availability
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
        GROUP BY availability
      `,
        { runId: route.run_id, cohort: route.cohort }
      ),
      queryRows(
        route,
        `
        SELECT sample_id, availability, included, indexed_contigs, detail_rows, reason
        FROM lr_methylation_sample_availability
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
        ORDER BY sample_id
      `,
        { runId: route.run_id, cohort: route.cohort }
      ),
      queryRows(
        route,
        `
        SELECT sample_id, chrom, count() AS rows
        FROM lr_methylation
        GROUP BY sample_id, chrom
        ORDER BY sample_id, chrom
      `
      ),
      queryRows(
        route,
        `
        SELECT chrom, count() AS rows
        FROM lr_methylation_summary
        GROUP BY chrom
        ORDER BY chrom
      `
      ),
    ])
    if (
      cohortRows.length !== 1 ||
      cohortRows[0].availability !== 'available_sample_total' ||
      Number(cohortRows[0].rows) !== 1
    )
      throw new Error(
        `Configured methylation route ${route.run_id} lacks exact cohort availability`
      )

    const physicalBySample = new Map<string, { rows: number; contigs: string[] }>()
    for (const row of detailRows) {
      const sample = String(row.sample_id)
      const current = physicalBySample.get(sample) || { rows: 0, contigs: [] }
      current.rows += Number(row.rows)
      current.contigs.push(String(row.chrom))
      physicalBySample.set(sample, current)
    }
    const strictReceipt = route.receipt.source_format !== 'sample_total_completion'
    const expectedSamples = new Map(
      strictReceipt
        ? (reconciliation.samples as any[]).map((sample) => [String(sample.sample_id), sample])
        : []
    )
    const availabilityIds = sampleRows.map((row) => String(row.sample_id)).sort()
    const physicalIds = [...physicalBySample.keys()].sort()
    const expectedPhysicalIds = strictReceipt
      ? [...expectedSamples.values()]
          .filter((sample) => sample.detail_rows > 0)
          .map((sample) => String(sample.sample_id))
          .sort()
      : sampleRows
          .filter((row) => Number(row.included) === 1)
          .map((row) => String(row.sample_id))
          .sort()
    const expectedIds = strictReceipt ? [...expectedSamples.keys()].sort() : availabilityIds
    if (
      sampleRows.length !== Number(reconciliation.roster_rows) ||
      (strictReceipt && sampleRows.length !== expectedSamples.size) ||
      new Set(availabilityIds).size !== availabilityIds.length ||
      !exactJson(availabilityIds, expectedIds) ||
      !exactJson(physicalIds, expectedPhysicalIds)
    ) {
      throw new Error(
        `Configured methylation route ${route.run_id} roster does not match its completion receipt`
      )
    }
    for (const row of sampleRows) {
      const sampleId = String(row.sample_id)
      const expected = strictReceipt ? expectedSamples.get(sampleId) : null
      const physical = physicalBySample.get(sampleId) || { rows: 0, contigs: [] }
      const indexed = (row.indexed_contigs || []).map(String).sort()
      physical.contigs.sort()
      if (
        (strictReceipt &&
          (!expected ||
            expected.availability !== String(row.availability) ||
            expected.included !== (Number(row.included) === 1) ||
            expected.detail_rows !== Number(row.detail_rows) ||
            !exactJson(expected.indexed_contigs, indexed))) ||
        Number(row.detail_rows) !== physical.rows ||
        !exactJson(indexed, physical.contigs)
      ) {
        throw new Error(
          `Configured methylation route ${route.run_id} sample ${sampleId} is partial or mismatched`
        )
      }
    }
    if (!strictReceipt) {
      const availabilityCounts = new Map<string, number>()
      for (const row of sampleRows) {
        const status = String(row.availability)
        availabilityCounts.set(status, (availabilityCounts.get(status) || 0) + 1)
      }
      const expectedAvailability = new Map([
        ['available_complete_source', Number(reconciliation.availability_complete)],
        ['available_partial_source', Number(reconciliation.availability_partial)],
        ['unavailable_source_marked_skip', Number(reconciliation.availability_source_marked_skip)],
        ['unavailable_no_assay_source', Number(reconciliation.availability_no_source)],
      ])
      if (
        availabilityCounts.size !== expectedAvailability.size ||
        [...expectedAvailability].some(
          ([status, count]) => availabilityCounts.get(status) !== count
        )
      ) {
        throw new Error(
          `Configured methylation route ${route.run_id} availability does not match its completion receipt`
        )
      }
    }
    const observedDetailContigs = sortedContigRows(
      [...new Map(detailRows.map((row) => [String(row.chrom), 0])).keys()].map((chrom) => ({
        chrom,
        rows: detailRows
          .filter((row) => String(row.chrom) === chrom)
          .reduce((sum, row) => sum + Number(row.rows), 0),
      }))
    )
    const observedSummaryContigs = sortedContigRows(summaryRows)
    const detailTotal = observedDetailContigs.reduce((sum, row) => sum + row.rows, 0)
    const summaryTotal = observedSummaryContigs.reduce((sum, row) => sum + row.rows, 0)
    const observedChroms = (rows: { chrom: string }[]) => rows.map((row) => row.chrom).sort()
    const canonicalChroms = [...canonicalY1ContigLengths.keys()].sort()
    if (
      detailTotal !== Number(reconciliation.detail_rows) ||
      summaryTotal !== Number(reconciliation.summary_rows) ||
      (strictReceipt &&
        (!exactJson(observedDetailContigs, sortedContigRows(reconciliation.detail_contigs)) ||
          !exactJson(observedSummaryContigs, sortedContigRows(reconciliation.summary_contigs)))) ||
      (!strictReceipt &&
        (!exactJson(observedChroms(observedDetailContigs), canonicalChroms) ||
          !exactJson(observedChroms(observedSummaryContigs), canonicalChroms)))
    ) {
      throw new Error(
        `Configured methylation route ${route.run_id} detail/summary counts do not match its completion receipt`
      )
    }
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

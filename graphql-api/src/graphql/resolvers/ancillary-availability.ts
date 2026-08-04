import {
  getSourcePhasedMethylationClickhouseClient,
  getY1AncillaryClickhouseClient,
  isY1PilotEnabled,
  sourcePhasedMethylationRoute,
  y1AncillaryRoutes,
} from '../../clickhouse'
import {
  SOURCE_PHASED_METHYLATION_TABLE,
  type SourcePhasedMethylationRoute,
} from '../../source_phased_methylation_config'
import {
  canonicalY1ContigLengths,
  y1CoverageRawColumnShape,
  y1CoverageViewColumnShape,
} from '../../y1_admission_config'
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
let activeSourcePhasedMethylationRoute: SourcePhasedMethylationRoute | null = null

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
  phase_set_semantics: 'SOURCE_TRACK_HAS_NO_PHASE_SET'
  route_run_id: string | null
  source_sample_ids: string[]
  reason: string
}

export const sourcePhasedEvaluationScope = (
  chrom: string,
  start: number,
  stop: number,
  sampleId: string,
  route = activeSourcePhasedMethylationRoute
) => {
  const normalizedChrom = chrom.startsWith('chr') ? chrom : `chr${chrom}`
  if (!route) throw new Error('Source-phased methylation route is unavailable')
  if (start < 0 || stop < start || stop - start > 100_000) {
    throw new Error('Source-phased methylation range must be ordered and at most 100 kb')
  }
  if (!route.receipt.contigs.some((contig) => contig.chrom === normalizedChrom)) {
    throw new Error(`Source-phased methylation is unavailable for ${normalizedChrom}`)
  }
  if (!route.receipt.source_sample_ids.includes(sampleId)) {
    throw new Error(`Source-phased methylation is unavailable for sample ${sampleId}`)
  }
  return { chrom: normalizedChrom, start, stop, sample_id: sampleId }
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
      sample: String(row.sample),
      coverage: Number(row.coverage),
      data_layer: 'SOURCE_PHASED' as const,
      source_haplotype: sourceHaplotype === 1 ? ('HAP1' as const) : ('HAP2' as const),
      // The source-labelled serving contract deliberately does not attach rows to
      // a VCF GT position or phase block.
      vcf_strand: null,
      phase_set: null,
    }
  })

export const phasedMethylationCapability = (
  cohort: string | null | undefined,
  route = activeSourcePhasedMethylationRoute
): PhasedMethylationCapability => {
  const common = {
    data_layer: 'SOURCE_PHASED' as const,
    joinable_to_vcf: false as const,
    orientation_status: 'UNCONFIRMED' as const,
    phase_set_semantics: 'SOURCE_TRACK_HAS_NO_PHASE_SET' as const,
  }
  if (cohort === 'aou') {
    return {
      ...common,
      available: false,
      status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
      route_run_id: null,
      source_sample_ids: [],
      reason: 'AoU is summary-only; HGSVC/HPRC methylation is never used as a fallback',
    }
  }
  if (!route) {
    return {
      ...common,
      available: false,
      status: 'UNAVAILABLE_ORIENTATION_UNCONFIRMED',
      route_run_id: null,
      source_sample_ids: [],
      reason: 'Source-labelled hap1/hap2 methylation has no admitted serving route',
    }
  }
  return {
    ...common,
    available: true,
    status: 'AVAILABLE_ORIENTATION_UNCONFIRMED',
    route_run_id: route.run_id,
    source_sample_ids: route.receipt.source_sample_ids,
    reason: route.receipt.missing_orientation_evidence,
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

const strictStrRequiredColumns: Record<string, string[]> = {
  lr_y1_str_histograms: [
    'ancillary_run_id',
    'release',
    'cohort',
    'reference_genome',
    'modality',
    'source_uri',
    'source_generation',
    'source_size_bytes',
    'source_checksum_algorithm',
    'source_checksum',
    'runtime_source_uri',
    'runtime_source_generation',
    'primary_database',
    'primary_run_id',
    'primary_task_id',
    'primary_attempt_id',
    'y1_source_variant_id',
    'chrom',
    'position',
    'source_end',
    'motif',
    'allele_size_histogram',
    'biallelic_histogram',
    'min_repeats',
    'mode_repeats',
    'mean_repeats',
    'stdev_repeats',
    'median_repeats',
    'p99_repeats',
    'max_repeats',
    'unique_allele_lengths',
    'num_called_alleles',
    'populations',
    'mapping_status',
  ],
  lr_y1_str_histogram_mapping: [
    'ancillary_run_id',
    'release',
    'cohort',
    'reference_genome',
    'modality',
    'source_uri',
    'source_generation',
    'source_size_bytes',
    'source_checksum_algorithm',
    'source_checksum',
    'runtime_source_uri',
    'runtime_source_generation',
    'primary_database',
    'primary_run_id',
    'primary_task_id',
    'primary_attempt_id',
    'y1_source_variant_id',
    'chrom',
    'position',
    'source_end',
    'motif',
    'raw_match_count',
    'mapping_status',
  ],
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

const requireAncillarySchema = async (
  route: Y1AncillaryRoute,
  required = requiredAncillaryColumns[route.modality]
) => {
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

const requireCoverageViewStorage = async (route: Y1AncillaryRoute) => {
  const [tables, columns] = await Promise.all([
    queryRows(
      route,
      `
      SELECT name, engine, create_table_query
      FROM system.tables
      WHERE database = currentDatabase() AND name IN ('lr_coverage', 'lr_y1_coverage')
      ORDER BY name
    `
    ),
    queryRows(
      route,
      `
      SELECT table, name, type, position
      FROM system.columns
      WHERE database = currentDatabase() AND table IN ('lr_coverage', 'lr_y1_coverage')
      ORDER BY table, position
    `
    ),
  ])
  const engines = new Map(tables.map((row) => [String(row.name), String(row.engine)]))
  if (engines.get('lr_coverage') !== 'MergeTree' || engines.get('lr_y1_coverage') !== 'View') {
    throw new Error(
      `Configured coverage route ${route.cohort}/${route.run_id} is not a raw MergeTree backed canonical View`
    )
  }
  const viewDefinition = String(
    tables.find((row) => String(row.name) === 'lr_y1_coverage')?.create_table_query || ''
  )
  const escapedDatabase = route.database.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const backingPattern = new RegExp(
    `\\bFROM\\s+(?:\`?${escapedDatabase}\`?\\.)?\`?lr_coverage\`?\\s*;?\\s*$`,
    'i'
  )
  if (!backingPattern.test(viewDefinition) || /\b(?:JOIN|UNION)\b/i.test(viewDefinition)) {
    throw new Error(
      `Configured coverage route ${route.cohort}/${route.run_id} View is not directly backed by lr_coverage`
    )
  }
  const shape = (table: string) =>
    columns
      .filter((row) => String(row.table) === table)
      .sort((left, right) => Number(left.position) - Number(right.position))
      .map((row) => [String(row.name), String(row.type)])
  if (
    !exactJson(shape('lr_coverage'), y1CoverageRawColumnShape) ||
    !exactJson(shape('lr_y1_coverage'), y1CoverageViewColumnShape)
  ) {
    throw new Error(
      `Configured coverage route ${route.cohort}/${route.run_id} has an unexpected raw/View column shape`
    )
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

const sourcePhasedColumnShape = [
  ['stable_key', 'FixedString(64)'],
  ['chrom', 'LowCardinality(String)'],
  ['pos1', 'UInt32'],
  ['pos2', 'UInt32'],
  ['sample_id', 'LowCardinality(String)'],
  ['source_haplotype', 'UInt8'],
  ['methylation', 'Float32'],
  ['coverage', 'UInt32'],
] as const

export const validateSourcePhasedMethylationPhysicalState = (
  route: SourcePhasedMethylationRoute,
  state: { tables: any[]; columns: any[]; parts: any[] }
) => {
  if (state.tables.length !== 1) {
    throw new Error('Source-phased methylation requires exactly one presentation table')
  }
  const table = state.tables[0]
  const definition = String(table.create_table_query || '').replace(/`/g, '')
  if (
    String(table.name) !== SOURCE_PHASED_METHYLATION_TABLE ||
    String(table.engine) !== 'MergeTree' ||
    String(table.partition_key).replace(/`/g, '') !== 'chrom' ||
    String(table.sorting_key).replace(/[`()\s]/g, '') !==
      'chrom,pos1,sample_id,source_haplotype,stable_key' ||
    !definition.includes('source_haplotype_is_1_or_2') ||
    !/source_haplotype\s+IN\s*\(\s*1\s*,\s*2\s*\)/.test(definition) ||
    !definition.includes('one_base_bed_interval') ||
    !/pos2\s*=\s*\(?\s*pos1\s*\+\s*1\s*\)?/.test(definition) ||
    !definition.includes('methylation_percentage') ||
    !/methylation\s*>=\s*0/.test(definition) ||
    !/methylation\s*<=\s*100/.test(definition)
  ) {
    throw new Error('Source-phased methylation table storage contract is not exact')
  }
  const columns = state.columns
    .sort((left, right) => Number(left.position) - Number(right.position))
    .map((row) => [String(row.name), String(row.type)])
  if (!exactJson(columns, sourcePhasedColumnShape)) {
    throw new Error('Source-phased methylation table has an unexpected column shape')
  }
  const physical = state.parts
    .map((row) => ({
      chrom: String(row.chrom).replace(/^'+|'+$/g, ''),
      rows: Number(row.rows),
    }))
    .sort((left, right) => left.chrom.localeCompare(right.chrom))
  const expected = route.receipt.contigs
    .map(({ chrom, rows }) => ({ chrom, rows }))
    .sort((left, right) => left.chrom.localeCompare(right.chrom))
  if (
    !exactJson(physical, expected) ||
    physical.reduce((total, row) => total + row.rows, 0) !== route.receipt.detail_rows
  ) {
    throw new Error('Source-phased methylation physical partitions do not match the serving receipt')
  }
}

export const validateSourcePhasedMethylationRepresentative = (rows: any[]) => {
  const row = rows[0] || {}
  if (
    rows.length !== 1 ||
    Number(row.rows) !== 508 ||
    Number(row.unique_keys) !== 508 ||
    Number(row.hap1) !== 254 ||
    Number(row.hap2) !== 254 ||
    Number(row.min_pos1) !== 47_040_006 ||
    Number(row.max_pos2) !== 47_049_910 ||
    Number(row.exact) !== 508
  ) {
    throw new Error('Source-phased methylation representative product semantics do not match v3')
  }
}

const preflightSourcePhasedMethylation = async (route: SourcePhasedMethylationRoute) => {
  const client = getSourcePhasedMethylationClickhouseClient(route)
  const query = async (sql: string, query_params: Record<string, unknown> = {}) => {
    const result = await client.query({ query: sql, query_params, format: 'JSONEachRow' })
    return (await result.json()) as any[]
  }
  const [tables, columns, parts] = await Promise.all([
    query(
      `SELECT name, engine, partition_key, sorting_key, create_table_query
       FROM system.tables
       WHERE database = currentDatabase() AND name = {table:String}`,
      { table: SOURCE_PHASED_METHYLATION_TABLE }
    ),
    query(
      `SELECT name, type, position FROM system.columns
       WHERE database = currentDatabase() AND table = {table:String}
       ORDER BY position`,
      { table: SOURCE_PHASED_METHYLATION_TABLE }
    ),
    query(
      `SELECT partition AS chrom, sum(rows) AS rows FROM system.parts
       WHERE active AND database = currentDatabase() AND table = {table:String}
       GROUP BY partition ORDER BY partition`,
      { table: SOURCE_PHASED_METHYLATION_TABLE }
    ),
  ])
  validateSourcePhasedMethylationPhysicalState(route, { tables, columns, parts })
  const representative = await query(
    `SELECT count() AS rows, uniqExact(stable_key) AS unique_keys,
       countIf(source_haplotype = 1) AS hap1, countIf(source_haplotype = 2) AS hap2,
       min(pos1) AS min_pos1, max(pos2) AS max_pos2,
       countIf(source_haplotype IN (1, 2) AND pos2 = pos1 + 1
         AND isFinite(methylation) AND methylation BETWEEN 0 AND 100) AS exact
     FROM ${SOURCE_PHASED_METHYLATION_TABLE}
     WHERE chrom = 'chr22' AND pos1 BETWEEN 47040000 AND 47050000
       AND sample_id = 'HG00097'`
  )
  validateSourcePhasedMethylationRepresentative(representative)
  activeSourcePhasedMethylationRoute = route
}

const preflightConfiguredRoute = async (route: Y1AncillaryRoute) => {
  const rawBackedCoverageView =
    route.modality === 'coverage' && route.receipt.source_format === 'coverage_view_completion'
  const strictStrCompletion =
    route.modality === 'str_histogram' && route.receipt.source_format === 'str_completion'
  if (rawBackedCoverageView) await requireCoverageViewStorage(route)
  else if (strictStrCompletion) await requireAncillarySchema(route, strictStrRequiredColumns)
  else await requireAncillarySchema(route)
  const reconciliation = route.receipt.reconciliation as any
  if (rawBackedCoverageView) {
    const [rawParts, representative] = await Promise.all([
      queryRows(
        route,
        `
        SELECT partition AS chrom, sum(rows) AS rows
        FROM system.parts
        WHERE active AND database = currentDatabase() AND table = 'lr_coverage'
        GROUP BY partition
        ORDER BY partition
      `
      ),
      queryRows(
        route,
        `
        SELECT count() AS rows, min(position) AS min_position, max(position) AS max_position,
          uniqExact(position) AS unique_positions,
          countIf(ancillary_run_id = {runId:String} AND release = 'y1'
            AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
            AND modality = 'sequencing_coverage' AND source_version = 'gnomad-lr-v2'
            AND source_uri = {sourceUri:String}
            AND source_generation = {sourceGeneration:String}
            AND source_size_bytes = {sourceSize:UInt64}
            AND source_checksum_algorithm = 'md5_base64'
            AND source_checksum = {sourceChecksum:String}
            AND runtime_source_uri = {runtimeSourceUri:String}
            AND runtime_source_generation = {runtimeSourceGeneration:String}) AS exact
        FROM lr_y1_coverage
        WHERE chrom = 'chr22' AND position BETWEEN 100000 AND 100009
      `,
        {
          runId: route.run_id,
          cohort: route.cohort,
          sourceUri: reconciliation.source.uri,
          sourceGeneration: reconciliation.source.generation,
          sourceSize: reconciliation.source.byte_size,
          sourceChecksum: reconciliation.source.md5_base64,
          runtimeSourceUri: reconciliation.source.runtime_uri,
          runtimeSourceGeneration: reconciliation.source.runtime_generation,
        }
      ),
    ])
    const observedParts = sortedContigRows(rawParts)
    const expectedParts = sortedContigRows(reconciliation.contigs).map(({ chrom, rows }) => ({
      chrom,
      rows,
    }))
    const sample = representative[0] || {}
    if (
      !exactJson(observedParts, expectedParts) ||
      observedParts.reduce((total, row) => total + row.rows, 0) !==
        Number(reconciliation.canonical_rows) ||
      Number(sample.rows) !== 10 ||
      Number(sample.min_position) !== 100000 ||
      Number(sample.max_position) !== 100009 ||
      Number(sample.unique_positions) !== 10 ||
      Number(sample.exact) !== 10
    ) {
      throw new Error(
        `Configured coverage route ${route.cohort}/${route.run_id} raw backing/View does not match its completion receipt`
      )
    }
  } else if (route.modality === 'coverage') {
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
  } else if (strictStrCompletion) {
    const [tables, mappingContigs, canonicalContigs, canonicalTotals, keyRows] = await Promise.all([
      queryRows(
        route,
        `
        SELECT name, engine FROM system.tables
        WHERE database = currentDatabase()
          AND name IN ('lr_y1_str_histograms', 'lr_y1_str_histogram_mapping')
        ORDER BY name
      `
      ),
      queryRows(
        route,
        `
        SELECT chrom, count() AS mapping_count,
          countIf(mapping_status = 'available_exact') AS available_exact,
          countIf(mapping_status = 'unavailable_no_exact_key') AS unavailable_no_exact_key,
          countIf(mapping_status NOT IN ('available_exact', 'unavailable_no_exact_key')) AS invalid,
          min(position) AS min_position, max(position) AS max_position,
          countIf(ancillary_run_id = {runId:String} AND release = 'y1'
            AND cohort = {cohort:String} AND reference_genome = 'GRCh38'
            AND modality = 'str_histogram'
            AND source_uri = {sourceUri:String}
            AND source_generation = {sourceGeneration:String}
            AND source_size_bytes = {sourceSize:UInt64}
            AND source_checksum_algorithm = 'md5_base64'
            AND source_checksum = {sourceChecksum:String}
            AND runtime_source_uri = {runtimeSourceUri:String}
            AND runtime_source_generation = {runtimeSourceGeneration:String}) AS exact
        FROM lr_y1_str_histogram_mapping
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
        GROUP BY chrom
        ORDER BY chrom
      `,
        {
          runId: route.run_id,
          cohort: route.cohort,
          sourceUri: reconciliation.source.uri,
          sourceGeneration: reconciliation.source.generation,
          sourceSize: reconciliation.source.byte_size,
          sourceChecksum: reconciliation.source.md5_base64,
          runtimeSourceUri: reconciliation.source.runtime_uri,
          runtimeSourceGeneration: reconciliation.source.runtime_generation,
        }
      ),
      queryRows(
        route,
        `
        SELECT chrom, count() AS rows,
          countIf(mapping_status = 'available_exact' AND ancillary_run_id = {runId:String}
            AND release = 'y1' AND cohort = {cohort:String}
            AND reference_genome = 'GRCh38' AND modality = 'str_histogram'
            AND source_uri = {sourceUri:String}
            AND source_generation = {sourceGeneration:String}
            AND source_size_bytes = {sourceSize:UInt64}
            AND source_checksum_algorithm = 'md5_base64'
            AND source_checksum = {sourceChecksum:String}
            AND runtime_source_uri = {runtimeSourceUri:String}
            AND runtime_source_generation = {runtimeSourceGeneration:String}) AS exact
        FROM lr_y1_str_histograms
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
        GROUP BY chrom
        ORDER BY chrom
      `,
        {
          runId: route.run_id,
          cohort: route.cohort,
          sourceUri: reconciliation.source.uri,
          sourceGeneration: reconciliation.source.generation,
          sourceSize: reconciliation.source.byte_size,
          sourceChecksum: reconciliation.source.md5_base64,
          runtimeSourceUri: reconciliation.source.runtime_uri,
          runtimeSourceGeneration: reconciliation.source.runtime_generation,
        }
      ),
      queryRows(
        route,
        `
        SELECT count() AS rows,
          uniqExact((primary_run_id, y1_source_variant_id)) AS primary_ids,
          uniqExact((chrom, position, source_end, motif)) AS exact_keys,
          uniqExact((chrom, position)) AS positions
        FROM lr_y1_str_histograms
        WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
      `,
        { runId: route.run_id, cohort: route.cohort }
      ),
      queryRows(
        route,
        `
        SELECT countIf(mapping_rows != 1 OR canonical_rows != 1) AS key_mismatches
        FROM (
          SELECT y1_source_variant_id, chrom, position, source_end, motif,
            count() AS mapping_rows
          FROM lr_y1_str_histogram_mapping
          WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
            AND mapping_status = 'available_exact'
          GROUP BY y1_source_variant_id, chrom, position, source_end, motif
        ) AS mapping
        FULL OUTER JOIN (
          SELECT y1_source_variant_id, chrom, position, source_end, motif,
            count() AS canonical_rows
          FROM lr_y1_str_histograms
          WHERE ancillary_run_id = {runId:String} AND cohort = {cohort:String}
          GROUP BY y1_source_variant_id, chrom, position, source_end, motif
        ) AS canonical
        USING (y1_source_variant_id, chrom, position, source_end, motif)
      `,
        { runId: route.run_id, cohort: route.cohort }
      ),
    ])
    const engines = new Map(tables.map((row) => [String(row.name), String(row.engine)]))
    const observedMapping = mappingContigs
      .map((row) => ({
        chrom: String(row.chrom),
        mapping_count: Number(row.mapping_count),
        available_exact: Number(row.available_exact),
        unavailable_no_exact_key: Number(row.unavailable_no_exact_key),
        min_position: Number(row.min_position),
        max_position: Number(row.max_position),
      }))
      .sort((left, right) => left.chrom.localeCompare(right.chrom))
    const expectedMapping = (reconciliation.contigs as any[])
      .map((row) => ({
        chrom: String(row.chrom),
        mapping_count: Number(row.mapping_count),
        available_exact: Number(row.available_exact),
        unavailable_no_exact_key: Number(row.unavailable_no_exact_key),
        min_position: Number(row.min_position),
        max_position: Number(row.max_position),
      }))
      .sort((left, right) => left.chrom.localeCompare(right.chrom))
    const observedCanonical = new Map(
      canonicalContigs.map((row) => [String(row.chrom), Number(row.rows)])
    )
    const totals = canonicalTotals[0] || {}
    if (
      engines.get('lr_y1_str_histogram_mapping') !== 'MergeTree' ||
      engines.get('lr_y1_str_histograms') !== 'MergeTree' ||
      !exactJson(observedMapping, expectedMapping) ||
      mappingContigs.some(
        (row) => Number(row.invalid) !== 0 || Number(row.exact) !== Number(row.mapping_count)
      ) ||
      canonicalContigs.some(
        (row) =>
          Number(row.exact) !== Number(row.rows) ||
          Number(row.rows) !==
            Number(
              (reconciliation.contigs as any[]).find(
                (contig) => String(contig.chrom) === String(row.chrom)
              )?.available_exact
            )
      ) ||
      observedCanonical.size !== (reconciliation.contigs as any[]).length ||
      Number(totals.rows) !== Number(reconciliation.canonical_rows) ||
      Number(totals.primary_ids) !== Number(reconciliation.canonical_rows) ||
      Number(totals.exact_keys) !== Number(reconciliation.canonical_rows) ||
      Number(totals.positions) !== Number(reconciliation.canonical_rows) ||
      Number(keyRows[0]?.key_mismatches ?? -1) !== 0
    ) {
      throw new Error(
        `Configured STR route ${route.cohort}/${route.run_id} does not match its completion receipt`
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
  activeSourcePhasedMethylationRoute = null
  if (!isY1PilotEnabled) return

  for (const modality of ['coverage', 'methylation', 'str_histogram'] as const) {
    capabilities.set(routeKey('hgsvc_hprc', modality), {
      available: false,
      source: 'UNAVAILABLE',
      reason: 'Unavailable until a unique ancillary run and provenance are validated',
    })
  }
  await Promise.all([
    ...y1AncillaryRoutes.map((route) => preflightConfiguredRoute(route)),
    ...(sourcePhasedMethylationRoute
      ? [preflightSourcePhasedMethylation(sourcePhasedMethylationRoute)]
      : []),
  ])
}

export const getSourcePhasedMethylationRoute = () => activeSourcePhasedMethylationRoute

export const getY1AncillaryRoute = (
  cohort: string | null | undefined,
  modality: Exclude<AncillaryModality, 'mqtl'>
) => activeRoutes.get(routeKey(cohort, modality)) || null

export const y1AncillaryCapabilities = () => new Map(capabilities)

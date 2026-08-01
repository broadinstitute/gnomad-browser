import {
  isY1PilotEnabled,
  y1ClickhouseClient,
  y1ClickhouseConfig,
} from '../clickhouse'
import type { LongReadCohort } from './long_read_y1_variants'

// The current finalizer name lives in one place so a backend rename to
// `accepted` is a one-line contract change.
export const ACCEPTED_Y1_RUN_STATE = 'accepted_frozen'

export type Y1SourceSnapshot = {
  database: string
  release: string
  cohort: LongReadCohort
  reference_genome: string
  chrom: string
  load_scope: string
  run_id: string
  state: typeof ACCEPTED_Y1_RUN_STATE
  metadata_run_id: string | null
}

type RunRow = Omit<Y1SourceSnapshot, 'database' | 'metadata_run_id' | 'state'> & {
  state: string
}

type TableColumns = Map<string, Set<string>>

const requiredColumns: Record<string, string[]> = {
  lr_y1_load_runs: [
    'run_id', 'revision', 'release', 'cohort', 'reference_genome', 'chrom',
    'load_scope', 'state',
  ],
  lr_y1_summaries: [
    'run_id', 'release', 'cohort', 'reference_genome', 'chrom',
  ],
  lr_y1_alleles: [
    'run_id', 'release', 'cohort', 'reference_genome', 'chrom', 'position',
    'reference_end', 'xpos', 'source_variant_id', 'alt_index', 'ref_allele', 'alt',
    'allele_type', 'filters', 'ac', 'an', 'af', 'allele_length', 'rsids',
    'cadd_phred', 'phylop', 'major_consequence', 'short_read_match_id',
    'short_read_match_type', 'short_read_match_source',
  ],
  lr_y1_frequencies: [
    'run_id', 'release', 'cohort', 'reference_genome', 'chrom', 'position',
    'source_variant_id', 'alt_index', 'division', 'ac', 'an', 'af', 'values_available',
  ],
}

let snapshots: Map<LongReadCohort, Y1SourceSnapshot> | null = null
let discoveredColumns: TableColumns | null = null

const rows = async (query: string, query_params: Record<string, unknown> = {}) => {
  const result = await y1ClickhouseClient.query({ query, query_params, format: 'JSONEachRow' })
  return (await result.json()) as any[]
}

const loadTableColumns = async (): Promise<TableColumns> => {
  const schemaRows = await rows(`
    SELECT table, name
    FROM system.columns
    WHERE database = currentDatabase() AND (
      startsWith(table, 'lr_y1_') OR table IN (
        'lr_str_histograms',
        'lr_methylation_canonical_prototype',
        'lr_methylation_summary_canonical_prototype',
        'lr_methylation_sample_availability_canonical_prototype'
      )
    )
    ORDER BY table, position
  `)
  const columns: TableColumns = new Map()
  for (const row of schemaRows) {
    const names = columns.get(String(row.table)) || new Set<string>()
    names.add(String(row.name))
    columns.set(String(row.table), names)
  }
  return columns
}

const requirePrimarySchema = (columns: TableColumns) => {
  for (const [table, required] of Object.entries(requiredColumns)) {
    const actual = columns.get(table)
    if (!actual) throw new Error(`Y1 database is missing required table ${table}`)
    const missing = required.filter((column) => !actual.has(column))
    if (missing.length) throw new Error(`${table} is missing required columns: ${missing.join(', ')}`)
  }
}

const discoverRunRows = async (): Promise<RunRow[]> => rows(`
  SELECT run_id,
    argMax(release, revision) AS release,
    argMax(cohort, revision) AS cohort,
    argMax(reference_genome, revision) AS reference_genome,
    argMax(chrom, revision) AS chrom,
    argMax(load_scope, revision) AS load_scope,
    argMax(state, revision) AS state
  FROM lr_y1_load_runs
  GROUP BY run_id
  ORDER BY cohort, run_id
`)

const acceptedRuns = (runRows: RunRow[]) => {
  const recognized = runRows.filter(
    (run): run is RunRow & { cohort: LongReadCohort } =>
      run.cohort === 'hgsvc_hprc' || run.cohort === 'aou'
  )
  const byCohort = new Map<LongReadCohort, RunRow[]>()
  for (const cohort of ['hgsvc_hprc', 'aou'] as const) {
    const present = recognized.filter((run) => run.cohort === cohort)
    if (present.length) {
      const accepted = present.filter((run) => run.state === ACCEPTED_Y1_RUN_STATE)
      if (accepted.length === 0) {
        throw new Error(`${cohort} has runs but no terminal ${ACCEPTED_Y1_RUN_STATE} run`)
      }
      if (accepted.length > 1) {
        throw new Error(`${cohort} has multiple terminal ${ACCEPTED_Y1_RUN_STATE} runs`)
      }
      byCohort.set(cohort, accepted)
    }
  }
  if (!byCohort.size) throw new Error('Y1 database has zero usable cohorts')

  const selected = [...byCohort.values()].map(([run]) => run)
  for (const run of selected) {
    if (!run.run_id || run.release !== 'y1' || run.reference_genome !== 'GRCh38' ||
        !run.chrom || !run.load_scope) {
      throw new Error(`Accepted Y1 run ${run.run_id || '<missing>'} has malformed provenance`)
    }
  }
  const scopeKeys = new Set(selected.map(
    (run) => [run.release, run.reference_genome, run.chrom, run.load_scope].join('\u0000')
  ))
  if (scopeKeys.size !== 1) {
    throw new Error('Accepted Y1 cohort runs have conflicting release/reference/chrom/scope')
  }
  return byCohort
}

const requireCanonicalRows = async (run: RunRow) => {
  const counts = await rows(`
    SELECT 'lr_y1_summaries' AS table, count() AS n FROM lr_y1_summaries
      WHERE run_id = {runId:String} AND release = {release:String}
        AND cohort = {cohort:String} AND reference_genome = {referenceGenome:String}
        AND chrom = {chrom:String}
    UNION ALL
    SELECT 'lr_y1_alleles' AS table, count() AS n FROM lr_y1_alleles
      WHERE run_id = {runId:String} AND release = {release:String}
        AND cohort = {cohort:String} AND reference_genome = {referenceGenome:String}
        AND chrom = {chrom:String}
    UNION ALL
    SELECT 'lr_y1_frequencies' AS table, count() AS n FROM lr_y1_frequencies
      WHERE run_id = {runId:String} AND release = {release:String}
        AND cohort = {cohort:String} AND reference_genome = {referenceGenome:String}
        AND chrom = {chrom:String}
  `, {
    runId: run.run_id, release: run.release, cohort: run.cohort,
    referenceGenome: run.reference_genome, chrom: run.chrom,
  })
  const countsByTable = new Map(counts.map((row) => [String(row.table), Number(row.n)]))
  for (const table of ['lr_y1_summaries', 'lr_y1_alleles', 'lr_y1_frequencies']) {
    if (!countsByTable.get(table)) {
      throw new Error(`Accepted Y1 run ${run.run_id} has no canonical rows in ${table}`)
    }
  }
}

const validateCarrierStructure = async (
  columns: TableColumns,
  runs: Map<LongReadCohort, RunRow[]>
) => {
  const carriers = columns.get('lr_y1_carriers')
  const hgsvc = runs.get('hgsvc_hprc')?.[0]
  if (hgsvc) {
    if (!carriers) throw new Error('HGSVC/HPRC haplotypes require lr_y1_carriers')
    const missing = [
      'run_id', 'release', 'cohort', 'reference_genome', 'chrom', 'position',
      'source_variant_id', 'alt_index', 'alt', 'sample_id', 'genotype_position',
      'genotype_fields_json', 'gt_phased', 'gt_alleles',
    ].filter((column) => !carriers.has(column))
    if (missing.length) throw new Error(`lr_y1_carriers is missing required columns: ${missing.join(', ')}`)
  }
  if (!carriers) return

  const carrierCounts = await rows(`
    SELECT run_id, cohort, count() AS n
    FROM lr_y1_carriers
    GROUP BY run_id, cohort
  `)
  if (carrierCounts.some((row) => row.cohort === 'aou' && Number(row.n) > 0)) {
    throw new Error('AoU is summary-only and must not have carrier rows')
  }
  if (hgsvc && !carrierCounts.some(
    (row) => row.run_id === hgsvc.run_id && row.cohort === 'hgsvc_hprc' && Number(row.n) > 0
  )) {
    throw new Error(`Accepted HGSVC/HPRC run ${hgsvc.run_id} has no carrier rows`)
  }
}

const resolveOptionalMetadataRun = async (
  columns: TableColumns,
  hgsvcRun: RunRow | undefined
): Promise<string | null> => {
  if (!hgsvcRun) return null
  const runColumns = columns.get('lr_y1_metadata_runs')
  const dataColumns = columns.get('lr_y1_sample_metadata')
  if (!runColumns || !dataColumns) return null
  const requiredRunColumns = ['metadata_run_id', 'revision', 'state', 'release', 'cohort', 'reference_genome']
  const requiredDataColumns = [
    'metadata_run_id', 'release', 'cohort', 'reference_genome', 'sample_id',
    'subpopulation', 'superpopulation',
  ]
  if (requiredRunColumns.some((column) => !runColumns.has(column)) ||
      requiredDataColumns.some((column) => !dataColumns.has(column))) return null

  const metadataRuns = await rows(`
    SELECT metadata_run_id, argMax(state, revision) AS state,
      argMax(release, revision) AS release,
      argMax(cohort, revision) AS cohort,
      argMax(reference_genome, revision) AS reference_genome
    FROM lr_y1_metadata_runs
    GROUP BY metadata_run_id
  `)
  const accepted = metadataRuns.filter((run) =>
    run.state === 'accepted' && run.release === hgsvcRun.release &&
    run.cohort === 'hgsvc_hprc' && run.reference_genome === hgsvcRun.reference_genome
  )
  if (accepted.length !== 1) return null
  const metadataRunId = String(accepted[0].metadata_run_id)
  const countRows = await rows(`
    SELECT count() AS n FROM lr_y1_sample_metadata
    WHERE metadata_run_id = {metadataRunId:String}
  `, { metadataRunId })
  return Number(countRows[0]?.n) > 0 ? metadataRunId : null
}

export const preflightY1AcceptedSources = async () => {
  snapshots = new Map()
  discoveredColumns = null
  if (!isY1PilotEnabled) return

  const columns = await loadTableColumns()
  requirePrimarySchema(columns)
  const runs = acceptedRuns(await discoverRunRows())
  await Promise.all([...runs.values()].map(([run]) => requireCanonicalRows(run)))
  await validateCarrierStructure(columns, runs)
  const metadataRunId = await resolveOptionalMetadataRun(columns, runs.get('hgsvc_hprc')?.[0])

  for (const [cohort, [run]] of runs) {
    snapshots.set(cohort, {
      database: y1ClickhouseConfig.database,
      release: run.release,
      cohort,
      reference_genome: run.reference_genome,
      chrom: run.chrom,
      load_scope: run.load_scope,
      run_id: run.run_id,
      state: ACCEPTED_Y1_RUN_STATE,
      metadata_run_id: cohort === 'hgsvc_hprc' ? metadataRunId : null,
    })
  }
  discoveredColumns = columns
}

export const getY1SourceSnapshot = async (cohort: LongReadCohort) => {
  if (!isY1PilotEnabled) return null
  if (!snapshots) await preflightY1AcceptedSources()
  return snapshots!.get(cohort) || null
}

export const getY1DiscoveredTableColumns = () => discoveredColumns

export const resetY1SourceSnapshotForTests = () => {
  snapshots = null
  discoveredColumns = null
}

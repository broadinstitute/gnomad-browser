import {
  isY1PilotEnabled,
  y1ClickhouseClient,
  y1ClickhouseConfig,
  y1PrimaryManifests,
  y1PrimaryRunMap,
} from '../clickhouse'
import { canonicalY1ContigLengths, type Y1PrimaryManifest } from '../y1_admission_config'
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
  state: typeof ACCEPTED_Y1_RUN_STATE | 'accepted_tasks'
  metadata_run_id: string | null
  carriers_available: boolean
}

type RunRow = Omit<
  Y1SourceSnapshot,
  'database' | 'metadata_run_id' | 'state' | 'carriers_available'
> & {
  state: string
  interval_start: number
  interval_end: number
  summary_rows: number
  allele_rows: number
  frequency_rows: number
  carrier_rows: number
  expected_tasks: number
  latest_revision_rows: number
}

type TableColumns = Map<string, Set<string>>

const requiredColumns: Record<string, string[]> = {
  lr_y1_load_runs: [
    'run_id',
    'revision',
    'release',
    'cohort',
    'reference_genome',
    'chrom',
    'load_scope',
    'interval_start',
    'interval_end',
    'state',
    'summary_rows',
    'allele_rows',
    'frequency_rows',
    'carrier_rows',
    'expected_tasks',
  ],
  lr_y1_summaries: ['run_id', 'release', 'cohort', 'reference_genome', 'chrom'],
  lr_y1_alleles: [
    'run_id',
    'release',
    'cohort',
    'reference_genome',
    'chrom',
    'position',
    'reference_end',
    'xpos',
    'source_variant_id',
    'alt_index',
    'ref_allele',
    'alt',
    'allele_type',
    'filters',
    'ac',
    'an',
    'af',
    'allele_length',
    'rsids',
    'cadd_phred',
    'phylop',
    'major_consequence',
    'short_read_match_id',
    'short_read_match_type',
    'short_read_match_source',
  ],
  lr_y1_frequencies: [
    'run_id',
    'release',
    'cohort',
    'reference_genome',
    'chrom',
    'position',
    'source_variant_id',
    'alt_index',
    'division',
    'ac',
    'an',
    'af',
    'values_available',
  ],
}

let snapshots: Map<string, Y1SourceSnapshot> | null = null
let discoveredColumns: TableColumns | null = null

const snapshotKey = (cohort: LongReadCohort, chrom: string) => `${cohort}\u0000${chrom}`
const normalizedChrom = (chrom: string) => (chrom.startsWith('chr') ? chrom : `chr${chrom}`)

const rows = async (query: string, query_params: Record<string, unknown> = {}) => {
  const result = await y1ClickhouseClient.query({ query, query_params, format: 'JSONEachRow' })
  return (await result.json()) as any[]
}

const loadTableColumns = async (): Promise<TableColumns> => {
  const schemaRows = await rows(`
    SELECT table, name
    FROM system.columns
    WHERE database = currentDatabase() AND startsWith(table, 'lr_y1_')
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
    if (missing.length)
      throw new Error(`${table} is missing required columns: ${missing.join(', ')}`)
  }
}

// Join back to the physical maximum-revision rows instead of independently
// argMax-ing columns. The window count makes an equal-maximum conflict visible.
const discoverRunRows = async (): Promise<RunRow[]> =>
  rows(`
  SELECT ledger.run_id, ledger.release, ledger.cohort, ledger.reference_genome,
    ledger.chrom, ledger.load_scope, ledger.interval_start, ledger.interval_end,
    ledger.state, ledger.summary_rows, ledger.allele_rows, ledger.frequency_rows,
    ledger.carrier_rows, ledger.expected_tasks,
    count() OVER (PARTITION BY ledger.run_id) AS latest_revision_rows
  FROM lr_y1_load_runs AS ledger
  INNER JOIN (
    SELECT run_id, max(revision) AS revision
    FROM lr_y1_load_runs
    GROUP BY run_id
  ) AS latest
    ON ledger.run_id = latest.run_id AND ledger.revision = latest.revision
  ORDER BY ledger.cohort, ledger.run_id
`)

const acceptedRuns = (runRows: RunRow[]) => {
  const conflicted = runRows.find((run) => Number(run.latest_revision_rows) !== 1)
  if (conflicted) {
    throw new Error(`Y1 run ${conflicted.run_id} has duplicate rows at its maximum revision`)
  }
  const runIds = new Set<string>()
  for (const run of runRows) {
    if (runIds.has(run.run_id)) {
      throw new Error(`Y1 run ${run.run_id} has duplicate rows at its maximum revision`)
    }
    runIds.add(run.run_id)
  }

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
    if (
      !run.run_id ||
      run.release !== 'y1' ||
      run.reference_genome !== 'GRCh38' ||
      !run.chrom ||
      run.load_scope !== 'full_chromosome'
    ) {
      throw new Error(
        `Accepted Y1 run ${run.run_id || '<missing>'} must have full-chromosome provenance`
      )
    }
  }
  const scopeKeys = new Set(
    selected.map((run) =>
      [run.release, run.reference_genome, run.chrom, run.load_scope].join('\u0000')
    )
  )
  if (scopeKeys.size !== 1) {
    throw new Error('Accepted Y1 cohort runs have conflicting release/reference/chrom/scope')
  }
  return byCohort
}

const requireCanonicalRows = async (
  run: RunRow,
  receiptCounts?: { summaries: number; alleles: number; frequencies: number }
) => {
  const counts = await rows(
    `
    SELECT 'lr_y1_summaries' AS table, count() AS total,
      countIf(release = {release:String} AND cohort = {cohort:String}
        AND reference_genome = {referenceGenome:String} AND chrom = {chrom:String}) AS exact
    FROM lr_y1_summaries WHERE run_id = {runId:String}
    UNION ALL
    SELECT 'lr_y1_alleles' AS table, count() AS total,
      countIf(release = {release:String} AND cohort = {cohort:String}
        AND reference_genome = {referenceGenome:String} AND chrom = {chrom:String}) AS exact
    FROM lr_y1_alleles WHERE run_id = {runId:String}
    UNION ALL
    SELECT 'lr_y1_frequencies' AS table, count() AS total,
      countIf(release = {release:String} AND cohort = {cohort:String}
        AND reference_genome = {referenceGenome:String} AND chrom = {chrom:String}) AS exact
    FROM lr_y1_frequencies WHERE run_id = {runId:String}
  `,
    {
      runId: run.run_id,
      release: run.release,
      cohort: run.cohort,
      referenceGenome: run.reference_genome,
      chrom: run.chrom,
    }
  )
  const expected = new Map([
    ['lr_y1_summaries', receiptCounts?.summaries ?? Number(run.summary_rows)],
    ['lr_y1_alleles', receiptCounts?.alleles ?? Number(run.allele_rows)],
    ['lr_y1_frequencies', receiptCounts?.frequencies ?? Number(run.frequency_rows)],
  ])
  const observed = new Map(counts.map((row) => [String(row.table), row]))
  for (const [table, expectedRows] of expected) {
    const row = observed.get(table)
    const total = Number(row?.total ?? -1)
    const exact = Number(row?.exact ?? -1)
    if (expectedRows <= 0 || total !== expectedRows || exact !== expectedRows) {
      throw new Error(
        `Accepted Y1 run ${run.run_id} ${table} count/identity mismatch: ` +
          `ledger=${expectedRows}, total=${total}, exact=${exact}`
      )
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
      'run_id',
      'release',
      'cohort',
      'reference_genome',
      'chrom',
      'position',
      'source_variant_id',
      'alt_index',
      'alt',
      'sample_id',
      'genotype_position',
      'genotype_fields_json',
      'gt_phased',
      'gt_alleles',
    ].filter((column) => !carriers.has(column))
    if (missing.length)
      throw new Error(`lr_y1_carriers is missing required columns: ${missing.join(', ')}`)
  }

  await Promise.all(
    [...runs].map(async ([cohort, [run]]) => {
      const expected = Number(run.carrier_rows)
      if (cohort === 'aou' && expected !== 0) {
        throw new Error(`Accepted AoU run ${run.run_id} ledger must declare zero carrier rows`)
      }
      if (!carriers) {
        if (expected !== 0) throw new Error(`Accepted Y1 run ${run.run_id} is missing carrier rows`)
        return
      }
      const countRows = await rows(
        `
      SELECT count() AS total,
        countIf(release = {release:String} AND cohort = {cohort:String}
          AND reference_genome = {referenceGenome:String} AND chrom = {chrom:String}) AS exact
      FROM lr_y1_carriers
      WHERE run_id = {runId:String}
    `,
        {
          runId: run.run_id,
          release: run.release,
          cohort: run.cohort,
          referenceGenome: run.reference_genome,
          chrom: run.chrom,
        }
      )
      const total = Number(countRows[0]?.total ?? -1)
      const exact = Number(countRows[0]?.exact ?? -1)
      if (cohort === 'aou') {
        if (total !== 0 || exact !== 0) {
          throw new Error(`Accepted AoU run ${run.run_id} must not have physical carrier rows`)
        }
      } else if (expected <= 0 || total !== expected || exact !== expected) {
        throw new Error(
          `Accepted HGSVC/HPRC run ${run.run_id} carrier count/identity mismatch: ` +
            `ledger=${expected}, total=${total}, exact=${exact}`
        )
      }
    })
  )
}

type AcceptedTaskCounts = {
  summaries: number
  alleles: number
  frequencies: number
  carriers: number
}

type AttemptRow = {
  task_id: string
  attempt_id: string
  state: string
  chrom: string
  interval_start: number
  interval_end: number
  source_records: number
  summary_rows: number
  allele_rows: number
  frequency_rows: number
  carrier_rows: number
  rejected_records: number
  report_json: string
}

const requireAcceptedTaskReceipts = async (
  run: RunRow,
  manifest: Y1PrimaryManifest
): Promise<AcceptedTaskCounts> => {
  if (Number(run.expected_tasks) !== manifest.tasks.length) {
    throw new Error(
      `Y1 presentation run ${run.run_id} expected task count does not match its checked manifest`
    )
  }
  const attemptRows = (await rows(
    `
    SELECT task_id, attempt_id, argMax(state, revision) AS state,
      argMax(chrom, revision) AS chrom,
      argMax(interval_start, revision) AS interval_start,
      argMax(interval_end, revision) AS interval_end,
      argMax(source_records, revision) AS source_records,
      argMax(summary_rows, revision) AS summary_rows,
      argMax(allele_rows, revision) AS allele_rows,
      argMax(frequency_rows, revision) AS frequency_rows,
      argMax(carrier_rows, revision) AS carrier_rows,
      argMax(rejected_records, revision) AS rejected_records,
      argMax(report_json, revision) AS report_json
    FROM lr_y1_task_attempts
    WHERE run_id = {runId:String}
    GROUP BY task_id, attempt_id
    ORDER BY task_id, attempt_id
  `,
    { runId: run.run_id }
  )) as AttemptRow[]
  const rejectRows = await rows(
    `SELECT count() AS physical_rejects FROM lr_y1_rejects_staging WHERE run_id = {runId:String}`,
    { runId: run.run_id }
  )
  if (Number(rejectRows[0]?.physical_rejects || 0) !== 0) {
    throw new Error(`Y1 presentation run ${run.run_id} has physical rejects`)
  }

  const expected = new Map(manifest.tasks.map((task) => [task.task_id, task]))
  const accepted = new Set<string>()
  const counts: AcceptedTaskCounts = { summaries: 0, alleles: 0, frequencies: 0, carriers: 0 }
  for (const row of attemptRows) {
    const task = expected.get(String(row.task_id))
    if (!task) {
      throw new Error(
        `Y1 presentation run ${run.run_id} contains task absent from its checked manifest`
      )
    }
    if (
      !row.attempt_id ||
      row.chrom !== manifest.chrom ||
      Number(row.interval_start) !== task.start ||
      Number(row.interval_end) !== task.stop
    ) {
      throw new Error(
        `Y1 presentation run ${run.run_id} task ${row.task_id} has substituted bounds`
      )
    }
    if (row.state !== 'accepted' && row.state !== 'failed') {
      throw new Error(`Y1 presentation run ${run.run_id} contains nonterminal task attempts`)
    }
    let report: any
    try {
      report = JSON.parse(String(row.report_json))
    } catch {
      throw new Error(`Y1 presentation run ${run.run_id} has invalid task report JSON`)
    }
    const exactStrings: Record<string, string> = {
      run_id: run.run_id,
      task_id: String(row.task_id),
      attempt_id: String(row.attempt_id),
      cohort: manifest.cohort,
      chrom: manifest.chrom,
      source_uri: manifest.source.source_uri,
      source_generation: manifest.source.source_generation,
      source_checksum_algorithm: manifest.source.source_checksum_algorithm,
      source_checksum: manifest.source.source_checksum,
      source_index_uri: manifest.source.source_index_uri,
      source_index_generation: manifest.source.source_index_generation,
      source_index_checksum_algorithm: manifest.source.source_index_checksum_algorithm,
      source_index_checksum: manifest.source.source_index_checksum,
      state: row.state,
    }
    const wrongString = Object.entries(exactStrings).find(
      ([field, value]) => report?.[field] !== value
    )
    if (wrongString) {
      throw new Error(
        `Y1 presentation run ${run.run_id} task ${row.task_id} report ${wrongString[0]} ` +
          'does not match its checked manifest/current attempt'
      )
    }
    if (
      report.start !== task.start ||
      report.stop !== task.stop ||
      report.source_size_bytes !== manifest.source.source_size_bytes ||
      report.source_index_size_bytes !== manifest.source.source_index_size_bytes
    ) {
      throw new Error(
        `Y1 presentation run ${run.run_id} task ${row.task_id} report source/bounds ` +
          'do not match its checked manifest'
      )
    }
    const ledgerCounts = {
      source_records: Number(row.source_records),
      summaries: Number(row.summary_rows),
      alleles: Number(row.allele_rows),
      frequencies: Number(row.frequency_rows),
      carriers: Number(row.carrier_rows),
      rejects: Number(row.rejected_records),
    }
    if (
      !report.counts ||
      Object.entries(ledgerCounts).some(([field, value]) => report.counts[field] !== value)
    ) {
      throw new Error(
        `Y1 presentation run ${run.run_id} task ${row.task_id} report counts mismatch`
      )
    }
    if (row.state === 'accepted') {
      if (accepted.has(row.task_id) || ledgerCounts.rejects !== 0) {
        throw new Error(
          `Y1 presentation run ${run.run_id} lacks exactly one zero-reject accepted attempt per task`
        )
      }
      accepted.add(row.task_id)
      counts.summaries += ledgerCounts.summaries
      counts.alleles += ledgerCounts.alleles
      counts.frequencies += ledgerCounts.frequencies
      counts.carriers += ledgerCounts.carriers
    }
  }
  if (
    accepted.size !== manifest.tasks.length ||
    manifest.tasks.some((task) => !accepted.has(task.task_id))
  ) {
    throw new Error(
      `Y1 presentation run ${run.run_id} lacks exactly one accepted current attempt ` +
        'for every checked manifest task'
    )
  }
  if (counts.summaries <= 0 || counts.alleles <= 0 || counts.frequencies <= 0) {
    throw new Error(`Y1 presentation run ${run.run_id} has empty accepted primary receipts`)
  }
  const carriersExpected = manifest.carrier_loading_status !== 'unavailable_not_loaded'
  if (
    (counts.carriers !== 0 && !carriersExpected) ||
    (counts.carriers <= 0 && carriersExpected && run.cohort === 'hgsvc_hprc') ||
    (counts.carriers !== 0 && run.cohort === 'aou')
  ) {
    throw new Error(`Y1 presentation run ${run.run_id} has invalid accepted carrier receipts`)
  }
  return counts
}

const configuredRuns = async (runRows: RunRow[]) => {
  if (!y1PrimaryRunMap) return null
  if (!y1PrimaryManifests) {
    throw new Error('Configured Y1 presentation routing has no checked manifest bundle')
  }
  const byId = new Map(runRows.map((run) => [run.run_id, run]))
  const selected = new Map<string, RunRow>()
  for (const [cohort, chromRuns] of y1PrimaryRunMap) {
    for (const [chrom, runId] of chromRuns) {
      const manifest = y1PrimaryManifests.get(snapshotKey(cohort, chrom))
      if (!manifest || manifest.run_id !== runId) {
        throw new Error(`Configured Y1 run ${runId} has no exact checked manifest`)
      }
      // Presentation campaigns are admitted from immutable manifests plus exact
      // terminal task attempts. Their lr_y1_load_runs ledger can legitimately
      // remain empty because these runs are served without primary finalization.
      const run = byId.get(runId) || {
        run_id: runId,
        release: 'y1',
        cohort,
        reference_genome: 'GRCh38',
        chrom,
        load_scope: 'full_chromosome',
        state: 'accepted_tasks',
        interval_start: 1,
        interval_end: canonicalY1ContigLengths.get(chrom)!,
        summary_rows: 0,
        allele_rows: 0,
        frequency_rows: 0,
        carrier_rows: 0,
        expected_tasks: manifest.tasks.length,
        latest_revision_rows: 1,
      }
      if (Number(run.latest_revision_rows) !== 1) {
        throw new Error(`Y1 run ${runId} has duplicate rows at its maximum revision`)
      }
      if (
        run.release !== 'y1' ||
        run.cohort !== cohort ||
        run.reference_genome !== 'GRCh38' ||
        run.chrom !== chrom ||
        run.load_scope !== 'full_chromosome'
      ) {
        throw new Error(`Configured Y1 run ${runId} does not match ${cohort}/${chrom}`)
      }
      selected.set(snapshotKey(cohort, chrom), run)
    }
  }
  return selected
}

type MetadataRunRow = {
  metadata_run_id: string
  state: string
  release: string
  cohort: string
  reference_genome: string
  source_manifest_id: string
  source_manifest_sha256: string
  expected_roster_rows: number
  observed_roster_rows: number
  output_rows: number
  latest_revision_rows: number
}

const resolveOptionalMetadataRun = async (
  columns: TableColumns,
  hgsvcRun: RunRow | undefined
): Promise<string | null> => {
  if (!hgsvcRun) return null
  const runColumns = columns.get('lr_y1_metadata_runs')
  const dataColumns = columns.get('lr_y1_sample_metadata')
  if (!runColumns || !dataColumns) return null
  const requiredRunColumns = [
    'metadata_run_id',
    'revision',
    'state',
    'release',
    'cohort',
    'reference_genome',
    'source_manifest_id',
    'source_manifest_sha256',
    'expected_roster_rows',
    'observed_roster_rows',
    'output_rows',
  ]
  const requiredDataColumns = [
    'metadata_run_id',
    'release',
    'cohort',
    'reference_genome',
    'sample_id',
    'source_manifest_id',
    'source_manifest_sha256',
    'subpopulation',
    'superpopulation',
  ]
  if (
    requiredRunColumns.some((column) => !runColumns.has(column)) ||
    requiredDataColumns.some((column) => !dataColumns.has(column))
  )
    return null

  const metadataRuns = (await rows(`
    SELECT ledger.metadata_run_id, ledger.state, ledger.release, ledger.cohort,
      ledger.reference_genome, ledger.source_manifest_id, ledger.source_manifest_sha256,
      ledger.expected_roster_rows, ledger.observed_roster_rows, ledger.output_rows,
      count() OVER (PARTITION BY ledger.metadata_run_id) AS latest_revision_rows
    FROM lr_y1_metadata_runs AS ledger
    INNER JOIN (
      SELECT metadata_run_id, max(revision) AS revision
      FROM lr_y1_metadata_runs
      GROUP BY metadata_run_id
    ) AS latest
      ON ledger.metadata_run_id = latest.metadata_run_id
      AND ledger.revision = latest.revision
  `)) as MetadataRunRow[]
  if (metadataRuns.some((run) => Number(run.latest_revision_rows) !== 1)) return null
  const accepted = metadataRuns.filter(
    (run) =>
      run.state === 'accepted' &&
      run.release === hgsvcRun.release &&
      run.cohort === hgsvcRun.cohort &&
      run.reference_genome === hgsvcRun.reference_genome
  )
  if (accepted.length !== 1) return null
  const run = accepted[0]
  const expected = Number(run.output_rows)
  if (
    expected <= 0 ||
    Number(run.expected_roster_rows) !== expected ||
    Number(run.observed_roster_rows) !== expected
  )
    return null

  const countRows = await rows(
    `
    SELECT count() AS total,
      countIf(release = {release:String} AND cohort = {cohort:String}
        AND reference_genome = {referenceGenome:String}
        AND source_manifest_id = {sourceManifestId:String}
        AND source_manifest_sha256 = {sourceManifestSha256:String}) AS exact,
      uniqExactIf(sample_id, release = {release:String} AND cohort = {cohort:String}
        AND reference_genome = {referenceGenome:String}
        AND source_manifest_id = {sourceManifestId:String}
        AND source_manifest_sha256 = {sourceManifestSha256:String}) AS unique_samples
    FROM lr_y1_sample_metadata
    WHERE metadata_run_id = {metadataRunId:String}
  `,
    {
      metadataRunId: run.metadata_run_id,
      release: run.release,
      cohort: run.cohort,
      referenceGenome: run.reference_genome,
      sourceManifestId: run.source_manifest_id,
      sourceManifestSha256: run.source_manifest_sha256,
    }
  )
  const counts = countRows[0] || {}
  if (
    Number(counts.total) !== expected ||
    Number(counts.exact) !== expected ||
    Number(counts.unique_samples) !== expected
  )
    return null
  return String(run.metadata_run_id)
}

export const preflightY1AcceptedSources = async () => {
  snapshots = new Map()
  discoveredColumns = null
  if (!isY1PilotEnabled) return

  const columns = await loadTableColumns()
  requirePrimarySchema(columns)
  const runRows = await discoverRunRows()
  const presentationRuns = await configuredRuns(runRows)

  if (presentationRuns) {
    if (!y1PrimaryManifests) {
      throw new Error('Configured Y1 presentation routing has no checked manifest bundle')
    }
    const primaryManifests = y1PrimaryManifests
    const hgsvcForMetadata = [...presentationRuns.values()].find(
      (run) => run.cohort === 'hgsvc_hprc'
    )
    const metadataRunId = await resolveOptionalMetadataRun(columns, hgsvcForMetadata)
    const validated = await Promise.all(
      [...presentationRuns].map(async ([key, run]) => {
        const manifest = primaryManifests.get(key)
        if (!manifest || manifest.run_id !== run.run_id) {
          throw new Error(`Configured Y1 run ${run.run_id} has no exact checked manifest`)
        }
        const receipts = await requireAcceptedTaskReceipts(run, manifest)
        await requireCanonicalRows(run, receipts)
        const carrierRows = await rows(
          `
        SELECT count() AS total,
          countIf(release = 'y1' AND cohort = {cohort:String}
            AND reference_genome = 'GRCh38' AND chrom = {chrom:String}) AS exact
        FROM lr_y1_carriers WHERE run_id = {runId:String}
      `,
          { runId: run.run_id, cohort: run.cohort, chrom: run.chrom }
        )
        const total = Number(carrierRows[0]?.total || 0)
        const exact = Number(carrierRows[0]?.exact || 0)
        if (total !== receipts.carriers || exact !== receipts.carriers) {
          throw new Error(`Y1 presentation run ${run.run_id} carrier count/identity mismatch`)
        }
        const snapshot: Y1SourceSnapshot = {
          database: y1ClickhouseConfig.database,
          release: run.release,
          cohort: run.cohort as LongReadCohort,
          reference_genome: run.reference_genome,
          chrom: run.chrom,
          load_scope: run.load_scope,
          run_id: run.run_id,
          state: 'accepted_tasks',
          metadata_run_id: run.cohort === 'hgsvc_hprc' ? metadataRunId : null,
          carriers_available:
            run.cohort === 'hgsvc_hprc' && manifest.carrier_loading_status === 'available',
        }
        return [key, snapshot] as const
      })
    )
    for (const [key, snapshot] of validated) snapshots.set(key, snapshot)
  } else {
    const runs = acceptedRuns(runRows)
    await Promise.all([...runs.values()].map(([run]) => requireCanonicalRows(run)))
    await validateCarrierStructure(columns, runs)
    const metadataRunId = await resolveOptionalMetadataRun(columns, runs.get('hgsvc_hprc')?.[0])

    for (const [cohort, [run]] of runs) {
      snapshots.set(snapshotKey(cohort, run.chrom), {
        database: y1ClickhouseConfig.database,
        release: run.release,
        cohort,
        reference_genome: run.reference_genome,
        chrom: run.chrom,
        load_scope: run.load_scope,
        run_id: run.run_id,
        state: ACCEPTED_Y1_RUN_STATE,
        metadata_run_id: cohort === 'hgsvc_hprc' ? metadataRunId : null,
        carriers_available: cohort === 'hgsvc_hprc',
      })
    }
  }
  discoveredColumns = columns
}

export const getY1SourceSnapshot = async (cohort: LongReadCohort, chrom?: string | null) => {
  if (!isY1PilotEnabled) return null
  if (!snapshots) await preflightY1AcceptedSources()
  if (chrom) return snapshots!.get(snapshotKey(cohort, normalizedChrom(chrom))) || null
  return [...snapshots!.values()].find((snapshot) => snapshot.cohort === cohort) || null
}

export const resolveY1Cohort = async (
  requested?: LongReadCohort | null
): Promise<LongReadCohort> => {
  // Explicit identity is fail-closed: an unavailable AoU request stays AoU and
  // can never be silently retried against HGSVC/HPRC.
  if (requested === 'aou' || requested === 'hgsvc_hprc') return requested
  if (!isY1PilotEnabled) return 'hgsvc_hprc'
  if (!snapshots) await preflightY1AcceptedSources()
  const available = [...new Set([...snapshots!.values()].map((snapshot) => snapshot.cohort))]
  return available.length === 1 ? available[0] : 'hgsvc_hprc'
}

export const getY1AvailableCohorts = async (): Promise<LongReadCohort[]> => {
  if (!isY1PilotEnabled) return ['hgsvc_hprc']
  if (!snapshots) await preflightY1AcceptedSources()
  return [...new Set([...snapshots!.values()].map((snapshot) => snapshot.cohort))]
}

export const getY1DiscoveredTableColumns = () => discoveredColumns

export const resetY1SourceSnapshotForTests = () => {
  snapshots = null
  discoveredColumns = null
}

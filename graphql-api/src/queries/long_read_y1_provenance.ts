import { isY1Chr22MixedProvenanceEnabled, y1ClickhouseClient } from '../clickhouse'
import type { LongReadCohort } from './long_read_y1_variants'

export type Y1SourceSnapshot = {
  release: 'y1'
  cohort: LongReadCohort
  reference_genome: 'GRCh38'
  chrom: 'chr22'
  run_id: string
  activation_revision: number
  metadata_run_id: string | null
}

const expectedRunId = (cohort: LongReadCohort) => {
  const name = cohort === 'aou' ? 'LR_Y1_AOU_RUN_ID' : 'LR_Y1_HGSVC_RUN_ID'
  const value = process.env[name]
  if (!value) throw new Error(`Y1 pilot requires ${name}`)
  return value
}

const expectedMetadataRunId = () => {
  const value = process.env.LR_Y1_HGSVC_METADATA_RUN_ID
  if (!value) throw new Error('Mixed-provenance mode requires LR_Y1_HGSVC_METADATA_RUN_ID')
  return value
}

let snapshots: Map<LongReadCohort, Y1SourceSnapshot> | null = null
let snapshotExpiresAt = 0
const SNAPSHOT_TTL_MS = 30_000

const rows = async (query: string, query_params: Record<string, unknown>) => {
  const result = await y1ClickhouseClient.query({ query, query_params, format: 'JSONEachRow' })
  return (await result.json()) as any[]
}

const resolveSnapshot = async (cohort: LongReadCohort): Promise<Y1SourceSnapshot> => {
  const pointerRows = await rows(
    `SELECT argMax(run_id, revision) AS run_id, max(revision) AS activation_revision
     FROM lr_y1_active_partitions
     WHERE release = 'y1' AND cohort = {cohort:String}
       AND reference_genome = 'GRCh38' AND chrom = 'chr22'`,
    { cohort }
  )
  const runId = pointerRows[0]?.run_id
  if (!runId || runId !== expectedRunId(cohort)) {
    throw new Error(`Active ${cohort} chr22 run does not match the explicitly pinned accepted run`)
  }

  const runRows = await rows(
    `SELECT argMax(state, revision) AS state, argMax(load_scope, revision) AS load_scope,
            argMax(release, revision) AS release, argMax(cohort, revision) AS cohort,
            argMax(reference_genome, revision) AS reference_genome,
            argMax(chrom, revision) AS chrom
     FROM lr_y1_load_runs WHERE run_id = {runId:String}`,
    { runId }
  )
  const run = runRows[0] || {}
  if (
    run.state !== 'published' || run.load_scope !== 'full_chromosome' ||
    run.release !== 'y1' || run.cohort !== cohort ||
    run.reference_genome !== 'GRCh38' || run.chrom !== 'chr22'
  ) {
    throw new Error(`Active ${cohort} run is not a published full-chromosome Y1 GRCh38 chr22 run`)
  }

  let metadataRunId: string | null = null
  if (cohort === 'hgsvc_hprc') {
    const metadataPointerRows = await rows(
      `SELECT argMax(metadata_run_id, revision) AS metadata_run_id
       FROM lr_y1_active_metadata
       WHERE release = 'y1' AND cohort = 'hgsvc_hprc' AND reference_genome = 'GRCh38'`,
      {}
    )
    metadataRunId = metadataPointerRows[0]?.metadata_run_id || null
    if (metadataRunId !== expectedMetadataRunId()) {
      throw new Error('Active HGSVC metadata run does not match the explicitly pinned accepted run')
    }
    const metadataRows = await rows(
      `SELECT argMax(state, revision) AS state, argMax(output_rows, revision) AS output_rows
       FROM lr_y1_metadata_runs WHERE metadata_run_id = {metadataRunId:String}`,
      { metadataRunId }
    )
    const metadata = metadataRows[0] || {}
    if (metadata.state !== 'accepted' || Number(metadata.output_rows) !== 292) {
      throw new Error('Active HGSVC metadata is not an accepted 292-row run')
    }
    const reconciliation = await rows(
      `SELECT
         (SELECT uniqExact(sample_id) FROM lr_y1_sample_metadata
          WHERE metadata_run_id = {metadataRunId:String} AND release = 'y1'
            AND cohort = 'hgsvc_hprc' AND reference_genome = 'GRCh38') AS metadata_samples,
         (SELECT uniqExact(sample_id) FROM lr_y1_carriers
          WHERE run_id = {runId:String} AND release = 'y1' AND cohort = 'hgsvc_hprc'
            AND reference_genome = 'GRCh38' AND chrom = 'chr22') AS carrier_samples`,
      { metadataRunId, runId }
    )
    if (Number(reconciliation[0]?.metadata_samples) !== 292 || Number(reconciliation[0]?.carrier_samples) !== 292) {
      throw new Error('HGSVC metadata/carrier roster preflight did not reconcile to 292 samples')
    }
  }

  return {
    release: 'y1', cohort, reference_genome: 'GRCh38', chrom: 'chr22', run_id: runId,
    activation_revision: Number(pointerRows[0].activation_revision), metadata_run_id: metadataRunId,
  }
}

export const getY1SourceSnapshot = async (cohort: LongReadCohort) => {
  if (!isY1Chr22MixedProvenanceEnabled) {
    return {
      release: 'y1', cohort, reference_genome: 'GRCh38', chrom: 'chr22',
      run_id: expectedRunId(cohort), activation_revision: 0, metadata_run_id: null,
    } as Y1SourceSnapshot
  }
  if (!snapshots || Date.now() >= snapshotExpiresAt) {
    const [hgsvc, aou] = await Promise.all([
      resolveSnapshot('hgsvc_hprc'), resolveSnapshot('aou'),
    ])
    snapshots = new Map([['hgsvc_hprc', hgsvc], ['aou', aou]])
    snapshotExpiresAt = Date.now() + SNAPSHOT_TTL_MS
  }
  return snapshots.get(cohort)!
}

export const preflightY1AcceptedSources = async () => {
  if (!isY1Chr22MixedProvenanceEnabled) return
  snapshots = null
  await getY1SourceSnapshot('hgsvc_hprc')
}

export const resetY1SourceSnapshotForTests = () => {
  snapshots = null
  snapshotExpiresAt = 0
}

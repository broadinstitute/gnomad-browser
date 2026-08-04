import { readFileSync } from 'node:fs'
import type { Y1AncillaryModality, Y1Cohort, Y1PrimaryRunMap } from './y1_config'

export type Y1PrimaryManifestTask = {
  task_id: string
  start: number
  stop: number
}

export type Y1PrimaryManifest = {
  cohort: Y1Cohort
  chrom: string
  run_id: string
  manifest_sha256: string
  primary_load_mode: 'standard' | 'aggregate_only_no_carriers'
  carrier_loading_status: 'available' | 'unavailable_not_loaded'
  source: {
    source_uri: string
    source_generation: string
    source_checksum_algorithm: string
    source_checksum: string
    source_size_bytes: number
    source_index_uri: string
    source_index_generation: string
    source_index_checksum_algorithm: string
    source_index_checksum: string
    source_index_size_bytes: number
  }
  tasks: Y1PrimaryManifestTask[]
}

export type AncillaryContigReceipt = {
  chrom: string
  rows: number
  min_position: number
  max_position: number
}

export type Y1AncillaryReceipt = {
  schema_version: 1
  status: 'completed'
  database: string
  run_id: string
  cohort: Y1Cohort
  modality: Y1AncillaryModality
  source_format: 'presentation' | 'sample_total_completion'
  job_uuid: string | null
  receipts: {
    expected: number
    accepted: number
    failed_attempts: number
    rejects: number
  }
  reconciliation: Record<string, unknown>
}

const contigLengths: Record<string, number> = {
  chr1: 248956422,
  chr2: 242193529,
  chr3: 198295559,
  chr4: 190214555,
  chr5: 181538259,
  chr6: 170805979,
  chr7: 159345973,
  chr8: 145138636,
  chr9: 138394717,
  chr10: 133797422,
  chr11: 135086622,
  chr12: 133275309,
  chr13: 114364328,
  chr14: 107043718,
  chr15: 101991189,
  chr16: 90338345,
  chr17: 83257441,
  chr18: 80373285,
  chr19: 58617616,
  chr20: 64444167,
  chr21: 46709983,
  chr22: 50818468,
  chrX: 156040895,
  chrY: 57227415,
}

export const canonicalY1ContigLengths = new Map(Object.entries(contigLengths))
export const fullGrch38PositionCount = [...canonicalY1ContigLengths.values()].reduce(
  (total, length) => total + length,
  0
)

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (value: Record<string, unknown>, keys: string[], label: string) => {
  const unknown = Object.keys(value).filter((key) => !keys.includes(key))
  const missing = keys.filter((key) => !(key in value))
  if (unknown.length || missing.length) {
    throw new Error(
      `${label} has invalid keys (missing=${missing.join(',') || 'none'}, unknown=${
        unknown.join(',') || 'none'
      })`
    )
  }
}

const string = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label} must be a nonempty string`)
  return value
}

const integer = (value: unknown, label: string, minimum = 0) => {
  if (!Number.isSafeInteger(value) || Number(value) < minimum) {
    throw new Error(`${label} must be an integer >= ${minimum}`)
  }
  return Number(value)
}

const readJson = (path: string, label: string): unknown => {
  if (!path.trim()) throw new Error(`${label} path must be configured`)
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error: any) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`)
  }
}

const parseSource = (value: unknown, label: string): Y1PrimaryManifest['source'] => {
  const source = object(value, label)
  const keys = [
    'source_uri',
    'source_generation',
    'source_checksum_algorithm',
    'source_checksum',
    'source_size_bytes',
    'source_index_uri',
    'source_index_generation',
    'source_index_checksum_algorithm',
    'source_index_checksum',
    'source_index_size_bytes',
  ]
  exactKeys(source, keys, label)
  return {
    source_uri: string(source.source_uri, `${label}.source_uri`),
    source_generation: string(source.source_generation, `${label}.source_generation`),
    source_checksum_algorithm: string(
      source.source_checksum_algorithm,
      `${label}.source_checksum_algorithm`
    ),
    source_checksum: string(source.source_checksum, `${label}.source_checksum`),
    source_size_bytes: integer(source.source_size_bytes, `${label}.source_size_bytes`, 1),
    source_index_uri: string(source.source_index_uri, `${label}.source_index_uri`),
    source_index_generation: string(
      source.source_index_generation,
      `${label}.source_index_generation`
    ),
    source_index_checksum_algorithm: string(
      source.source_index_checksum_algorithm,
      `${label}.source_index_checksum_algorithm`
    ),
    source_index_checksum: string(source.source_index_checksum, `${label}.source_index_checksum`),
    source_index_size_bytes: integer(
      source.source_index_size_bytes,
      `${label}.source_index_size_bytes`,
      1
    ),
  }
}

const parsePrimaryManifest = (value: unknown, index: number): Y1PrimaryManifest => {
  const label = `primary manifest entry ${index}`
  const entry = object(value, label)
  exactKeys(
    entry,
    [
      'cohort',
      'chrom',
      'run_id',
      'manifest_sha256',
      'source',
      'tasks',
      ...(entry.primary_load_mode === undefined && entry.carrier_loading_status === undefined
        ? []
        : ['primary_load_mode', 'carrier_loading_status']),
    ],
    label
  )
  const aggregateOnly =
    entry.primary_load_mode === 'aggregate_only_no_carriers' &&
    entry.carrier_loading_status === 'unavailable_not_loaded'
  if (
    !aggregateOnly &&
    (entry.primary_load_mode !== undefined || entry.carrier_loading_status !== undefined)
  ) {
    throw new Error(`${label} has invalid aggregate-only carrier availability fields`)
  }
  const cohort = string(entry.cohort, `${label}.cohort`)
  if (cohort !== 'hgsvc_hprc' && cohort !== 'aou') throw new Error(`${label} has invalid cohort`)
  const chrom = string(entry.chrom, `${label}.chrom`)
  const contigLength = canonicalY1ContigLengths.get(chrom)
  if (!contigLength) throw new Error(`${label} has noncanonical chromosome ${chrom}`)
  const hash = string(entry.manifest_sha256, `${label}.manifest_sha256`)
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`${label} has invalid manifest SHA-256`)
  if (!Array.isArray(entry.tasks) || !entry.tasks.length)
    throw new Error(`${label}.tasks must be nonempty`)
  let previousStop = 0
  const taskIds = new Set<string>()
  const tasks = entry.tasks.map((rawTask, taskIndex) => {
    const taskLabel = `${label}.tasks[${taskIndex}]`
    const task = object(rawTask, taskLabel)
    exactKeys(task, ['task_id', 'start', 'stop'], taskLabel)
    const taskId = string(task.task_id, `${taskLabel}.task_id`)
    const start = integer(task.start, `${taskLabel}.start`, 1)
    const stop = integer(task.stop, `${taskLabel}.stop`, 1)
    if (taskIds.has(taskId)) throw new Error(`${label} duplicates task ID ${taskId}`)
    if (start !== previousStop + 1 || stop < start || stop > contigLength) {
      throw new Error(`${label} tasks do not cover ${chrom} gaplessly without overlap`)
    }
    taskIds.add(taskId)
    previousStop = stop
    return { task_id: taskId, start, stop }
  })
  if (previousStop !== contigLength) {
    throw new Error(`${label} tasks do not cover ${chrom}:1-${contigLength}`)
  }
  const source = parseSource(entry.source, `${label}.source`)
  const expectedSourceUri = `gs://gnomad-lr-data/y1/sources/${cohort}/vcfs/gnomAD_LR_Y1.${cohort}.${chrom}.vcf.gz`
  if (
    source.source_uri !== expectedSourceUri ||
    source.source_index_uri !== `${expectedSourceUri}.tbi` ||
    source.source_checksum_algorithm !== 'md5_base64' ||
    source.source_index_checksum_algorithm !== 'md5_base64' ||
    !/^[1-9][0-9]*$/.test(source.source_generation) ||
    !/^[1-9][0-9]*$/.test(source.source_index_generation)
  ) {
    throw new Error(`${label} has invalid immutable canonical source identity`)
  }
  return {
    cohort,
    chrom,
    run_id: string(entry.run_id, `${label}.run_id`),
    manifest_sha256: hash,
    primary_load_mode: aggregateOnly ? 'aggregate_only_no_carriers' : 'standard',
    carrier_loading_status: aggregateOnly ? 'unavailable_not_loaded' : 'available',
    source,
    tasks,
  }
}

export const resolveY1PrimaryManifests = (
  runMap: Y1PrimaryRunMap | null,
  env: NodeJS.ProcessEnv = process.env
): Map<string, Y1PrimaryManifest> | null => {
  const path = (env.LR_Y1_PRIMARY_MANIFEST_PATH || '').trim()
  if (!runMap) {
    if (path) throw new Error('LR_Y1_PRIMARY_MANIFEST_PATH requires LR_Y1_RUN_MAP')
    return null
  }
  const document = object(
    readJson(path, 'LR Y1 primary manifest bundle'),
    'primary manifest bundle'
  )
  exactKeys(document, ['schema_version', 'entries'], 'primary manifest bundle')
  if (document.schema_version !== 1 || !Array.isArray(document.entries)) {
    throw new Error('primary manifest bundle must have schema_version 1 and entries array')
  }
  const manifests = new Map<string, Y1PrimaryManifest>()
  for (const [index, rawEntry] of document.entries.entries()) {
    const manifest = parsePrimaryManifest(rawEntry, index)
    const key = `${manifest.cohort}\u0000${manifest.chrom}`
    if (manifests.has(key))
      throw new Error(`primary manifest bundle duplicates ${manifest.cohort}/${manifest.chrom}`)
    manifests.set(key, manifest)
  }
  let configured = 0
  for (const [cohort, chromRuns] of runMap) {
    for (const [chrom, runId] of chromRuns) {
      configured += 1
      const manifest = manifests.get(`${cohort}\u0000${chrom}`)
      if (!manifest || manifest.run_id !== runId) {
        throw new Error(
          `primary manifest bundle does not exactly match configured run ${cohort}/${chrom}/${runId}`
        )
      }
    }
  }
  if (manifests.size !== configured) {
    throw new Error('primary manifest bundle contains routes absent from LR_Y1_RUN_MAP')
  }
  return manifests
}

const parseContigs = (
  value: unknown,
  label: string,
  coordinateKeys: ['min_position', 'max_position', 'unique_positions'] | ['min_start', 'max_end']
) => {
  if (!Array.isArray(value) || value.length !== canonicalY1ContigLengths.size) {
    throw new Error(`${label} must contain exactly 24 canonical contigs`)
  }
  const seen = new Set<string>()
  return value.map((raw, index) => {
    const row = object(raw, `${label}[${index}]`)
    exactKeys(row, ['chrom', 'rows', ...coordinateKeys], `${label}[${index}]`)
    const chrom = string(row.chrom, `${label}[${index}].chrom`)
    if (!canonicalY1ContigLengths.has(chrom) || seen.has(chrom)) {
      throw new Error(`${label} contains duplicate or noncanonical chromosome ${chrom}`)
    }
    seen.add(chrom)
    return {
      chrom,
      rows: integer(row.rows, `${label}[${index}].rows`, 1),
      ...Object.fromEntries(
        coordinateKeys.map((key) => [
          key,
          integer(row[key], `${label}[${index}].${key}`, key.startsWith('min_') ? 0 : 1),
        ])
      ),
    }
  })
}

const parseMethylationContigs = (value: unknown, label: string) => {
  if (!Array.isArray(value) || value.length !== canonicalY1ContigLengths.size) {
    throw new Error(`${label} must contain exactly 24 canonical contigs`)
  }
  const seen = new Set<string>()
  return value.map((raw, index) => {
    const row = object(raw, `${label}[${index}]`)
    exactKeys(row, ['chrom', 'rows'], `${label}[${index}]`)
    const chrom = string(row.chrom, `${label}[${index}].chrom`)
    if (!canonicalY1ContigLengths.has(chrom) || seen.has(chrom)) {
      throw new Error(`${label} contains duplicate or noncanonical chromosome ${chrom}`)
    }
    seen.add(chrom)
    return { chrom, rows: integer(row.rows, `${label}[${index}].rows`, 1) }
  })
}

export const readY1AncillaryReceipt = (
  path: string,
  expected: { database: string; run_id: string; cohort: Y1Cohort; modality: Y1AncillaryModality }
): Y1AncillaryReceipt => {
  const label = `ancillary receipt ${expected.modality}/${expected.cohort}`
  const receipt = object(readJson(path, label), label)
  if (expected.modality === 'methylation' && receipt.status === 'validated_success') {
    exactKeys(
      receipt,
      [
        'status',
        'completed_at',
        'database',
        'writer',
        'writer_remained_fenced_and_revoked',
        'jobs',
        'tasks',
        'accepted',
        'failed_attempts',
        'receipt_items_processed',
        'detail_rows',
        'summary_rows',
        'summary_num_samples_sum',
        'summary_keys_unique',
        'availability_rows',
        'availability_complete',
        'availability_partial',
        'availability_source_marked_skip',
        'availability_no_source',
        'unavailable_detail_rows',
        'cohort_rows',
        'planning_envelope_used',
        'authoritative_count_source',
      ],
      label
    )
    const tasks = integer(receipt.tasks, `${label}.tasks`, 1)
    const accepted = integer(receipt.accepted, `${label}.accepted`, 1)
    const detailRows = integer(receipt.detail_rows, `${label}.detail_rows`, 1)
    const summaryRows = integer(receipt.summary_rows, `${label}.summary_rows`, 1)
    const rosterRows = integer(receipt.availability_rows, `${label}.availability_rows`, 1)
    const complete = integer(receipt.availability_complete, `${label}.availability_complete`)
    const partial = integer(receipt.availability_partial, `${label}.availability_partial`)
    const sourceSkipped = integer(
      receipt.availability_source_marked_skip,
      `${label}.availability_source_marked_skip`
    )
    const noSource = integer(receipt.availability_no_source, `${label}.availability_no_source`)
    if (
      receipt.database !== expected.database ||
      receipt.writer_remained_fenced_and_revoked !== true ||
      receipt.summary_keys_unique !== true ||
      tasks !== accepted ||
      integer(receipt.failed_attempts, `${label}.failed_attempts`) !== 0 ||
      integer(receipt.receipt_items_processed, `${label}.receipt_items_processed`, 1) !==
        detailRows ||
      integer(receipt.summary_num_samples_sum, `${label}.summary_num_samples_sum`, 1) !==
        detailRows ||
      complete + partial + sourceSkipped + noSource !== rosterRows ||
      integer(receipt.unavailable_detail_rows, `${label}.unavailable_detail_rows`) !== 0 ||
      integer(receipt.cohort_rows, `${label}.cohort_rows`) !== 2
    ) {
      throw new Error(`${label} does not declare a complete fenced sample-total product`)
    }
    return {
      schema_version: 1,
      status: 'completed',
      database: expected.database,
      run_id: expected.run_id,
      cohort: expected.cohort,
      modality: expected.modality,
      source_format: 'sample_total_completion',
      job_uuid: null,
      receipts: { expected: tasks, accepted, failed_attempts: 0, rejects: 0 },
      reconciliation: {
        roster_rows: rosterRows,
        included_samples: complete + partial,
        detail_rows: detailRows,
        summary_rows: summaryRows,
        availability_rows: rosterRows,
        availability_complete: complete,
        availability_partial: partial,
        availability_source_marked_skip: sourceSkipped,
        availability_no_source: noSource,
      },
    }
  }
  exactKeys(
    receipt,
    [
      'schema_version',
      'status',
      'database',
      'run_id',
      'cohort',
      'modality',
      'job_uuid',
      'receipts',
      'reconciliation',
    ],
    label
  )
  if (receipt.schema_version !== 1 || receipt.status !== 'completed') {
    throw new Error(`${label} is not a completed schema-version-1 receipt`)
  }
  for (const key of ['database', 'run_id', 'cohort', 'modality'] as const) {
    if (receipt[key] !== expected[key]) throw new Error(`${label} ${key} does not match its route`)
  }
  const jobUuid = string(receipt.job_uuid, `${label}.job_uuid`)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobUuid)) {
    throw new Error(`${label}.job_uuid must be a UUID`)
  }
  const receiptCounts = object(receipt.receipts, `${label}.receipts`)
  exactKeys(
    receiptCounts,
    ['expected', 'accepted', 'failed_attempts', 'rejects'],
    `${label}.receipts`
  )
  const receipts = {
    expected: integer(receiptCounts.expected, `${label}.receipts.expected`, 1),
    accepted: integer(receiptCounts.accepted, `${label}.receipts.accepted`, 1),
    failed_attempts: integer(receiptCounts.failed_attempts, `${label}.receipts.failed_attempts`),
    rejects: integer(receiptCounts.rejects, `${label}.receipts.rejects`),
  }
  if (
    receipts.accepted !== receipts.expected ||
    receipts.failed_attempts !== 0 ||
    receipts.rejects !== 0
  ) {
    throw new Error(`${label} does not declare complete zero-failure receipt acceptance`)
  }
  const reconciliation = object(receipt.reconciliation, `${label}.reconciliation`)
  if (expected.modality === 'coverage') {
    exactKeys(reconciliation, ['canonical_rows', 'contigs'], `${label}.reconciliation`)
    if (
      integer(reconciliation.canonical_rows, `${label}.canonical_rows`, 1) !==
      fullGrch38PositionCount
    ) {
      throw new Error(`${label} does not declare the exact full-GRCh38 positional count`)
    }
    const contigs: any[] = parseContigs(reconciliation.contigs, `${label}.contigs`, [
      'min_position',
      'max_position',
      'unique_positions',
    ])
    for (const contig of contigs) {
      const length = canonicalY1ContigLengths.get(contig.chrom)!
      if (
        contig.rows !== length ||
        contig.unique_positions !== length ||
        contig.min_position !== 1 ||
        contig.max_position !== length
      ) {
        throw new Error(`${label} has incomplete positional bounds for ${contig.chrom}`)
      }
    }
    reconciliation.contigs = contigs
  } else if (expected.modality === 'str_histogram') {
    exactKeys(
      reconciliation,
      [
        'mapping_rows',
        'available_rows',
        'unavailable_rows',
        'ambiguous_rows',
        'canonical_rows',
        'key_mismatches',
        'contigs',
      ],
      `${label}.reconciliation`
    )
    const mapping = integer(reconciliation.mapping_rows, `${label}.mapping_rows`, 1)
    const available = integer(reconciliation.available_rows, `${label}.available_rows`, 1)
    const unavailable = integer(reconciliation.unavailable_rows, `${label}.unavailable_rows`)
    const ambiguous = integer(reconciliation.ambiguous_rows, `${label}.ambiguous_rows`)
    const canonical = integer(reconciliation.canonical_rows, `${label}.canonical_rows`, 1)
    const keyMismatches = integer(reconciliation.key_mismatches, `${label}.key_mismatches`)
    if (
      mapping !== available + unavailable + ambiguous ||
      canonical !== available ||
      keyMismatches !== 0
    ) {
      throw new Error(`${label} has inconsistent STR mapping/canonical counts`)
    }
    reconciliation.contigs = parseContigs(reconciliation.contigs, `${label}.contigs`, [
      'min_start',
      'max_end',
    ])
  } else {
    exactKeys(
      reconciliation,
      [
        'roster_rows',
        'included_samples',
        'detail_rows',
        'summary_rows',
        'availability_rows',
        'detail_contigs',
        'summary_contigs',
        'samples',
      ],
      `${label}.reconciliation`
    )
    const rosterRows = integer(reconciliation.roster_rows, `${label}.roster_rows`, 1)
    const includedSamples = integer(reconciliation.included_samples, `${label}.included_samples`, 1)
    const detailRows = integer(reconciliation.detail_rows, `${label}.detail_rows`, 1)
    integer(reconciliation.summary_rows, `${label}.summary_rows`, 1)
    if (integer(reconciliation.availability_rows, `${label}.availability_rows`, 1) !== rosterRows) {
      throw new Error(`${label} availability count does not match roster`)
    }
    reconciliation.detail_contigs = parseMethylationContigs(
      reconciliation.detail_contigs,
      `${label}.detail_contigs`
    )
    reconciliation.summary_contigs = parseMethylationContigs(
      reconciliation.summary_contigs,
      `${label}.summary_contigs`
    )
    if (!Array.isArray(reconciliation.samples) || reconciliation.samples.length !== rosterRows) {
      throw new Error(`${label}.samples must exactly match the roster count`)
    }
    const sampleIds = new Set<string>()
    let included = 0
    reconciliation.samples = reconciliation.samples.map((raw, index) => {
      const row = object(raw, `${label}.samples[${index}]`)
      exactKeys(
        row,
        ['sample_id', 'included', 'availability', 'detail_rows', 'indexed_contigs'],
        `${label}.samples[${index}]`
      )
      const sampleId = string(row.sample_id, `${label}.samples[${index}].sample_id`)
      if (sampleIds.has(sampleId)) throw new Error(`${label} duplicates sample ${sampleId}`)
      sampleIds.add(sampleId)
      if (typeof row.included !== 'boolean')
        throw new Error(`${label} sample included must be boolean`)
      if (row.included) included += 1
      if (!Array.isArray(row.indexed_contigs))
        throw new Error(`${label} sample indexed_contigs must be an array`)
      const indexedContigs = row.indexed_contigs.map((chrom, chromIndex) => {
        const value = string(chrom, `${label}.samples[${index}].indexed_contigs[${chromIndex}]`)
        if (!canonicalY1ContigLengths.has(value))
          throw new Error(`${label} sample has noncanonical contig ${value}`)
        return value
      })
      if (new Set(indexedContigs).size !== indexedContigs.length)
        throw new Error(`${label} sample duplicates indexed contigs`)
      return {
        sample_id: sampleId,
        included: row.included,
        availability: string(row.availability, `${label}.samples[${index}].availability`),
        detail_rows: integer(row.detail_rows, `${label}.samples[${index}].detail_rows`),
        indexed_contigs: indexedContigs.sort(),
      }
    })
    if (included !== includedSamples)
      throw new Error(`${label} included sample count is inconsistent`)
    const sampleDetailRows = (reconciliation.samples as any[]).reduce(
      (total, sample) => total + sample.detail_rows,
      0
    )
    if (sampleDetailRows !== detailRows) {
      throw new Error(`${label} per-sample detail rows do not equal the global detail count`)
    }
  }
  return {
    schema_version: 1,
    status: 'completed',
    database: expected.database,
    run_id: expected.run_id,
    cohort: expected.cohort,
    modality: expected.modality,
    source_format: 'presentation',
    job_uuid: jobUuid,
    receipts,
    reconciliation,
  }
}

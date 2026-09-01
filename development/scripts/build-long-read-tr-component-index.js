#!/usr/bin/env node
/* eslint-disable no-restricted-syntax, no-continue */

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline')
const {
  normalizeCatalogRows,
  parseCanonicalId,
  sha256Json,
} = require('./build-long-read-tr-reference-crosswalk')

const COHORTS = ['aou', 'hgsvc_hprc']
const MAX_CANDIDATES = 12
const MAX_SOURCE_RECORDS_PER_CANDIDATE = 8

const parseArgs = (argv) => {
  const args = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key || !key.startsWith('--') || value == null) {
      throw new Error(`Invalid argument ${key || ''}`)
    }
    args[key.slice(2)] = value
  }
  for (const required of ['catalog', 'manifests', 'database']) {
    if (!args[required]) throw new Error(`Missing --${required}`)
  }
  if (!args['emit-query']) {
    for (const required of ['input', 'query-file', 'out']) {
      if (!args[required]) throw new Error(`Missing --${required}`)
    }
  }
  return args
}

const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'))
const normalizedChrom = (value) => String(value).replace(/^chr/i, '').toUpperCase()
const sha256Bytes = (value) => crypto.createHash('sha256').update(value).digest('hex')
const canonicalJsonLine = (value) => `${JSON.stringify(value)}\n`

const catalogRowsFromInput = (input) => {
  if (Array.isArray(input.rows) && input.rows.every((row) => row && row.short)) {
    return normalizeCatalogRows(input.rows.map((row) => row.short))
  }
  if (!Array.isArray(input.rows)) throw new Error('Catalog input has no rows')
  return normalizeCatalogRows(input.rows)
}

const catalogRowKey = (row) => {
  const tuple = {
    id: row.id,
    region: row.main_reference_region,
    motif: row.reference_repeat_unit,
  }
  return `gnomad-short-snapshot:${row.id}:${sha256Json(tuple).slice(0, 16)}`
}

const parseTrid = (trid) => {
  const raw = String(trid || '')
  if (!raw || /\s/.test(raw)) throw new Error(`Invalid empty/whitespace TRID ${JSON.stringify(raw)}`)
  const canonicalId = raw.replaceAll(',', '+')
  const components = parseCanonicalId(canonicalId).map((component) => ({
    chrom: normalizedChrom(component.chrom),
    start0: component.start0,
    end0: component.end0,
    motif: String(component.motif),
  }))
  if (
    !components.length ||
    components.some(
      (component) =>
        !Number.isSafeInteger(component.start0) ||
        !Number.isSafeInteger(component.end0) ||
        component.start0 < 0 ||
        component.end0 <= component.start0 ||
        !component.motif ||
        component.motif !== component.motif.toUpperCase()
    )
  ) {
    throw new Error(`Invalid canonical ordered components in TRID ${raw}`)
  }
  if (new Set(components.map((component) => component.chrom)).size !== 1) {
    throw new Error(`Cross-chromosome TRID is not admitted: ${raw}`)
  }
  const normalizedCanonicalId = components
    .map(
      (component) =>
        `${component.chrom}-${component.start0}-${component.end0}-${component.motif}`
    )
    .join('+')
  return { canonicalId: normalizedCanonicalId, components }
}

const reverseComplement = (motif) => {
  const complements = { A: 'T', C: 'G', G: 'C', T: 'A' }
  if (![...motif].every((base) => complements[base])) return null
  return [...motif]
    .reverse()
    .map((base) => complements[base])
    .join('')
}

const isRotation = (left, right) =>
  left.length === right.length && left.length > 0 && `${left}${left}`.includes(right)

const motifRelation = (catalogMotif, componentMotif) => {
  if (catalogMotif === componentMotif) return 'EXACT'
  if (isRotation(catalogMotif, componentMotif)) return 'CYCLIC_ROTATION'
  const rc = reverseComplement(catalogMotif)
  if (rc && isRotation(rc, componentMotif)) return 'REVERSE_COMPLEMENT_ROTATION'
  return 'DIFFERENT'
}

const exactTupleKey = (chrom, start0, end0, motif) =>
  `${normalizedChrom(chrom)}\u0000${start0}\u0000${end0}\u0000${motif}`

const sourceKey = (cohort, chrom) => `${cohort}\u0000chr${normalizedChrom(chrom)}`

const validateManifestBundle = (bundle) => {
  if (!Array.isArray(bundle.entries)) throw new Error('Manifest bundle has no entries')
  const expected = new Map()
  for (const entry of bundle.entries) {
    if (!COHORTS.includes(entry.cohort)) continue
    const key = sourceKey(entry.cohort, entry.chrom)
    if (expected.has(key)) throw new Error(`Duplicate manifest source ${key}`)
    if (!entry.run_id) throw new Error(`Manifest source ${key} has no run_id`)
    expected.set(key, {
      cohort: entry.cohort,
      chrom: `chr${normalizedChrom(entry.chrom)}`,
      run_id: entry.run_id,
    })
  }
  if (expected.size !== 48) {
    throw new Error(`Expected 48 manifest-bound sources, found ${expected.size}`)
  }
  return expected
}

const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`
const sqlIdentifier = (value) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier ${value}`)
  return `\`${value}\``
}

const buildExtractionQuery = (database, expectedSources) => {
  const admitted = [...expectedSources.values()]
    .sort(
      (left, right) =>
        left.cohort.localeCompare(right.cohort) ||
        left.chrom.localeCompare(right.chrom) ||
        left.run_id.localeCompare(right.run_id)
    )
    .map(
      (source) =>
        `(cohort = ${sqlString(source.cohort)} AND chrom = ${sqlString(
          source.chrom
        )} AND run_id = ${sqlString(source.run_id)})`
    )
    .join('\n    OR ')
  const source = `${sqlIdentifier(database)}.lr_y1_summaries`
  return `/* Complete admitted TR component inventory. Read-only. Generated from the release manifest. */\nSELECT\n  sort_group, row_type, cohort, run_id, chrom, position, source_record_id, trid,\n  expected_source_records, expected_ordered_components\nFROM (\n  SELECT\n    toUInt8(0) AS sort_group, 'DATA' AS row_type, cohort, run_id, chrom, position,\n    source_variant_id AS source_record_id,\n    JSONExtractString(source_info_json, 'TRID') AS trid,\n    toUInt64(0) AS expected_source_records,\n    toUInt64(0) AS expected_ordered_components\n  FROM ${source}\n  PREWHERE allele_type = 'trv'\n  WHERE (${admitted})\n  UNION ALL\n  SELECT\n    toUInt8(1) AS sort_group, 'COMPLETE' AS row_type, '' AS cohort, '' AS run_id,\n    '' AS chrom, toUInt64(0) AS position, '' AS source_record_id, '' AS trid,\n    expected_source_records, expected_ordered_components\n  FROM (\n    SELECT\n      count() AS expected_source_records,\n      sum(length(splitByChar(',', replaceAll(JSONExtractString(source_info_json, 'TRID'), '+', ',')))) AS expected_ordered_components\n    FROM ${source}\n    PREWHERE allele_type = 'trv'\n    WHERE (${admitted})\n  )\n)\nORDER BY sort_group, cohort, trid, source_record_id, run_id, chrom, position\nFORMAT JSONEachRow\n`
}

const createCandidateAccumulator = (candidate) => ({
  ...candidate,
  sourceRecordCount: 0,
  sourceRecordHash: crypto.createHash('sha256'),
  sourceRecords: [],
})

const addSourceRecord = (accumulator, sourceRecord) => {
  accumulator.sourceRecordCount += 1
  accumulator.sourceRecordHash.update(canonicalJsonLine(sourceRecord))
  if (accumulator.sourceRecords.length < MAX_SOURCE_RECORDS_PER_CANDIDATE) {
    accumulator.sourceRecords.push(sourceRecord)
  }
}

const finishCandidate = (accumulator) => ({
  canonical_id: accumulator.canonical_id,
  ordered_component_index: accumulator.ordered_component_index,
  ordered_component: accumulator.ordered_component,
  motif_relation: accumulator.motif_relation,
  source_record_count: accumulator.sourceRecordCount,
  source_record_membership_sha256: accumulator.sourceRecordHash.digest('hex'),
  source_records: accumulator.sourceRecords,
  source_records_truncated: accumulator.sourceRecordCount > accumulator.sourceRecords.length,
})

const initializeReconciliation = (catalogRows) => {
  const byExactTuple = new Map()
  const byChrom = new Map()
  const results = new Map()
  for (const row of catalogRows) {
    const rowKey = catalogRowKey(row)
    const catalog = {
      rowKey,
      id: row.id,
      chrom: normalizedChrom(row.main_reference_region.chrom),
      start0: Number(row.main_reference_region.start),
      end0: Number(row.main_reference_region.stop),
      motif: row.reference_repeat_unit,
    }
    const tupleKey = exactTupleKey(catalog.chrom, catalog.start0, catalog.end0, catalog.motif)
    const exactRows = byExactTuple.get(tupleKey) || []
    exactRows.push(catalog)
    byExactTuple.set(tupleKey, exactRows)
    const chromRows = byChrom.get(catalog.chrom) || []
    chromRows.push(catalog)
    byChrom.set(catalog.chrom, chromRows)
    results.set(rowKey, Object.fromEntries(COHORTS.map((cohort) => [cohort, {
      exact: new Map(),
      coordinate: new Map(),
      orientation: new Map(),
      motif: new Map(),
    }])))
  }
  return { byExactTuple, byChrom, results }
}

const candidateKey = (canonicalId, componentIndex) => `${canonicalId}\u0000${componentIndex}`

const addCandidate = (bucket, base, sourceRecord) => {
  const key = candidateKey(base.canonical_id, base.ordered_component_index)
  let accumulator = bucket.get(key)
  if (!accumulator) {
    accumulator = createCandidateAccumulator(base)
    bucket.set(key, accumulator)
  }
  addSourceRecord(accumulator, sourceRecord)
}

const reconcileSourceRow = (state, row) => {
  row.components.forEach((component, componentIndex) => {
    const sourceRecord = {
      cohort: row.cohort,
      chrom: row.chrom,
      run_id: row.run_id,
      source_record_id: row.source_record_id,
      position: row.position,
    }
    const base = {
      canonical_id: row.canonical_id,
      ordered_component_index: componentIndex,
      ordered_component: component,
    }
    const exactRows = state.byExactTuple.get(
      exactTupleKey(component.chrom, component.start0, component.end0, component.motif)
    ) || []
    for (const catalog of exactRows) {
      addCandidate(state.results.get(catalog.rowKey)[row.cohort].exact, {
        ...base,
        motif_relation: 'EXACT',
      }, sourceRecord)
    }
    for (const catalog of state.byChrom.get(component.chrom) || []) {
      if (
        catalog.start0 === component.start0 &&
        catalog.end0 === component.end0 &&
        catalog.motif === component.motif
      ) continue
      const result = state.results.get(catalog.rowKey)[row.cohort]
      const relation = motifRelation(catalog.motif, component.motif)
      if (catalog.start0 === component.start0 && catalog.end0 === component.end0) {
        addCandidate(
          relation === 'DIFFERENT' ? result.motif : result.orientation,
          { ...base, motif_relation: relation },
          sourceRecord
        )
      } else if (component.start0 < catalog.end0 && component.end0 > catalog.start0) {
        addCandidate(result.coordinate, { ...base, motif_relation: relation }, sourceRecord)
      }
    }
  })
}

const boundedCandidates = (bucket) => {
  const candidates = [...bucket.values()]
    .sort(
      (left, right) =>
        left.canonical_id.localeCompare(right.canonical_id) ||
        left.ordered_component_index - right.ordered_component_index
    )
    .map(finishCandidate)
  return {
    candidates: candidates.slice(0, MAX_CANDIDATES),
    candidate_identity_count: candidates.length,
    candidates_truncated: candidates.length > MAX_CANDIDATES,
    candidate_identity_sha256: sha256Json(
      candidates.map((candidate) => [candidate.canonical_id, candidate.ordered_component_index])
    ),
  }
}

const finishReconciliation = (catalogRows, state) =>
  catalogRows.map((row) => {
    const rowKey = catalogRowKey(row)
    const cohorts = {}
    for (const cohort of COHORTS) {
      const result = state.results.get(rowKey)[cohort]
      const exact = boundedCandidates(result.exact)
      const coordinate = boundedCandidates(result.coordinate)
      const orientation = boundedCandidates(result.orientation)
      const motif = boundedCandidates(result.motif)
      let status
      let reasonCode
      let selected
      if (exact.candidate_identity_count === 1) {
        status = 'EXACT_UNIQUE'
        reasonCode = null
        selected = exact
      } else if (exact.candidate_identity_count > 1) {
        status = 'AMBIGUOUS'
        reasonCode = 'MULTIPLE_EXACT_ORDERED_COMPONENT_IDENTITIES'
        selected = exact
      } else if (coordinate.candidate_identity_count) {
        status = 'COORDINATE_MISMATCH'
        reasonCode = 'OVERLAPPING_COMPONENT_WITH_DIFFERENT_BOUNDS'
        selected = coordinate
      } else if (orientation.candidate_identity_count) {
        status = 'ORIENTATION_DIAGNOSTIC'
        reasonCode = 'EQUAL_BOUNDS_ROTATION_OR_REVERSE_COMPLEMENT'
        selected = orientation
      } else if (motif.candidate_identity_count) {
        status = 'MOTIF_MISMATCH'
        reasonCode = 'EQUAL_BOUNDS_DIFFERENT_MOTIF'
        selected = motif
      } else {
        status = 'SOURCE_ABSENT'
        reasonCode = 'NO_EXACT_OR_OVERLAPPING_ADMITTED_COMPONENT'
        selected = boundedCandidates(new Map())
      }
      let proofText = `${selected.candidate_identity_count} diagnostic ordered component identity/identities are present in the complete admitted index.`
      if (status === 'EXACT_UNIQUE') {
        proofText = 'One exact ordered component identity is present in the complete admitted index.'
      } else if (status === 'SOURCE_ABSENT') {
        proofText = 'No exact or overlapping component is present in the complete admitted index.'
      }
      cohorts[cohort] = {
        status,
        reason_code: reasonCode,
        proof_text: proofText,
        ...selected,
      }
    }
    return { row_key: rowKey, cohorts }
  })

const normalizeInputRow = (input, expectedSources) => {
  const cohort = String(input.cohort || '')
  const chrom = `chr${normalizedChrom(input.chrom)}`
  const runId = String(input.run_id || '')
  const sourceRecordId = String(input.source_record_id || input.source_variant_id || '')
  const position = Number(input.position)
  if (!COHORTS.includes(cohort)) throw new Error(`Unexpected cohort ${cohort}`)
  const expected = expectedSources.get(sourceKey(cohort, chrom))
  if (!expected) throw new Error(`Input row is outside manifest source ${cohort}/${chrom}`)
  if (expected.run_id !== runId) {
    throw new Error(`Stale/unexpected run for ${cohort}/${chrom}: ${runId}`)
  }
  if (!sourceRecordId || !Number.isSafeInteger(position) || position < 0) {
    throw new Error(`Invalid source record identity for ${cohort}/${chrom}`)
  }
  const parsed = parseTrid(input.trid)
  if (normalizedChrom(chrom) !== parsed.components[0].chrom) {
    throw new Error(`TRID chromosome differs from source row ${cohort}/${sourceRecordId}`)
  }
  return {
    cohort,
    run_id: runId,
    chrom,
    position,
    source_record_id: sourceRecordId,
    canonical_id: parsed.canonicalId,
    components: parsed.components,
  }
}

const sourceReceiptTemplate = (source) => ({
  ...source,
  source_record_count: 0,
  canonical_locus_count: 0,
  ordered_component_count: 0,
})

const buildIndex = async ({ inputStream, catalogRows, expectedSources, database, queryBytes }) => {
  const reconciliation = initializeReconciliation(catalogRows)
  const inventoryHash = crypto.createHash('sha256')
  const sources = new Map(
    [...expectedSources].map(([key, source]) => [key, sourceReceiptTemplate(source)])
  )
  let sourceRecordCount = 0
  let canonicalLocusCount = 0
  let orderedComponentCount = 0
  let previousSortKey = null
  let previousLocusKey = null
  let completionMarker = null
  const lines = readline.createInterface({ input: inputStream, crlfDelay: Infinity })
  for await (const line of lines) {
    if (!line.trim()) continue
    let parsedLine
    try {
      parsedLine = JSON.parse(line)
    } catch {
      throw new Error('Component inventory input contains invalid JSONEachRow')
    }
    if (parsedLine.row_type === 'COMPLETE') {
      if (completionMarker) throw new Error('Component inventory has multiple completion markers')
      completionMarker = {
        sourceRecordCount: Number(parsedLine.expected_source_records),
        orderedComponentCount: Number(parsedLine.expected_ordered_components),
      }
      continue
    }
    if (parsedLine.row_type !== 'DATA' || completionMarker) {
      throw new Error('Component inventory has invalid data after/before its completion marker')
    }
    const row = normalizeInputRow(parsedLine, expectedSources)
    const sortKey = [
      row.cohort,
      row.canonical_id,
      row.source_record_id,
      row.run_id,
      row.chrom,
      String(row.position).padStart(12, '0'),
    ].join('\u0000')
    if (previousSortKey != null && sortKey < previousSortKey) {
      throw new Error('Component inventory input is not in deterministic canonical order')
    }
    previousSortKey = sortKey
    const locusKey = `${row.cohort}\u0000${row.canonical_id}`
    const source = sources.get(sourceKey(row.cohort, row.chrom))
    source.source_record_count += 1
    source.ordered_component_count += row.components.length
    sourceRecordCount += 1
    orderedComponentCount += row.components.length
    if (locusKey !== previousLocusKey) {
      canonicalLocusCount += 1
      source.canonical_locus_count += 1
      previousLocusKey = locusKey
    }
    inventoryHash.update(canonicalJsonLine(row))
    reconcileSourceRow(reconciliation, row)
  }
  if (
    !completionMarker ||
    completionMarker.sourceRecordCount !== sourceRecordCount ||
    completionMarker.orderedComponentCount !== orderedComponentCount
  ) {
    throw new Error('Component inventory is truncated or its completion counts do not match')
  }
  const missing = [...sources.values()].filter((source) => source.source_record_count === 0)
  if (missing.length) {
    throw new Error(
      `Incomplete component inventory; empty manifest sources: ${missing
        .map((source) => `${source.cohort}/${source.chrom}`)
        .join(', ')}`
    )
  }
  const sourceReceipts = [...sources.values()].sort(
    (left, right) =>
      left.cohort.localeCompare(right.cohort) || left.chrom.localeCompare(right.chrom)
  )
  const byCohort = Object.fromEntries(
    COHORTS.map((cohort) => {
      const cohortSources = sourceReceipts.filter((source) => source.cohort === cohort)
      return [
        cohort,
        {
          source_count: cohortSources.length,
          source_record_count: cohortSources.reduce(
            (total, source) => total + source.source_record_count,
            0
          ),
          canonical_locus_count: cohortSources.reduce(
            (total, source) => total + source.canonical_locus_count,
            0
          ),
          ordered_component_count: cohortSources.reduce(
            (total, source) => total + source.ordered_component_count,
            0
          ),
        },
      ]
    })
  )
  const catalogReconciliation = finishReconciliation(catalogRows, reconciliation)
  return {
    schema_version: 1,
    complete: true,
    database,
    release: 'y1',
    reference_genome: 'GRCh38',
    source_count: sourceReceipts.length,
    source_record_count: sourceRecordCount,
    canonical_locus_count: canonicalLocusCount,
    ordered_component_count: orderedComponentCount,
    completion_marker_sha256: sha256Json({
      expected_source_records: completionMarker.sourceRecordCount,
      expected_ordered_components: completionMarker.orderedComponentCount,
    }),
    completion_contract:
      'A terminal query-generated marker must equal the streamed source-record and ordered-component counts before the artifact is atomically renamed.',
    by_cohort: byCohort,
    sources: sourceReceipts,
    source_bundle_sha256: sha256Json(sourceReceipts),
    inventory_sha256: inventoryHash.digest('hex'),
    catalog_compact_sha256: sha256Json(catalogRows),
    catalog_row_keys_sha256: sha256Json(catalogRows.map(catalogRowKey).sort()),
    extraction_query_sha256: sha256Bytes(queryBytes),
    executable_sha256: sha256Bytes(fs.readFileSync(__filename)),
    canonicalization:
      'SHA-256 over UTF-8 compact JSON lines ordered by cohort, normalized canonical TRID, source record, run, chromosome, and position; ordered components and duplicate source rows are preserved.',
    limits: {
      max_candidates_per_status: MAX_CANDIDATES,
      max_source_records_per_candidate: MAX_SOURCE_RECORDS_PER_CANDIDATE,
    },
    catalog_reconciliation: catalogReconciliation,
    catalog_reconciliation_sha256: sha256Json(catalogReconciliation),
  }
}

const writeJsonAtomic = (filename, value) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
  fs.renameSync(temporary, filename)
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const catalogRows = catalogRowsFromInput(readJson(args.catalog))
  const expectedSources = validateManifestBundle(readJson(args.manifests))
  const query = buildExtractionQuery(args.database, expectedSources)
  if (args['emit-query']) {
    fs.writeFileSync(args['emit-query'], query)
    return
  }
  const queryBytes = fs.readFileSync(args['query-file'])
  if (queryBytes.toString('utf8') !== query) {
    throw new Error('Extraction query does not match the deterministic manifest-bound query')
  }
  const inputStream = args.input === '-' ? process.stdin : fs.createReadStream(args.input)
  const artifact = await buildIndex({
    inputStream,
    catalogRows,
    expectedSources,
    database: args.database,
    queryBytes,
  })
  writeJsonAtomic(args.out, artifact)
  process.stdout.write(
    `${args.out}: ${artifact.source_count} complete sources; ${artifact.source_record_count} records; ${artifact.ordered_component_count} ordered components\n`
  )
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`)
    process.exitCode = 1
  })
}

module.exports = {
  buildExtractionQuery,
  buildIndex,
  catalogRowKey,
  catalogRowsFromInput,
  motifRelation,
  parseTrid,
  validateManifestBundle,
}

import { getY1SourceSnapshot } from '../../queries/long_read_y1_provenance'
import {
  contextReceipt,
  parseStrContextReceipt,
  runtimeSourceIdentity,
  type StrContextReceipt,
} from '../../str_context_admission'
import type { Y1AncillaryRoute } from '../../y1_config'
import { validateStrContextSourceMap } from '../../str_context_source_map'

export const STR_CONTEXT_RULES_SHA256 =
  '2ab2c4c7f6487145a7325ac1ca83b7f8ae4eeab8c374387557afe962a4ea449c'
export const strContextColumnShapes: Record<string, Record<string, string>> = {
  lr_y1_str_context_histograms_v2: {
    contract: 'LowCardinality(String)',
    cohort: 'LowCardinality(String)',
    run_id: 'String',
    task_id: 'String',
    source_uri: 'String',
    source_generation: 'String',
    source_size_bytes: 'UInt64',
    source_md5_base64: 'String',
    row_ordinal: 'UInt64',
    locus_id: 'String',
    motif: 'String',
    chrom: 'LowCardinality(String)',
    locus_start: 'UInt32',
    locus_end: 'UInt32',
    source_interval: 'String',
    context_chrom: 'LowCardinality(String)',
    context_start: 'UInt32',
    context_end: 'UInt32',
    source_vc: 'Nullable(String)',
    num_called_alleles: 'UInt32',
    unique_allele_lengths: 'UInt32',
    source_header: 'Array(String)',
    source_fields: 'Map(String, String)',
    projection_version: 'String',
    receipt_digest: 'String',
  },
  lr_y1_str_context_mapping_v2: {
    cohort: 'LowCardinality(String)',
    ancillary_run_id: 'String',
    primary_database: 'String',
    primary_snapshot_digest: 'String',
    canonical_locus_id: 'String',
    component_index: 'UInt32',
    chrom: 'LowCardinality(String)',
    named_start: 'Nullable(UInt32)',
    named_end: 'Nullable(UInt32)',
    motif: 'Nullable(String)',
    mapping_status: 'LowCardinality(String)',
    context_count: 'UInt32',
    source_uri: 'Nullable(String)',
    source_generation: 'Nullable(String)',
    source_row_ordinal: 'Nullable(UInt64)',
    primary_binding_status: 'LowCardinality(String)',
    primary_an_concordance: 'LowCardinality(String)',
    projection_version: 'String',
    receipt_digest: 'String',
  },
}
type Query = (
  route: Y1AncillaryRoute,
  query: string,
  params?: Record<string, unknown>
) => Promise<any[]>
const requireEqual = (actual: unknown, expected: unknown, label: string) => {
  if (Number(actual) !== Number(expected) || actual === null || actual === undefined) {
    throw new Error(`Context-v2 preflight ${label} mismatch`)
  }
}
export const validateContextPrimarySnapshot = async (r: StrContextReceipt) => {
  for (const run of r.primary_snapshot.runs) {
    // Serialize startup snapshot checks rather than issuing 24 concurrent database reads.
    // eslint-disable-next-line no-await-in-loop
    const actual = await getY1SourceSnapshot(r.cohort, run.chrom)
    if (
      !actual ||
      actual.database !== r.primary_snapshot.database ||
      actual.run_id !== run.run_id ||
      actual.cohort !== r.cohort ||
      actual.reference_genome !== 'GRCh38' ||
      actual.primary_manifest_sha256 !== run.manifest_sha256 ||
      actual.accepted_task_attempt_digest !== run.accepted_task_attempt_digest
    ) {
      throw new Error(`Context-v2 primary snapshot mismatch for ${run.chrom}`)
    }
  }
}

export const preflightStrContext = async (route: Y1AncillaryRoute, query: Query) => {
  const r = parseStrContextReceipt(contextReceipt(route), route)
  if (r.projection.rules_sha256 !== STR_CONTEXT_RULES_SHA256)
    throw new Error('Context-v2 projection rules digest mismatch')
  if (!route.source_map_artifacts)
    throw new Error('Context-v2 requires pinned source_map_artifacts')
  validateStrContextSourceMap(r, route.source_map_artifacts)
  await validateContextPrimarySnapshot(r)
  const physical = runtimeSourceIdentity(r.source)
  const params = {
    tables: Object.keys(strContextColumnShapes),
    cohort: r.cohort,
    run: r.capture.run_id, // Root/route run is validated equal; never projection instance.
    uri: physical.uri,
    generation: physical.generation,
    size: physical.size_bytes,
    md5: physical.md5_base64,
    task: r.capture.task_id,
    version: r.projection.version,
    header: r.capture.header_sha256,
    receipt: r.receipt_digest,
    primaryDatabase: r.primary_snapshot.database,
    primaryDigest: r.primary_snapshot.bundle_digest,
  }
  const [columns, engines] = await Promise.all([
    query(
      route,
      'SELECT table, name, type FROM system.columns WHERE database = currentDatabase() AND table IN {tables:Array(String)}',
      params
    ),
    query(
      route,
      'SELECT name, engine FROM system.tables WHERE database = currentDatabase() AND name IN {tables:Array(String)}',
      params
    ),
  ])
  for (const [table, shape] of Object.entries(strContextColumnShapes)) {
    if (engines.find((row) => row.name === table)?.engine !== 'MergeTree')
      throw new Error(`Context-v2 ${table} engine mismatch`)
    for (const [name, type] of Object.entries(shape)) {
      if (
        columns.filter((row) => row.table === table && row.name === name && row.type === type)
          .length !== 1
      ) {
        throw new Error(`Context-v2 ${table}.${name} type mismatch`)
      }
    }
  }
  // No run WHERE clause: extra/mixed source or projection rows must fail, not disappear.
  const sourceExact = `contract = 'updated_histogram_source_v1' AND cohort = {cohort:String}
    AND run_id = {run:String} AND task_id = {task:String} AND source_uri = {uri:String}
    AND source_generation = {generation:String} AND source_size_bytes = {size:UInt64}
    AND source_md5_base64 = {md5:String} AND projection_version = {version:String}
    AND receipt_digest = {receipt:String}
    AND lower(hex(SHA256(toJSONString(source_header)))) = {header:String}
    AND arraySort(mapKeys(source_fields)) = arraySort(source_header)`
  const [sourceTotals, sources, mappings, joins] = await Promise.all([
    query(
      route,
      `SELECT count() AS rows, min(row_ordinal) AS min_ordinal, max(row_ordinal) AS max_ordinal,
      uniqExact((cohort, run_id, source_uri, source_generation, row_ordinal)) AS physical_keys,
      uniqExact((cohort, run_id, source_uri, source_generation, locus_id, source_interval, source_fields['VC'])) AS contexts,
      countIf(${sourceExact}) AS exact
      FROM lr_y1_str_context_histograms_v2`,
      params
    ),
    query(
      route,
      `SELECT concat('chr', chrom) AS contig, count() AS canonical_rows,
      countIf(num_called_alleles > 0) AS allele_available_rows,
      countIf(mapContains(source_fields, 'BiallelicHistogram') AND source_fields['BiallelicHistogram'] NOT IN ('', '.')) AS pair_available_rows,
      countIf(context_start = locus_start AND context_end = locus_end) AS equal_context_rows,
      countIf(context_chrom = chrom AND context_start <= locus_start AND context_end >= locus_end
        AND (context_start < locus_start OR context_end > locus_end)) AS wider_context_rows,
      countIf(mapContains(source_fields, 'VC') AND source_fields['VC'] NOT IN ('', '.')) AS vc_populated_rows,
      countIf(NOT mapContains(source_fields, 'VC') OR NOT mapContains(source_fields, 'LocusId')
        OR source_fields['LocusId'] != locus_id OR source_fields['Interval'] != source_interval
        OR source_fields['Motif'] != motif OR context_chrom != chrom
        OR source_interval != concat(context_chrom, ':', toString(context_start), '-', toString(context_end))
        OR locus_id != concat(chrom, '-', toString(locus_start), '-', toString(locus_end), '-', motif)
        OR (source_fields['VC'] IN ('', '.') AND isNotNull(source_vc))
        OR (source_fields['VC'] NOT IN ('', '.') AND ifNull(source_vc, '') != source_fields['VC'])) AS invalid
      FROM lr_y1_str_context_histograms_v2 GROUP BY chrom ORDER BY chrom`,
      params
    ),
    query(
      route,
      `SELECT concat('chr', chrom) AS contig, count() AS mapping_rows,
      uniqExact((cohort, ancillary_run_id, projection_version, receipt_digest, primary_database,
        primary_snapshot_digest, canonical_locus_id, component_index)) AS target_keys,
      countIf(mapping_status = 'available_source_context') AS available_rows,
      countIf(mapping_status = 'unavailable_no_context') AS absent_rows,
      countIf(mapping_status = 'unavailable_ambiguous') AS ambiguous_rows,
      countIf(mapping_status = 'unavailable_compound') AS compound_rows,
      uniqExactIf((source_uri, source_generation, source_row_ordinal), mapping_status = 'available_source_context') AS referenced_source_rows,
      countIf(cohort = {cohort:String} AND ancillary_run_id = {run:String}
        AND projection_version = {version:String} AND receipt_digest = {receipt:String}
        AND primary_database = {primaryDatabase:String} AND primary_snapshot_digest = {primaryDigest:String}
        AND primary_binding_status = 'NOT_ESTABLISHED' AND primary_an_concordance = 'NOT_ESTABLISHED') AS exact,
      countIf(NOT ifNull((
        (mapping_status = 'unavailable_compound' AND component_index = 4294967295 AND context_count = 0
          AND isNull(named_start) AND isNull(named_end) AND isNull(motif)
          AND isNull(source_uri) AND isNull(source_generation) AND isNull(source_row_ordinal))
        OR (component_index = 0 AND isNotNull(named_start) AND isNotNull(named_end) AND isNotNull(motif)
          AND canonical_locus_id = concat(chrom, '-', toString(named_start), '-', toString(named_end), '-', motif)
          AND ((mapping_status = 'available_source_context' AND context_count = 1
            AND source_uri = {uri:String} AND source_generation = {generation:String} AND source_row_ordinal > 0)
            OR (mapping_status IN ('unavailable_no_context', 'unavailable_ambiguous')
              AND isNull(source_uri) AND isNull(source_generation) AND isNull(source_row_ordinal)
              AND ((mapping_status = 'unavailable_no_context' AND context_count = 0)
                OR (mapping_status = 'unavailable_ambiguous' AND context_count > 1)))))
      ), 0)) AS invalid
      FROM lr_y1_str_context_mapping_v2 GROUP BY chrom ORDER BY chrom`,
      params
    ),
    query(
      route,
      `SELECT countIf(
        (m.mapping_status = 'available_source_context' AND
          (s.source_rows != 1 OR s.chrom != m.chrom OR s.locus_start != m.named_start
           OR s.locus_end != m.named_end OR s.motif != m.motif))
        OR (m.mapping_status != 'unavailable_compound' AND m.context_count != c.contexts)
      ) AS mismatches
      FROM lr_y1_str_context_mapping_v2 AS m
      LEFT JOIN (
        SELECT cohort, run_id, source_uri, source_generation, row_ordinal, chrom, locus_start, locus_end, motif, count() AS source_rows
        FROM lr_y1_str_context_histograms_v2
        GROUP BY cohort, run_id, source_uri, source_generation, row_ordinal, chrom, locus_start, locus_end, motif
      ) AS s ON m.cohort = s.cohort AND m.ancillary_run_id = s.run_id
        AND m.source_uri = s.source_uri AND m.source_generation = s.source_generation AND m.source_row_ordinal = s.row_ordinal
      LEFT JOIN (
        SELECT cohort, run_id, chrom, locus_start, locus_end, motif, count() AS contexts
        FROM lr_y1_str_context_histograms_v2 GROUP BY cohort, run_id, chrom, locus_start, locus_end, motif
      ) AS c ON m.cohort = c.cohort AND m.ancillary_run_id = c.run_id AND m.chrom = c.chrom
        AND m.named_start = c.locus_start AND m.named_end = c.locus_end AND m.motif = c.motif
      SETTINGS join_use_nulls = 0`,
      params
    ),
  ])
  if (sourceTotals.length !== 1 || joins.length !== 1)
    throw new Error('Context-v2 missing reconciliation row')
  for (const key of ['rows', 'physical_keys', 'contexts', 'exact', 'max_ordinal']) {
    requireEqual(sourceTotals[0][key], r.counts.source_rows, key)
  }
  requireEqual(sourceTotals[0].min_ordinal, 1, 'min ordinal')
  requireEqual(joins[0].mismatches, 0, 'mapping whole identity/context multiplicity')
  const sourceByChrom = new Map(sources.map((row) => [row.contig, row]))
  const mappingByChrom = new Map(mappings.map((row) => [row.contig, row]))
  if (
    sourceByChrom.size !== sources.length ||
    mappingByChrom.size !== mappings.length ||
    [...sourceByChrom.keys(), ...mappingByChrom.keys()].some(
      (chrom) => !r.contigs.some((row) => row.chrom === chrom)
    )
  ) {
    throw new Error('Context-v2 duplicate or unknown physical contigs')
  }
  for (const expected of r.contigs) {
    const s = sourceByChrom.get(expected.chrom) || {
      canonical_rows: 0,
      allele_available_rows: 0,
      pair_available_rows: 0,
      equal_context_rows: 0,
      wider_context_rows: 0,
      vc_populated_rows: 0,
      invalid: 0,
    }
    const m = mappingByChrom.get(expected.chrom) || {
      mapping_rows: 0,
      target_keys: 0,
      available_rows: 0,
      absent_rows: 0,
      ambiguous_rows: 0,
      compound_rows: 0,
      referenced_source_rows: 0,
      exact: 0,
      invalid: 0,
    }
    for (const key of [
      'canonical_rows',
      'allele_available_rows',
      'pair_available_rows',
      'equal_context_rows',
      'wider_context_rows',
      'vc_populated_rows',
    ] as const) {
      requireEqual(s[key], expected[key], `${expected.chrom}.${key}`)
    }
    requireEqual(
      Number(s.canonical_rows) - Number(s.pair_available_rows),
      expected.pair_missing_rows,
      'missing pairs'
    )
    requireEqual(expected.pair_invalid_rows, 0, 'capture invalid pairs')
    for (const key of [
      'mapping_rows',
      'available_rows',
      'absent_rows',
      'ambiguous_rows',
      'compound_rows',
      'referenced_source_rows',
    ] as const) {
      requireEqual(m[key], expected[key], `${expected.chrom}.${key}`)
    }
    requireEqual(m.target_keys, expected.mapping_rows, 'unique mapping targets')
    requireEqual(m.exact, expected.mapping_rows, 'mapping snapshot identity')
    requireEqual(s.invalid, 0, 'source helpers')
    requireEqual(m.invalid, 0, 'mapping grammar')
  }
}

import { createHash } from 'node:crypto'

import { y1ClickhouseClient } from '../clickhouse'

export const PRIMARY_MOTIF_METRIC = 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1'
export const PRIMARY_MOTIF_UNIT = 'EXACT_PRIMARY_MOTIF_UNITS'
export const PRIMARY_MOTIF_SCOPE = 'WHOLE_REPRESENTED_ALLELE'
export const PRIMARY_MOTIF_COMPLETE_BOUNDS_STATUS = 'complete_no_truncation'
export const PRIMARY_MOTIF_COMPLETE_LOCUS_STATUS = 'complete'
export const AOU_GENOTYPE_REASON = 'AGGREGATE_ONLY_SOURCE_NO_GT_PAIRING'

// These response limits are deliberately tighter than the producer's persisted limits.
export const MAX_PRIMARY_MOTIF_RESPONSE_BINS = 4096
export const MAX_PRIMARY_MOTIF_RESPONSE_CELLS = 5000
export const MAX_PRIMARY_MOTIF_RESPONSE_BYTES = 512 * 1024
export const MAX_PRIMARY_MOTIF_ROWS_READ = 20_000
export const MAX_PRIMARY_MOTIF_BYTES_READ = 8 * 1024 * 1024

const PRODUCT_TABLES = [
  'lr_y1_primary_motif_runs',
  'lr_y1_primary_motif_loci',
  'lr_y1_primary_motif_allele_bins',
  'lr_y1_primary_motif_genotype_pairs',
  'lr_y1_primary_motif_genotype_margins',
] as const

export type PrimaryMotifProductPreflightResult = {
  status: 'DISABLED' | 'NOT_RUN' | 'AVAILABLE' | 'UNAVAILABLE'
  reason_code: 'OPTIONAL_PRODUCT_PREFLIGHT_FAILED' | null
}

let preflightResult: PrimaryMotifProductPreflightResult =
  process.env.LR_Y1_PRIMARY_MOTIF_ENABLED === 'true'
    ? { status: 'NOT_RUN', reason_code: null }
    : { status: 'DISABLED', reason_code: null }

export type PrimaryMotifUnavailableReason =
  | 'PUBLIC_PRODUCT_NOT_APPROVED'
  | 'PRIMARY_REPEAT_IDENTITY_UNAVAILABLE'
  | 'SOURCE_RECORD_COUNT_NOT_ONE'
  | 'NO_ACCEPTED_PRODUCT_RUN'
  | 'PRODUCT_IDENTITY_MISMATCH'
  | 'PRODUCT_INCOMPLETE'
  | 'PRODUCT_BOUND_EXCEEDED'
  | 'PRODUCT_QUERY_FAILED'

export type PrimaryMotifGenotypeUnavailableReason =
  | typeof AOU_GENOTYPE_REASON
  | 'SOURCE_COMPLETE_GENOTYPES_UNAVAILABLE'
  | 'PRODUCT_INCOMPLETE'
  | 'PRODUCT_BOUND_EXCEEDED'

export type PrimaryMotifMeasurement = {
  status: 'AVAILABLE' | 'UNAVAILABLE'
  reason_code: PrimaryMotifUnavailableReason | null
  motif: string | null
  biological_role: string | null
  metric: typeof PRIMARY_MOTIF_METRIC
  unit: typeof PRIMARY_MOTIF_UNIT
  scope: typeof PRIMARY_MOTIF_SCOPE
  called_alleles: number | null
  reference_alleles: number | null
  alternate_alleles: number | null
  alternate_identities_checked: number | null
  bins: { exact_units: number; allele_copies: number }[]
  genotype: {
    status: 'AVAILABLE' | 'UNAVAILABLE'
    reason_code: PrimaryMotifGenotypeUnavailableReason | null
    called_diploid_people: number | null
    no_call_people: number | null
    cells: { shorter_exact_units: number; longer_exact_units: number; people: number }[]
  }
  provenance: null | {
    product_run_id: string
    primary_database: string
    primary_run_id: string
    primary_task_id: string
    primary_attempt_id: string
    source_variant_id: string
    registry_digest: string
    registry_approval_state: string
    algorithm_version: string
    algorithm_sha256: string
    anchor_rule: string
    source_record_sha256: string
    allele_receipt_sha256: string
    genotype_receipt_sha256: string | null
    bounds_status: string
    serialized_bytes: number
    returned_bins: number
    returned_cells: number
  }
}

type ProductComponent = { start0: number; end0: number; motif: string }

type ProductIdentity = {
  cohort: 'hgsvc_hprc' | 'aou'
  chrom: string
  primaryDatabase: string
  primaryRunId: string
  sourceVariantId: string
  primaryTaskId: string
  primaryAttemptId: string
  canonicalLocusId: string
  components: ProductComponent[]
  componentDigest: string
  primaryComponentIndex: number
  motif: string
  selectionBasis: string
  biologicalRole: string | null
  catalogId: string
  catalogDigest: string | null
  registryDigest: string | null
  sourceAltCount: number
}

type QueryRows = (query: string, params?: Record<string, unknown>) => Promise<any[]>

const clickhouseSettings = {
  max_execution_time: 2,
  max_threads: 1,
  max_rows_to_read: String(MAX_PRIMARY_MOTIF_ROWS_READ),
  max_bytes_to_read: String(MAX_PRIMARY_MOTIF_BYTES_READ),
  max_result_rows: String(MAX_PRIMARY_MOTIF_RESPONSE_BINS + MAX_PRIMARY_MOTIF_RESPONSE_CELLS + 10),
  max_result_bytes: String(MAX_PRIMARY_MOTIF_RESPONSE_BYTES),
  result_overflow_mode: 'throw' as const,
  read_overflow_mode: 'throw' as const,
}

const defaultQueryRows: QueryRows = async (query, query_params = {}) => {
  const result = await y1ClickhouseClient.query({
    query,
    query_params,
    format: 'JSONEachRow',
    clickhouse_settings: clickhouseSettings,
  })
  return (await result.json()) as any[]
}

const invariant = (message: string): never => {
  throw new Error(`PRIMARY_MOTIF_PRODUCT_INVARIANT: ${message}`)
}

const requiredString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value) invariant(`${label} is missing`)
  return value as string
}

const sha256 = (value: unknown, label: string) => {
  const parsed = requiredString(value, label)
  if (!/^[0-9a-f]{64}$/.test(parsed)) invariant(`${label} is not a SHA-256`)
  return parsed
}

const nonnegativeInteger = (value: unknown, label: string) => {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) invariant(`${label} is not nonnegative integer`)
  return parsed
}

const nullableString = (value: unknown) =>
  typeof value === 'string' && value.length ? value : null

const responseBytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8')

const componentDigest = (components: ProductComponent[]) =>
  createHash('sha256')
    .update('Y1_PRIMARY_MOTIF_COMPONENTS_V1\0')
    .update(JSON.stringify(components))
    .digest('hex')

const exactArray = (observed: unknown, expected: unknown[]) =>
  Array.isArray(observed) &&
  observed.length === expected.length &&
  observed.every((value, index) => value === expected[index])

export const containedPrimaryMotifFailureReason = (
  error: unknown
): PrimaryMotifUnavailableReason => {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (/exceed|bound|serialized-byte/.test(message)) return 'PRODUCT_BOUND_EXCEEDED'
  if (/stale|cross-bound|identity|registry digests differ/.test(message)) {
    return 'PRODUCT_IDENTITY_MISMATCH'
  }
  if (/reconcile|receipt|empty|incomplete|not complete/.test(message)) {
    return 'PRODUCT_INCOMPLETE'
  }
  return 'PRODUCT_QUERY_FAILED'
}

export const unavailablePrimaryMotifMeasurement = (
  reason_code: PrimaryMotifUnavailableReason,
  motif: string | null = null,
  biological_role: string | null = null
): PrimaryMotifMeasurement => ({
  status: 'UNAVAILABLE',
  reason_code,
  motif,
  biological_role,
  metric: PRIMARY_MOTIF_METRIC,
  unit: PRIMARY_MOTIF_UNIT,
  scope: PRIMARY_MOTIF_SCOPE,
  called_alleles: null,
  reference_alleles: null,
  alternate_alleles: null,
  alternate_identities_checked: null,
  bins: [],
  genotype: {
    status: 'UNAVAILABLE',
    reason_code: 'PRODUCT_INCOMPLETE',
    called_diploid_people: null,
    no_call_people: null,
    cells: [],
  },
  provenance: null,
})

const exactIdentity = (locus: any, primaryRepeat: any): ProductIdentity | null => {
  if (
    primaryRepeat?.status !== 'AVAILABLE' ||
    typeof primaryRepeat.motif !== 'string' ||
    !Number.isInteger(primaryRepeat.component_index) ||
    typeof primaryRepeat.selection_basis !== 'string' ||
    !Array.isArray(locus.components) ||
    !locus.components.length
  ) {
    return null
  }
  if (!Array.isArray(locus.source_records) || locus.source_records.length !== 1) return null
  const locusChrom = String(locus.chrom).replace(/^chr/i, '').toUpperCase()
  if (
    locus.components.some(
      (component: any) => String(component.chrom).replace(/^chr/i, '').toUpperCase() !== locusChrom
    )
  ) {
    return null
  }
  const components = locus.components.map((component: any) => ({
    start0: nonnegativeInteger(component.start0, 'component start'),
    end0: nonnegativeInteger(component.end0, 'component end'),
    motif: requiredString(component.motif, 'component motif'),
  }))
  const componentIndex = primaryRepeat.component_index
  const selectedComponent = components[componentIndex]
  const resolvedComponent = primaryRepeat.component
  if (
    componentIndex < 0 ||
    componentIndex >= components.length ||
    !selectedComponent ||
    !resolvedComponent ||
    String(resolvedComponent.chrom).replace(/^chr/i, '').toUpperCase() !== locusChrom ||
    Number(resolvedComponent.start0) !== selectedComponent.start0 ||
    Number(resolvedComponent.end0) !== selectedComponent.end0 ||
    resolvedComponent.motif !== selectedComponent.motif ||
    primaryRepeat.motif !== selectedComponent.motif
  ) {
    return null
  }
  const source = locus.source_records[0]
  const sourceAltCount = Number(source.alt_count)
  if (!Number.isInteger(sourceAltCount) || sourceAltCount < 1) return null
  const catalogDigest = nullableString(primaryRepeat.catalog_digest)
  const registryDigest = nullableString(primaryRepeat.registry_digest)
  if (catalogDigest) sha256(catalogDigest, 'catalog digest')
  if (registryDigest) sha256(registryDigest, 'identity registry digest')
  return {
    cohort: locus.lr_cohort,
    chrom: `chr${String(locus.chrom).replace(/^chr/i, '')}`,
    primaryDatabase: requiredString(locus.primary_database, 'primary database'),
    primaryRunId: requiredString(locus.source_run_id, 'primary run'),
    sourceVariantId: requiredString(source.source_variant_id, 'source variant'),
    primaryTaskId: requiredString(source.task_id, 'primary task'),
    primaryAttemptId: requiredString(source.attempt_id, 'primary attempt'),
    canonicalLocusId: requiredString(locus.id, 'canonical locus'),
    components,
    componentDigest: componentDigest(components),
    primaryComponentIndex: primaryRepeat.component_index,
    motif: primaryRepeat.motif,
    selectionBasis: primaryRepeat.selection_basis,
    biologicalRole: nullableString(primaryRepeat.biological_role),
    catalogId: nullableString(primaryRepeat.catalog_id) || '',
    catalogDigest,
    registryDigest,
    sourceAltCount,
  }
}

const identityParams = (identity: ProductIdentity) => ({
  cohort: identity.cohort,
  chrom: identity.chrom,
  primaryDatabase: identity.primaryDatabase,
  primaryRunId: identity.primaryRunId,
  sourceVariantId: identity.sourceVariantId,
  primaryTaskId: identity.primaryTaskId,
  primaryAttemptId: identity.primaryAttemptId,
  canonicalLocusId: identity.canonicalLocusId,
  motif: identity.motif,
})

const selectAcceptedRun = async (identity: ProductIdentity, queryRows: QueryRows) => {
  const rows = await queryRows(
    `
      SELECT product_run_id, state, primary_database, primary_run_id,
        registry_digest, registry_approval_state, metric, algorithm_version,
        algorithm_sha256, anchor_rule, max_producer_bins,
        max_genotype_pairs_per_stratum, max_genotype_cells_per_stratum,
        max_serialized_aggregate_bytes, bounds_status, serialized_bytes,
        genotype_margin_rows, genotype_margin_content_sha256, receipt_sha256
      FROM lr_y1_primary_motif_runs FINAL
      WHERE release = 'y1' AND cohort = {cohort:String}
        AND reference_genome = 'GRCh38' AND chrom = {chrom:String}
        AND primary_database = {primaryDatabase:String}
        AND primary_run_id = {primaryRunId:String}
        AND state = 'accepted_frozen'
        AND registry_approval_state = 'REVIEWED'
        AND metric = {metric:String}
      ORDER BY updated_at DESC, product_run_id
      LIMIT 2
    `,
    { ...identityParams(identity), metric: PRIMARY_MOTIF_METRIC }
  )
  if (!rows.length) return null
  if (rows.length !== 1) invariant('multiple accepted product runs match the primary identity')
  const run = rows[0]
  if (
    run.state !== 'accepted_frozen' ||
    run.registry_approval_state !== 'REVIEWED' ||
    run.metric !== PRIMARY_MOTIF_METRIC ||
    run.primary_database !== identity.primaryDatabase ||
    run.primary_run_id !== identity.primaryRunId
  ) {
    invariant('accepted product run identity is stale or contradictory')
  }
  const advertisedBins = nonnegativeInteger(run.max_producer_bins, 'producer bin bound')
  const advertisedPairs = nonnegativeInteger(
    run.max_genotype_pairs_per_stratum,
    'producer genotype-pair bound'
  )
  const advertisedCells = nonnegativeInteger(
    run.max_genotype_cells_per_stratum,
    'producer genotype-cell bound'
  )
  const advertisedBytes = nonnegativeInteger(
    run.max_serialized_aggregate_bytes,
    'producer serialized-byte bound'
  )
  if (
    advertisedBins > 65_536 ||
    advertisedPairs > 5000 ||
    advertisedCells > 5000 ||
    advertisedBytes > 1024 * 1024 ||
    run.bounds_status !== PRIMARY_MOTIF_COMPLETE_BOUNDS_STATUS
  ) {
    invariant('accepted product run advertises unsupported or failed bounds')
  }
  return {
    ...run,
    product_run_id: requiredString(run.product_run_id, 'product run ID'),
    registry_digest: sha256(run.registry_digest, 'registry digest'),
    algorithm_version: requiredString(run.algorithm_version, 'algorithm version'),
    algorithm_sha256: sha256(run.algorithm_sha256, 'algorithm digest'),
    anchor_rule: requiredString(run.anchor_rule, 'anchor rule'),
    serialized_bytes: nonnegativeInteger(run.serialized_bytes, 'run serialized bytes'),
    genotype_margin_rows: nonnegativeInteger(run.genotype_margin_rows, 'run genotype margin rows'),
    genotype_margin_content_sha256:
      run.genotype_margin_content_sha256 == null
        ? null
        : sha256(run.genotype_margin_content_sha256, 'run genotype margin content digest'),
    receipt_sha256: sha256(run.receipt_sha256, 'accepted run receipt digest'),
  }
}

const selectLocusReceipt = async (identity: ProductIdentity, run: any, queryRows: QueryRows) => {
  const productRunId = run.product_run_id
  const rows = await queryRows(
    `
      SELECT product_run_id, primary_run_id, primary_task_id, primary_attempt_id,
        source_variant_id, canonical_locus_id, component_starts0, component_ends0,
        component_motifs, component_digest, primary_component_index, primary_motif,
        selection_basis, biological_role, catalog_id, catalog_digest, registry_digest,
        registry_approval_state, metric, algorithm_version, algorithm_sha256,
        anchor_rule, alts_checked, bin_count, overall_an, overall_alt_ac,
        overall_ref_copies, genotype_status, genotype_reason_code,
        called_diploid_people, partial_diploid_people, no_call_people,
        non_diploid_people, genotype_observed_an, genotype_pair_count,
        genotype_cell_count, genotype_margin_count, bounds_status, status, reason_code,
        source_record_sha256, allele_receipt_sha256, genotype_receipt_sha256,
        serialized_bytes
      FROM lr_y1_primary_motif_loci
      WHERE product_run_id = {productRunId:String}
        AND release = 'y1' AND cohort = {cohort:String}
        AND reference_genome = 'GRCh38' AND chrom = {chrom:String}
        AND primary_run_id = {primaryRunId:String}
        AND primary_task_id = {primaryTaskId:String}
        AND primary_attempt_id = {primaryAttemptId:String}
        AND source_variant_id = {sourceVariantId:String}
        AND canonical_locus_id = {canonicalLocusId:String}
        AND primary_motif = {motif:String}
      LIMIT 2
    `,
    { ...identityParams(identity), productRunId }
  )
  if (rows.length !== 1) invariant('accepted product does not have exactly one locus receipt')
  const row = rows[0]
  const exactPairs: [string, unknown, unknown][] = [
    ['product_run_id', row.product_run_id, productRunId],
    ['primary_run_id', row.primary_run_id, identity.primaryRunId],
    ['primary_task_id', row.primary_task_id, identity.primaryTaskId],
    ['primary_attempt_id', row.primary_attempt_id, identity.primaryAttemptId],
    ['source_variant_id', row.source_variant_id, identity.sourceVariantId],
    ['canonical_locus_id', row.canonical_locus_id, identity.canonicalLocusId],
    ['component_digest', row.component_digest, identity.componentDigest],
    [
      'primary_component_index',
      Number(row.primary_component_index),
      identity.primaryComponentIndex,
    ],
    ['primary_motif', row.primary_motif, identity.motif],
    ['selection_basis', row.selection_basis, identity.selectionBasis],
    ['biological_role', nullableString(row.biological_role), identity.biologicalRole],
    ['catalog_id', row.catalog_id, identity.catalogId],
    ['catalog_digest', nullableString(row.catalog_digest), identity.catalogDigest],
    ['registry_digest', row.registry_digest, run.registry_digest],
    ['metric', row.metric, run.metric],
    ['algorithm_version', row.algorithm_version, run.algorithm_version],
    ['algorithm_sha256', row.algorithm_sha256, run.algorithm_sha256],
    ['anchor_rule', row.anchor_rule, run.anchor_rule],
  ]
  if (
    exactPairs.some(([, observed, expected]) => observed !== expected) ||
    !exactArray(
      row.component_starts0,
      identity.components.map((component) => component.start0)
    ) ||
    !exactArray(
      row.component_ends0,
      identity.components.map((component) => component.end0)
    ) ||
    !exactArray(
      row.component_motifs,
      identity.components.map((component) => component.motif)
    ) ||
    (identity.registryDigest != null && row.registry_digest !== identity.registryDigest)
  ) {
    invariant('locus receipt is stale or cross-bound')
  }
  if (
    row.registry_approval_state !== 'REVIEWED' ||
    row.metric !== PRIMARY_MOTIF_METRIC ||
    row.bounds_status !== PRIMARY_MOTIF_COMPLETE_BOUNDS_STATUS ||
    row.status !== PRIMARY_MOTIF_COMPLETE_LOCUS_STATUS
  ) {
    invariant('locus receipt is not complete, reviewed, available, and within bounds')
  }
  const altsChecked = nonnegativeInteger(row.alts_checked, 'checked ALT identities')
  if (altsChecked !== identity.sourceAltCount) {
    invariant('checked ALT identities do not match the complete primary source record')
  }
  return {
    ...row,
    altsChecked,
    binCount: nonnegativeInteger(row.bin_count, 'locus bin count'),
    overallAn: nonnegativeInteger(row.overall_an, 'overall AN'),
    overallAltAc: nonnegativeInteger(row.overall_alt_ac, 'overall ALT AC'),
    overallRefCopies: nonnegativeInteger(row.overall_ref_copies, 'overall REF copies'),
    calledDiploidPeople: nonnegativeInteger(row.called_diploid_people, 'called diploid people'),
    partialDiploidPeople: nonnegativeInteger(row.partial_diploid_people, 'partial diploid people'),
    noCallPeople: nonnegativeInteger(row.no_call_people, 'no-call people'),
    nonDiploidPeople: nonnegativeInteger(row.non_diploid_people, 'non-diploid people'),
    genotypeCellCount: nonnegativeInteger(row.genotype_cell_count, 'genotype cell count'),
    genotypeMarginCount: nonnegativeInteger(row.genotype_margin_count, 'genotype margin count'),
    serializedBytes: nonnegativeInteger(row.serialized_bytes, 'locus serialized bytes'),
    sourceRecordSha256: sha256(row.source_record_sha256, 'source-record digest'),
    alleleReceiptSha256: sha256(row.allele_receipt_sha256, 'allele receipt digest'),
    genotypeReceiptSha256:
      row.genotype_receipt_sha256 == null
        ? null
        : sha256(row.genotype_receipt_sha256, 'genotype receipt digest'),
  }
}

const selectAlleleBins = async (
  identity: ProductIdentity,
  productRunId: string,
  registryDigest: string,
  queryRows: QueryRows
) => {
  const rows = await queryRows(
    `
      SELECT exact_units, allele_copies, reference_copies, alternate_copies,
        stratum_an, stratum_alt_ac, stratum_ref_copies
      FROM lr_y1_primary_motif_allele_bins
      WHERE product_run_id = {productRunId:String}
        AND release = 'y1' AND cohort = {cohort:String}
        AND reference_genome = 'GRCh38' AND chrom = {chrom:String}
        AND primary_run_id = {primaryRunId:String}
        AND source_variant_id = {sourceVariantId:String}
        AND canonical_locus_id = {canonicalLocusId:String}
        AND registry_digest = {registryDigest:String}
        AND metric = {metric:String} AND division = 'all'
        AND isNull(ancestry) AND isNull(sex)
      ORDER BY exact_units
      LIMIT ${MAX_PRIMARY_MOTIF_RESPONSE_BINS + 1}
    `,
    {
      ...identityParams(identity),
      productRunId,
      registryDigest,
      metric: PRIMARY_MOTIF_METRIC,
    }
  )
  if (!rows.length || rows.length > MAX_PRIMARY_MOTIF_RESPONSE_BINS) {
    invariant('allele bins are empty or exceed the response bound')
  }
  const seen = new Set<number>()
  return rows.map((row) => {
    const exactUnits = nonnegativeInteger(row.exact_units, 'exact units')
    const alleleCopies = nonnegativeInteger(row.allele_copies, 'allele copies')
    const referenceCopies = nonnegativeInteger(row.reference_copies, 'reference copies')
    const alternateCopies = nonnegativeInteger(row.alternate_copies, 'alternate copies')
    if (
      seen.has(exactUnits) ||
      referenceCopies + alternateCopies !== alleleCopies ||
      alleleCopies === 0
    ) {
      invariant('allele bin is duplicate, empty, or does not reconcile')
    }
    seen.add(exactUnits)
    return {
      exact_units: exactUnits,
      allele_copies: alleleCopies,
      reference_copies: referenceCopies,
      alternate_copies: alternateCopies,
      stratum_an: nonnegativeInteger(row.stratum_an, 'stratum AN'),
      stratum_alt_ac: nonnegativeInteger(row.stratum_alt_ac, 'stratum ALT AC'),
      stratum_ref_copies: nonnegativeInteger(row.stratum_ref_copies, 'stratum REF copies'),
    }
  })
}

const selectGenotypeCells = async (
  identity: ProductIdentity,
  productRunId: string,
  registryDigest: string,
  queryRows: QueryRows
) => {
  const rows = await queryRows(
    `
      SELECT shorter_exact_units, longer_exact_units, sum(people) AS people,
        uniqExact(pair_receipt_sha256) AS receipt_count,
        any(pair_receipt_sha256) AS pair_receipt_sha256
      FROM lr_y1_primary_motif_genotype_pairs
      WHERE product_run_id = {productRunId:String}
        AND release = 'y1' AND cohort = {cohort:String}
        AND reference_genome = 'GRCh38' AND chrom = {chrom:String}
        AND primary_run_id = {primaryRunId:String}
        AND source_variant_id = {sourceVariantId:String}
        AND canonical_locus_id = {canonicalLocusId:String}
        AND registry_digest = {registryDigest:String}
        AND metric = {metric:String} AND division = 'all'
        AND isNull(ancestry) AND isNull(sex)
      GROUP BY shorter_exact_units, longer_exact_units
      ORDER BY shorter_exact_units, longer_exact_units
      LIMIT ${MAX_PRIMARY_MOTIF_RESPONSE_CELLS + 1}
    `,
    { ...identityParams(identity), productRunId, registryDigest, metric: PRIMARY_MOTIF_METRIC }
  )
  if (!rows.length || rows.length > MAX_PRIMARY_MOTIF_RESPONSE_CELLS) {
    invariant('genotype cells are empty or exceed the response bound')
  }
  const seen = new Set<string>()
  const receipts = new Set<string>()
  const cells = rows.map((row) => {
    const shorter = nonnegativeInteger(row.shorter_exact_units, 'shorter exact units')
    const longer = nonnegativeInteger(row.longer_exact_units, 'longer exact units')
    const people = nonnegativeInteger(row.people, 'genotype cell people')
    const key = `${shorter}/${longer}`
    if (
      shorter > longer ||
      people === 0 ||
      seen.has(key) ||
      nonnegativeInteger(row.receipt_count, 'pair receipt count') !== 1
    ) {
      invariant('genotype cell is unordered, empty, duplicate, or receipt-inconsistent')
    }
    seen.add(key)
    receipts.add(sha256(row.pair_receipt_sha256, 'genotype pair receipt digest'))
    return { shorter_exact_units: shorter, longer_exact_units: longer, people }
  })
  if (receipts.size !== 1) invariant('genotype pairs do not share one all-stratum receipt')
  return { cells, receiptSha256: [...receipts][0] }
}

const selectGenotypeMargins = async (
  identity: ProductIdentity,
  productRunId: string,
  registryDigest: string,
  expectedTotalRows: number,
  queryRows: QueryRows
) => {
  const params = {
    ...identityParams(identity),
    productRunId,
    registryDigest,
    metric: PRIMARY_MOTIF_METRIC,
  }
  const countRows = await queryRows(
    `
      SELECT count() AS margin_count
      FROM lr_y1_primary_motif_genotype_margins
      WHERE product_run_id = {productRunId:String}
        AND release = 'y1' AND cohort = {cohort:String}
        AND reference_genome = 'GRCh38' AND chrom = {chrom:String}
        AND primary_run_id = {primaryRunId:String}
        AND source_variant_id = {sourceVariantId:String}
        AND canonical_locus_id = {canonicalLocusId:String}
        AND registry_digest = {registryDigest:String}
        AND metric = {metric:String}
    `,
    params
  )
  if (
    countRows.length !== 1 ||
    nonnegativeInteger(countRows[0].margin_count, 'physical genotype margin count') !==
      expectedTotalRows
  ) {
    invariant('genotype margin table does not match the locus receipt count')
  }
  const rows = await queryRows(
    `
      SELECT allele_index, expected_copies, paired_copies,
        excluded_from_pairs_copies, margin_receipt_sha256
      FROM lr_y1_primary_motif_genotype_margins
      WHERE product_run_id = {productRunId:String}
        AND release = 'y1' AND cohort = {cohort:String}
        AND reference_genome = 'GRCh38' AND chrom = {chrom:String}
        AND primary_run_id = {primaryRunId:String}
        AND source_variant_id = {sourceVariantId:String}
        AND canonical_locus_id = {canonicalLocusId:String}
        AND registry_digest = {registryDigest:String}
        AND metric = {metric:String} AND division = 'all'
        AND isNull(ancestry) AND isNull(sex)
      ORDER BY allele_index
      LIMIT ${identity.sourceAltCount + 2}
    `,
    params
  )
  if (rows.length !== identity.sourceAltCount + 1) {
    invariant('all-stratum genotype margins are incomplete for REF and every specific ALT')
  }
  const receipts = new Set<string>()
  const margins = rows.map((row, expectedIndex) => {
    const alleleIndex = nonnegativeInteger(row.allele_index, 'margin allele index')
    const expectedCopies = nonnegativeInteger(row.expected_copies, 'margin expected copies')
    const pairedCopies = nonnegativeInteger(row.paired_copies, 'margin paired copies')
    const excludedCopies = nonnegativeInteger(
      row.excluded_from_pairs_copies,
      'margin excluded copies'
    )
    if (alleleIndex !== expectedIndex || pairedCopies + excludedCopies !== expectedCopies) {
      invariant('genotype margin index or copy reconciliation is incomplete')
    }
    receipts.add(sha256(row.margin_receipt_sha256, 'genotype margin receipt digest'))
    return { alleleIndex, expectedCopies, pairedCopies, excludedCopies }
  })
  if (receipts.size !== 1) invariant('genotype margins do not share one all-stratum receipt')
  return { margins, receiptSha256: [...receipts][0] }
}

export const fetchLongReadTrPrimaryMotifMeasurementUncached = async (
  locus: any,
  primaryRepeat: any,
  options: { enabled?: boolean; queryRows?: QueryRows } = {}
): Promise<PrimaryMotifMeasurement> => {
  const enabled = options.enabled ?? process.env.LR_Y1_PRIMARY_MOTIF_ENABLED === 'true'
  const motif = typeof primaryRepeat?.motif === 'string' ? primaryRepeat.motif : null
  const biologicalRole = nullableString(primaryRepeat?.biological_role)
  if (!enabled) {
    return unavailablePrimaryMotifMeasurement('PUBLIC_PRODUCT_NOT_APPROVED', motif, biologicalRole)
  }
  if (primaryRepeat?.status !== 'AVAILABLE') {
    return unavailablePrimaryMotifMeasurement('PRIMARY_REPEAT_IDENTITY_UNAVAILABLE', null, null)
  }
  if (!Array.isArray(locus.source_records) || locus.source_records.length !== 1) {
    return unavailablePrimaryMotifMeasurement('SOURCE_RECORD_COUNT_NOT_ONE', motif, biologicalRole)
  }
  const identity = exactIdentity(locus, primaryRepeat)
  if (!identity) {
    return unavailablePrimaryMotifMeasurement('PRODUCT_IDENTITY_MISMATCH', motif, biologicalRole)
  }
  if (!options.queryRows && preflightResult.status !== 'AVAILABLE') {
    return unavailablePrimaryMotifMeasurement('PRODUCT_INCOMPLETE', motif, biologicalRole)
  }
  const queryRows = options.queryRows || defaultQueryRows
  const run = await selectAcceptedRun(identity, queryRows)
  if (!run) {
    return unavailablePrimaryMotifMeasurement(
      'NO_ACCEPTED_PRODUCT_RUN',
      identity.motif,
      identity.biologicalRole
    )
  }
  const receipt = await selectLocusReceipt(identity, run, queryRows)
  if (
    receipt.registry_digest !== run.registry_digest ||
    (identity.cohort === 'aou'
      ? receipt.reason_code !== AOU_GENOTYPE_REASON
      : receipt.reason_code != null)
  ) {
    invariant('run and locus registry digests or completion reasons differ')
  }
  const bins = await selectAlleleBins(identity, run.product_run_id, run.registry_digest, queryRows)
  if (bins.length !== receipt.binCount) invariant('returned bin count differs from locus receipt')
  const binAn = new Set(bins.map((bin) => bin.stratum_an))
  const binAltAc = new Set(bins.map((bin) => bin.stratum_alt_ac))
  const binRef = new Set(bins.map((bin) => bin.stratum_ref_copies))
  if (
    binAn.size !== 1 ||
    !binAn.has(receipt.overallAn) ||
    binAltAc.size !== 1 ||
    !binAltAc.has(receipt.overallAltAc) ||
    binRef.size !== 1 ||
    !binRef.has(receipt.overallRefCopies) ||
    bins.reduce((sum, bin) => sum + bin.allele_copies, 0) !== receipt.overallAn ||
    bins.reduce((sum, bin) => sum + bin.reference_copies, 0) !== receipt.overallRefCopies ||
    bins.reduce((sum, bin) => sum + bin.alternate_copies, 0) !== receipt.overallAltAc
  ) {
    invariant('allele bins do not exactly reconcile to the locus receipt')
  }

  let genotype: PrimaryMotifMeasurement['genotype']
  if (identity.cohort === 'aou') {
    if (
      receipt.genotype_status !== 'UNAVAILABLE' ||
      receipt.genotype_reason_code !== AOU_GENOTYPE_REASON ||
      receipt.calledDiploidPeople !== 0 ||
      receipt.genotypeCellCount !== 0 ||
      receipt.genotypeMarginCount !== 0 ||
      run.genotype_margin_rows !== 0 ||
      run.genotype_margin_content_sha256 != null
    ) {
      invariant('AoU genotype status is not typed aggregate-only unavailable')
    }
    genotype = {
      status: 'UNAVAILABLE',
      reason_code: AOU_GENOTYPE_REASON,
      called_diploid_people: null,
      no_call_people: null,
      cells: [],
    }
  } else if (
    receipt.genotype_status !== 'AVAILABLE' ||
    receipt.genotype_reason_code != null ||
    receipt.partialDiploidPeople !== 0 ||
    receipt.nonDiploidPeople !== 0 ||
    Number(receipt.genotype_observed_an) !== receipt.overallAn ||
    !receipt.genotypeReceiptSha256
  ) {
    genotype = {
      status: 'UNAVAILABLE',
      reason_code: 'SOURCE_COMPLETE_GENOTYPES_UNAVAILABLE',
      called_diploid_people: null,
      no_call_people: null,
      cells: [],
    }
  } else {
    if (
      receipt.genotypeMarginCount === 0 ||
      run.genotype_margin_rows < receipt.genotypeMarginCount ||
      !run.genotype_margin_content_sha256
    ) {
      invariant('accepted product lacks its genotype margin table receipt')
    }
    const pairResult = await selectGenotypeCells(
      identity,
      run.product_run_id,
      run.registry_digest,
      queryRows
    )
    const marginResult = await selectGenotypeMargins(
      identity,
      run.product_run_id,
      run.registry_digest,
      receipt.genotypeMarginCount,
      queryRows
    )
    const refMargin = marginResult.margins[0]
    const altMargins = marginResult.margins.slice(1)
    if (
      pairResult.receiptSha256 !== marginResult.receiptSha256 ||
      pairResult.cells.length !== receipt.genotypeCellCount ||
      pairResult.cells.reduce((sum, cell) => sum + cell.people, 0) !==
        receipt.calledDiploidPeople ||
      refMargin.expectedCopies !== receipt.overallRefCopies ||
      altMargins.reduce((sum, margin) => sum + margin.expectedCopies, 0) !== receipt.overallAltAc ||
      marginResult.margins.reduce((sum, margin) => sum + margin.expectedCopies, 0) !==
        receipt.overallAn ||
      marginResult.margins.some((margin) => margin.excludedCopies !== 0)
    ) {
      invariant('genotype cells and complete REF/specific-ALT margins do not reconcile')
    }
    genotype = {
      status: 'AVAILABLE',
      reason_code: null,
      called_diploid_people: receipt.calledDiploidPeople,
      no_call_people: receipt.noCallPeople,
      cells: pairResult.cells,
    }
  }

  const response: PrimaryMotifMeasurement = {
    status: 'AVAILABLE',
    reason_code: null,
    motif: identity.motif,
    biological_role: identity.biologicalRole,
    metric: PRIMARY_MOTIF_METRIC,
    unit: PRIMARY_MOTIF_UNIT,
    scope: PRIMARY_MOTIF_SCOPE,
    called_alleles: receipt.overallAn,
    reference_alleles: receipt.overallRefCopies,
    alternate_alleles: receipt.overallAltAc,
    alternate_identities_checked: receipt.altsChecked,
    bins: bins.map(({ exact_units, allele_copies }) => ({ exact_units, allele_copies })),
    genotype,
    provenance: {
      product_run_id: run.product_run_id,
      primary_database: identity.primaryDatabase,
      primary_run_id: identity.primaryRunId,
      primary_task_id: identity.primaryTaskId,
      primary_attempt_id: identity.primaryAttemptId,
      source_variant_id: identity.sourceVariantId,
      registry_digest: run.registry_digest,
      registry_approval_state: run.registry_approval_state,
      algorithm_version: run.algorithm_version,
      algorithm_sha256: run.algorithm_sha256,
      anchor_rule: run.anchor_rule,
      source_record_sha256: receipt.sourceRecordSha256,
      allele_receipt_sha256: receipt.alleleReceiptSha256,
      genotype_receipt_sha256: receipt.genotypeReceiptSha256,
      bounds_status: receipt.bounds_status,
      serialized_bytes: receipt.serializedBytes,
      returned_bins: bins.length,
      returned_cells: genotype.cells.length,
    },
  }
  if (
    responseBytes(response) > MAX_PRIMARY_MOTIF_RESPONSE_BYTES ||
    receipt.serializedBytes > 1024 * 1024
  ) {
    invariant('locus product or response exceeds its serialized-byte bound')
  }
  return response
}

export const primaryMotifProductPreflightStatus = () => preflightResult.status
export const primaryMotifProductPreflightResult = () => ({ ...preflightResult })

export const preflightLongReadPrimaryMotifProduct = async (
  options: { enabled?: boolean; queryRows?: QueryRows } = {}
): Promise<PrimaryMotifProductPreflightResult> => {
  const enabled = options.enabled ?? process.env.LR_Y1_PRIMARY_MOTIF_ENABLED === 'true'
  if (!enabled) {
    preflightResult = { status: 'DISABLED', reason_code: null }
    return primaryMotifProductPreflightResult()
  }
  try {
    const queryRows = options.queryRows || defaultQueryRows
    const tableRows = await queryRows(
      `
        SELECT name
        FROM system.tables
        WHERE database = currentDatabase() AND name IN {tables:Array(String)}
        ORDER BY name
        LIMIT 5
      `,
      { tables: [...PRODUCT_TABLES] }
    )
    const observed = new Set(tableRows.map((row) => row.name))
    if (
      PRODUCT_TABLES.some((table) => !observed.has(table)) ||
      observed.size !== PRODUCT_TABLES.length
    ) {
      invariant('configured product database is missing an aggregate serving table')
    }
    const accepted = await queryRows(
      `
        SELECT product_run_id, cohort, chrom, primary_database, primary_run_id,
          registry_digest, registry_approval_state, metric, algorithm_version,
          algorithm_sha256, anchor_rule, bounds_status, genotype_margin_rows,
          genotype_margin_content_sha256, receipt_sha256
        FROM lr_y1_primary_motif_runs FINAL
        WHERE release = 'y1' AND reference_genome = 'GRCh38'
          AND state = 'accepted_frozen'
        ORDER BY cohort, chrom, primary_run_id, product_run_id
        LIMIT 49
      `
    )
    if (!accepted.length || accepted.length > 48) {
      invariant('configured product has zero or too many accepted runs')
    }
    const identities = new Set<string>()
    accepted.forEach((row) => {
      const key = `${row.cohort}\u0000${row.chrom}\u0000${row.primary_database}\u0000${row.primary_run_id}`
      const marginRows = nonnegativeInteger(
        row.genotype_margin_rows,
        'preflight genotype margin rows'
      )
      const marginDigest = nullableString(row.genotype_margin_content_sha256)
      if (
        identities.has(key) ||
        !['hgsvc_hprc', 'aou'].includes(row.cohort) ||
        row.registry_approval_state !== 'REVIEWED' ||
        row.metric !== PRIMARY_MOTIF_METRIC ||
        row.bounds_status !== PRIMARY_MOTIF_COMPLETE_BOUNDS_STATUS ||
        (row.cohort === 'hgsvc_hprc' && (marginRows === 0 || !marginDigest)) ||
        (row.cohort === 'aou' && (marginRows !== 0 || marginDigest != null))
      ) {
        invariant(
          'accepted product run set is duplicate, unreviewed, incomplete, or outside bounds'
        )
      }
      identities.add(key)
      requiredString(row.algorithm_version, 'preflight algorithm version')
      requiredString(row.anchor_rule, 'preflight anchor rule')
      sha256(row.registry_digest, 'preflight registry digest')
      sha256(row.algorithm_sha256, 'preflight algorithm digest')
      sha256(row.receipt_sha256, 'preflight accepted run receipt digest')
      if (marginDigest) sha256(marginDigest, 'preflight genotype margin content digest')
    })
    preflightResult = { status: 'AVAILABLE', reason_code: null }
  } catch (_error) {
    // This product is optional. Preserve the canonical GraphQL API and fail the capability closed.
    preflightResult = {
      status: 'UNAVAILABLE',
      reason_code: 'OPTIONAL_PRODUCT_PREFLIGHT_FAILED',
    }
  }
  return primaryMotifProductPreflightResult()
}

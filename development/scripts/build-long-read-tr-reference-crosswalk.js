#!/usr/bin/env node
/* eslint-disable no-restricted-syntax */

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const COHORTS = ['hgsvc_hprc', 'aou']
const DURABLE_STATUSES = [
  'EXACT_UNIQUE',
  'AMBIGUOUS',
  'COORDINATE_MISMATCH',
  'ORIENTATION_DIAGNOSTIC',
  'MOTIF_MISMATCH',
  'SOURCE_ABSENT',
  'UNAVAILABLE',
]

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
  for (const required of [
    'catalog',
    'component-index',
    'manifests',
    'database',
    'distribution-concrete-index',
    'distribution-index-uuid',
    'distribution-queried-at',
    'out',
  ]) {
    if (!args[required]) throw new Error(`Missing --${required}`)
  }
  return args
}

const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'))
const normalizedChrom = (value) => String(value).replace(/^chr/i, '').toUpperCase()
const sha256Json = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')

const requireOwn = (value, key, context) => {
  if (value == null || !Object.prototype.hasOwnProperty.call(value, key)) {
    throw new Error(`${context} is missing required transfer field ${key}`)
  }
  return value[key]
}

const normalizeRegion = (region, context) => {
  requireOwn(region, 'reference_genome', context)
  requireOwn(region, 'chrom', context)
  requireOwn(region, 'start', context)
  requireOwn(region, 'stop', context)
  return {
    reference_genome: region.reference_genome,
    chrom: region.chrom,
    start: Number(region.start),
    stop: Number(region.stop),
  }
}

// This is the complete frozen catalog transfer surface. Optional scalar values become
// explicit nulls; decision-bearing arrays and objects must be present.
const normalizeCatalogRows = (rows) =>
  rows
    .map((row, rowIndex) => {
      const context = `catalog row ${row?.id || rowIndex}`
      for (const key of [
        'id',
        'gene',
        'associated_diseases',
        'main_reference_region',
        'reference_regions',
        'reference_repeat_unit',
        'repeat_units',
      ]) {
        requireOwn(row, key, context)
      }
      if (!Array.isArray(row.associated_diseases)) {
        throw new Error(`${context} associated_diseases is not an array`)
      }
      if (!Array.isArray(row.reference_regions) || !row.reference_regions.length) {
        throw new Error(`${context} reference_regions is not a non-empty array`)
      }
      if (!Array.isArray(row.repeat_units) || !row.repeat_units.length) {
        throw new Error(`${context} repeat_units is not a non-empty array`)
      }
      return {
        id: String(row.id),
        gene: {
          ensembl_id: requireOwn(row.gene, 'ensembl_id', `${context} gene`),
          symbol: requireOwn(row.gene, 'symbol', `${context} gene`),
          region: requireOwn(row.gene, 'region', `${context} gene`),
        },
        associated_diseases: row.associated_diseases.map((disease, diseaseIndex) => {
          const diseaseContext = `${context} disease ${diseaseIndex}`
          for (const key of ['name', 'symbol', 'inheritance_mode', 'repeat_size_classifications']) {
            requireOwn(disease, key, diseaseContext)
          }
          if (!Array.isArray(disease.repeat_size_classifications)) {
            throw new Error(`${diseaseContext} repeat_size_classifications is not an array`)
          }
          return {
            name: disease.name,
            symbol: disease.symbol,
            omim_id: disease.omim_id == null ? null : disease.omim_id,
            inheritance_mode: disease.inheritance_mode,
            notes: disease.notes == null ? null : disease.notes,
            repeat_size_classifications: disease.repeat_size_classifications.map(
              (classification, classificationIndex) => {
                const classificationContext = `${diseaseContext} classification ${classificationIndex}`
                requireOwn(classification, 'classification', classificationContext)
                if (
                  !Object.prototype.hasOwnProperty.call(classification, 'min') &&
                  !Object.prototype.hasOwnProperty.call(classification, 'max')
                ) {
                  throw new Error(`${classificationContext} is missing both min and max`)
                }
                return {
                  classification: classification.classification,
                  min: classification.min == null ? null : Number(classification.min),
                  max: classification.max == null ? null : Number(classification.max),
                }
              }
            ),
          }
        }),
        stripy_id: row.stripy_id == null ? null : row.stripy_id,
        strchive_id: row.strchive_id == null ? null : row.strchive_id,
        main_reference_region: normalizeRegion(row.main_reference_region, `${context} main region`),
        reference_regions: row.reference_regions.map((region, index) =>
          normalizeRegion(region, `${context} reference region ${index}`)
        ),
        reference_repeat_unit: String(row.reference_repeat_unit),
        repeat_units: row.repeat_units.map((unit, index) => {
          requireOwn(unit, 'repeat_unit', `${context} repeat unit ${index}`)
          requireOwn(unit, 'classification', `${context} repeat unit ${index}`)
          return { repeat_unit: unit.repeat_unit, classification: unit.classification }
        }),
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id))

const parseCanonicalId = (canonicalId) =>
  String(canonicalId)
    .split('+')
    .map((part) => {
      const match = /^([^-]+)-(\d+)-(\d+)-(.+)$/.exec(part)
      if (!match) throw new Error(`Invalid canonical LR locus ID ${canonicalId}`)
      return { chrom: match[1], start0: Number(match[2]), end0: Number(match[3]), motif: match[4] }
    })

const assertCanonicalComponents = (cohort, locus) => {
  if (!Array.isArray(locus.components) || !locus.components.length) {
    throw new Error(`${cohort}/${locus.canonical_id} has no ordered components`)
  }
  const parsed = parseCanonicalId(locus.canonical_id)
  const stored = locus.components.map((component) => ({
    chrom: String(component.chrom),
    start0: Number(component.start0),
    end0: Number(component.end0),
    motif: String(component.motif),
  }))
  if (JSON.stringify(parsed) !== JSON.stringify(stored)) {
    throw new Error(
      `${cohort}/${locus.canonical_id} canonical ID does not equal its ordered components`
    )
  }
}

const catalogRowKey = (row) =>
  `gnomad-short-snapshot:${row.id}:${sha256Json({
    id: row.id,
    region: row.main_reference_region,
    motif: row.reference_repeat_unit,
  }).slice(0, 16)}`

const DISTRIBUTION_LIMITS = {
  max_serialized_bytes: 2 * 1024 * 1024,
  max_total_bins: 20000,
  max_allele_source_rows: 1000,
  max_genotype_source_rows: 1000,
}

const distributionReceipt = (row) => {
  const context = `catalog row ${row?.id || 'unknown'} distributions`
  const allele = requireOwn(row, 'allele_size_distribution', context)
  const genotype = requireOwn(row, 'genotype_distribution', context)
  if (!Array.isArray(allele) || !Array.isArray(genotype)) {
    throw new Error(`${context} fields are not arrays`)
  }
  const serialized = JSON.stringify({
    allele_size_distribution: allele,
    genotype_distribution: genotype,
  })
  const receipt = {
    sha256: crypto.createHash('sha256').update(serialized).digest('hex'),
    serialized_bytes: Buffer.byteLength(serialized),
    allele_source_rows: allele.length,
    genotype_source_rows: genotype.length,
    allele_bins: allele.reduce(
      (total, item) => total + (Array.isArray(item?.distribution) ? item.distribution.length : 0),
      0
    ),
    genotype_bins: genotype.reduce(
      (total, item) => total + (Array.isArray(item?.distribution) ? item.distribution.length : 0),
      0
    ),
  }
  if (receipt.serialized_bytes > DISTRIBUTION_LIMITS.max_serialized_bytes) {
    throw new Error(`${context} exceeds the serialized-byte limit`)
  }
  if (receipt.allele_bins + receipt.genotype_bins > DISTRIBUTION_LIMITS.max_total_bins) {
    throw new Error(`${context} exceeds the total-bin limit`)
  }
  if (
    receipt.allele_source_rows > DISTRIBUTION_LIMITS.max_allele_source_rows ||
    receipt.genotype_source_rows > DISTRIBUTION_LIMITS.max_genotype_source_rows
  ) {
    throw new Error(`${context} exceeds a source-row limit`)
  }
  return receipt
}

const catalogSurface = (input) => {
  if (Array.isArray(input.rows) && input.rows.every((row) => row?.short)) {
    const rows = normalizeCatalogRows(input.rows.map((row) => row.short))
    const receipts = new Map(
      input.rows.map((row) => [String(row.short.id), row.distribution_receipt])
    )
    return {
      rows,
      receipts,
      endpoint: input.catalog?.endpoint,
      queriedAt: input.catalog?.queried_at,
    }
  }
  const rows = normalizeCatalogRows(input.rows)
  return {
    rows,
    receipts: new Map(input.rows.map((row) => [String(row.id), distributionReceipt(row)])),
    endpoint: input.endpoint,
    queriedAt: input.queried_at,
  }
}

const validateCatalog = (rows) => {
  if (!rows.length) throw new Error('Catalog is empty')
  const rowKeys = rows.map(catalogRowKey)
  if (new Set(rowKeys).size !== rows.length) throw new Error('Catalog row keys are not unique')
  for (const row of rows) {
    if (row.main_reference_region.reference_genome !== 'GRCh38') {
      throw new Error(`${row.id} main reference region is not GRCh38`)
    }
    if (!row.reference_repeat_unit || row.reference_repeat_unit !== row.reference_repeat_unit.toUpperCase()) {
      throw new Error(`${row.id} repeat unit is not a non-empty stored uppercase motif`)
    }
  }
}

const validateComponentIndex = (index, catalogRows, database) => {
  if (
    index.schema_version !== 1 ||
    index.complete !== true ||
    index.database !== database ||
    index.release !== 'y1' ||
    index.reference_genome !== 'GRCh38' ||
    index.source_count !== 48 ||
    !Number.isInteger(index.source_record_count) ||
    index.source_record_count <= 0 ||
    !Number.isInteger(index.ordered_component_count) ||
    index.ordered_component_count < index.source_record_count ||
    index.completion_marker_sha256 !==
      sha256Json({
        expected_source_records: index.source_record_count,
        expected_ordered_components: index.ordered_component_count,
      }) ||
    !/^[0-9a-f]{64}$/.test(index.inventory_sha256 || '') ||
    index.catalog_compact_sha256 !== sha256Json(catalogRows) ||
    index.catalog_row_keys_sha256 !== sha256Json(catalogRows.map(catalogRowKey).sort())
  ) {
    throw new Error('Component index receipt does not bind the complete catalog/source inventory')
  }
  if (!Array.isArray(index.sources) || index.sources.length !== 48) {
    throw new Error('Component index receipt does not contain all source receipts')
  }
  if (
    index.source_bundle_sha256 !== sha256Json(index.sources) ||
    index.sources.some(
      (source) =>
        !source.run_id ||
        source.source_record_count <= 0 ||
        source.canonical_locus_count <= 0 ||
        source.ordered_component_count < source.source_record_count
    )
  ) {
    throw new Error('Component index source completeness receipt is invalid')
  }
  if (
    !Array.isArray(index.catalog_reconciliation) ||
    index.catalog_reconciliation.length !== catalogRows.length ||
    index.catalog_reconciliation_sha256 !== sha256Json(index.catalog_reconciliation)
  ) {
    throw new Error('Component index catalog reconciliation receipt is invalid')
  }
}

const manifestSources = (bundle, database) => {
  const sources = bundle.entries
    .filter((entry) => COHORTS.includes(entry.cohort))
    .map((entry) => ({
      cohort: entry.cohort,
      chrom: entry.chrom,
      source_database: database,
      source_release: 'y1',
      source_run_id: entry.run_id,
    }))
    .sort(
      (left, right) =>
        left.cohort.localeCompare(right.cohort) || left.chrom.localeCompare(right.chrom)
    )
  if (
    sources.length !== 48 ||
    new Set(sources.map((source) => `${source.cohort}\u0000${source.chrom}`)).size !== 48
  ) {
    throw new Error(`Expected 48 unique manifest sources, found ${sources.length}`)
  }
  return sources
}

const exactCandidate = (candidate) => ({
  canonical_id: candidate.canonical_id,
  matched_component_index: candidate.ordered_component_index,
  matched_component: candidate.ordered_component,
  matched_reference_region_index: 0,
  source_record_count: candidate.source_record_count,
  source_record_membership_sha256: candidate.source_record_membership_sha256,
})

const statusCounts = (rows) =>
  Object.fromEntries(
    COHORTS.map((cohort) => [
      cohort,
      Object.fromEntries(
        DURABLE_STATUSES.map((status) => [
          status,
          rows.filter((row) => row.cohorts[cohort].status === status).length,
        ])
      ),
    ])
  )

const withoutReconciliation = (componentIndex) => {
  const { catalog_reconciliation: _rows, ...receipt } = componentIndex
  return receipt
}

const writeJsonAtomic = (filename, value) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
  fs.renameSync(temporary, filename)
}

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const catalogInput = readJson(args.catalog)
  const componentIndex = readJson(args['component-index'])
  const manifestBundle = readJson(args.manifests)
  const surface = catalogSurface(catalogInput)
  const shortRows = surface.rows
  validateCatalog(shortRows)
  validateComponentIndex(componentIndex, shortRows, args.database)
  const sources = manifestSources(manifestBundle, args.database)
  const sourceByKey = new Map(
    sources.map((source) => [
      `${source.cohort}\u0000chr${normalizedChrom(source.chrom)}`,
      source,
    ])
  )
  const reconciliationByKey = new Map(
    componentIndex.catalog_reconciliation.map((row) => [row.row_key, row])
  )
  if (reconciliationByKey.size !== shortRows.length) {
    throw new Error('Component index has duplicate catalog row keys')
  }

  const rows = shortRows.map((short) => {
    const rowKey = catalogRowKey(short)
    const reconciliation = reconciliationByKey.get(rowKey)
    if (!reconciliation) throw new Error(`Missing component reconciliation for ${rowKey}`)
    const chrom = `chr${normalizedChrom(short.main_reference_region.chrom)}`
    const cohorts = Object.fromEntries(
      COHORTS.map((cohort) => {
        const result = reconciliation.cohorts[cohort]
        const source = sourceByKey.get(`${cohort}\u0000${chrom}`)
        if (!source || !result || !DURABLE_STATUSES.includes(result.status)) {
          throw new Error(`Invalid reconciliation cell ${rowKey}/${cohort}`)
        }
        if (
          result.status === 'UNAVAILABLE' ||
          !Array.isArray(result.candidates) ||
          result.candidates.length > componentIndex.limits.max_candidates_per_status ||
          !/^[0-9a-f]{64}$/.test(result.candidate_identity_sha256 || '')
        ) {
          throw new Error(`Untrusted/incomplete reconciliation cell ${rowKey}/${cohort}`)
        }
        // Only the unique exact status enters the authorization surface. Competing exact
        // identities are retained below as bounded diagnostics, never as routable candidates.
        const candidates =
          result.status === 'EXACT_UNIQUE' ? result.candidates.map(exactCandidate) : []
        const diagnosticCandidates =
          result.status === 'EXACT_UNIQUE' || result.status === 'SOURCE_ABSENT'
            ? []
            : result.candidates
        if (result.status === 'EXACT_UNIQUE' && candidates.length !== 1) {
          throw new Error(`Exact status does not have one component identity ${rowKey}/${cohort}`)
        }
        return [
          cohort,
          {
            status: result.status,
            reason_code: result.reason_code,
            proof_text: result.proof_text,
            source_database: source.source_database,
            source_release: source.source_release,
            source_run_id: source.source_run_id,
            candidates,
            diagnostic_candidates: diagnosticCandidates,
            diagnostic_candidate_identity_count:
              result.status === 'EXACT_UNIQUE' ? 0 : result.candidate_identity_count,
            diagnostic_candidates_truncated:
              result.status === 'EXACT_UNIQUE' ? false : result.candidates_truncated,
            diagnostic_candidate_identity_sha256:
              result.status === 'EXACT_UNIQUE' ? sha256Json([]) : result.candidate_identity_sha256,
          },
        ]
      })
    )
    return {
      row_key: rowKey,
      source_memberships: ['GNOMAD_SHORT_SNAPSHOT'],
      identifiers: {
        gnomad_short_id: short.id,
        stripy_id: short.stripy_id,
        strchive_id: short.strchive_id,
        trexplorer_locus_id: null,
      },
      tuple_set_sha256: sha256Json({
        reference_regions: short.reference_regions,
        reference_repeat_unit: short.reference_repeat_unit,
        repeat_units: short.repeat_units,
      }),
      short,
      distribution_receipt: surface.receipts.get(short.id),
      cohorts,
    }
  })

  if (
    rows.some(
      (row) =>
        !row.distribution_receipt ||
        !/^[0-9a-f]{64}$/.test(row.distribution_receipt.sha256 || '')
    )
  ) {
    throw new Error('Catalog distribution receipts are incomplete')
  }

  const counts = statusCounts(rows)
  for (const cohort of COHORTS) {
    if (Object.values(counts[cohort]).reduce((total, count) => total + count, 0) !== rows.length) {
      throw new Error(`Status categories are not exclusive/complete for ${cohort}`)
    }
  }
  const receiptRows = rows
    .map((row) => ({ id: row.short.id, ...row.distribution_receipt }))
    .sort((left, right) => left.id.localeCompare(right.id))
  const rowKeys = rows.map((row) => row.row_key).sort()
  const tupleSetReceipt = rows
    .map((row) => ({ row_key: row.row_key, tuple_set_sha256: row.tuple_set_sha256 }))
    .sort((left, right) => left.row_key.localeCompare(right.row_key))
  const compactSha256 = sha256Json(shortRows)
  const generatedAt = /^\d{4}-\d{2}-\d{2}$/.test(surface.queriedAt)
    ? `${surface.queriedAt}T00:00:00.000Z`
    : surface.queriedAt
  const artifact = {
    schema_version: 4,
    generated_at: generatedAt,
    catalog: {
      dataset: 'gnomad_r4',
      source:
        'Frozen gnomAD short-read tandem-repeat catalog snapshot; not the current TRExplorer catalog',
      endpoint: surface.endpoint,
      queried_at: surface.queriedAt,
      row_count: rows.length,
      compact_sha256: compactSha256,
      hard_ceiling: 500,
    },
    catalog_contract: {
      contract_id: 'gnomad-short-tr-snapshot-2026-08-24',
      contract_label:
        'gnomAD short-read tandem-repeat catalog snapshot from input gnomAD_STR_distributions__gnomad-v2__2025_03_17.json, captured from the browser catalog on 2026-08-24',
      contract_scope:
        'Frozen gnomAD short-read snapshot only; this is not a claim of all current disease-associated loci or current TRExplorer membership.',
      source_memberships: ['GNOMAD_SHORT_SNAPSHOT'],
      row_count: rows.length,
      row_keys_sha256: sha256Json(rowKeys),
      compact_catalog_sha256: compactSha256,
      full_tuple_set_sha256: sha256Json(tupleSetReceipt),
      expected_status_counts: counts,
      approval: {
        state: 'PENDING_SCIENCE_OWNER',
        science_owner: null,
        approved_at: null,
        approval_receipt_sha256: null,
        public_catalog_change_authorized: false,
      },
      current_trexplorer: {
        admitted: false,
        approval_claimed: false,
        note: 'Current TRExplorer remains a versioned audit input pending named science-owner review.',
      },
    },
    distribution: {
      source_index: 'gnomad_v3_short_tandem_repeats',
      concrete_index: args['distribution-concrete-index'],
      index_uuid: args['distribution-index-uuid'],
      queried_at: args['distribution-queried-at'],
      surface: ['allele_size_distribution', 'genotype_distribution'],
      canonicalization:
        'SHA-256 of UTF-8 compact JSON with keys allele_size_distribution then genotype_distribution; source array and object-key order preserved.',
      inventory_sha256: sha256Json(receiptRows),
      limits: DISTRIBUTION_LIMITS,
    },
    provenance: {
      reference_genome: 'GRCh38',
      coordinate_system: '0-based half-open',
      motif_identity: 'exact uppercase stored string',
      inventory_scope: 'all manifest-bound admitted lr_y1_summaries TRV source records',
      primary_manifest_schema_version: manifestBundle.schema_version,
      presentation_database: args.database,
    },
    component_index_receipt: withoutReconciliation(componentIndex),
    reconciliation: {
      catalog_rows: rows.length,
      status_counts: counts,
      status_counts_sha256: sha256Json(counts),
      exclusive_statuses: DURABLE_STATUSES,
      exact_authorization:
        'Only EXACT_UNIQUE candidates authorize catalog-to-LR routing; diagnostic candidates never authorize an exact link.',
    },
    sources,
    rows,
  }
  writeJsonAtomic(args.out, artifact)
  process.stdout.write(
    `${args.out}: ${rows.length} receipt-bound catalog rows; ${componentIndex.source_count} complete sources; statuses ${JSON.stringify(counts)}\n`
  )
}

if (require.main === module) main()

module.exports = {
  DISTRIBUTION_LIMITS,
  DURABLE_STATUSES,
  assertCanonicalComponents,
  catalogRowKey,
  distributionReceipt,
  normalizeCatalogRows,
  parseCanonicalId,
  sha256Json,
  statusCounts,
  validateComponentIndex,
}

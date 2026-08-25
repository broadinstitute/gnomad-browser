#!/usr/bin/env node
/* eslint-disable no-restricted-syntax, no-continue, no-nested-ternary */

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const parseArgs = (argv) => {
  const args = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key || !key.startsWith('--') || value == null)
      throw new Error(`Invalid argument ${key || ''}`)
    args[key.slice(2)] = value
  }
  for (const required of [
    'catalog',
    'inventory',
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
const regionKey = (region, motif) =>
  [
    normalizedChrom(region.chrom),
    Number(region.start),
    Number(region.stop),
    String(motif).toUpperCase(),
  ].join('\u0000')

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

// This is the complete catalog surface transferred into the compact artifact and
// compared again at runtime. Optional scalar values become explicit nulls, while
// every decision-bearing array/object must be present so a build cannot weaken the digest.
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

const sha256Json = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')

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
  const payload = { allele_size_distribution: allele, genotype_distribution: genotype }
  const serialized = JSON.stringify(payload)
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

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const catalogInput = readJson(args.catalog)
  const inventory = readJson(args.inventory)
  const manifestBundle = readJson(args.manifests)
  const shortRows = normalizeCatalogRows(catalogInput.rows)
  const distributionReceipts = new Map(
    catalogInput.rows.map((row) => [String(row.id), distributionReceipt(row)])
  )

  if (catalogInput.dataset !== 'gnomad_r4' || catalogInput.count !== shortRows.length) {
    throw new Error('Catalog dataset/count mismatch')
  }
  if (shortRows.length !== 78 || inventory.catalog_count !== shortRows.length) {
    throw new Error(`Expected the reviewed 78-row catalog, found ${shortRows.length}`)
  }
  if (new Set(shortRows.map((row) => row.id)).size !== shortRows.length) {
    throw new Error('Catalog IDs are not unique')
  }
  for (const row of shortRows) {
    if (row.main_reference_region?.reference_genome !== 'GRCh38') {
      throw new Error(`${row.id} main reference region is not GRCh38`)
    }
    if (
      !row.reference_repeat_unit ||
      row.reference_repeat_unit !== row.reference_repeat_unit.toUpperCase()
    ) {
      throw new Error(`${row.id} repeat unit is not a non-empty stored uppercase motif`)
    }
  }

  const manifestByKey = new Map(
    manifestBundle.entries.map((entry) => [`${entry.cohort}\u0000${entry.chrom}`, entry])
  )
  const catalogIdsByKey = new Map()
  for (const row of shortRows) {
    const key = regionKey(row.main_reference_region, row.reference_repeat_unit)
    const ids = catalogIdsByKey.get(key) || []
    ids.push(row.id)
    catalogIdsByKey.set(key, ids)
  }

  const cohortNames = ['hgsvc_hprc', 'aou']
  for (const cohort of cohortNames) {
    const source = inventory.cohorts[cohort]
    if (!source || !Array.isArray(source.loci))
      throw new Error(`Missing inventory cohort ${cohort}`)
    source.loci.forEach((locus) => assertCanonicalComponents(cohort, locus))
  }
  const sources = manifestBundle.entries
    .filter((entry) => cohortNames.includes(entry.cohort))
    .map((entry) => ({
      cohort: entry.cohort,
      chrom: entry.chrom,
      source_database: args.database,
      source_release: 'y1',
      source_run_id: entry.run_id,
    }))
    .sort(
      (left, right) =>
        left.cohort.localeCompare(right.cohort) ||
        Number(normalizedChrom(left.chrom).replace('X', '23').replace('Y', '24')) -
          Number(normalizedChrom(right.chrom).replace('X', '23').replace('Y', '24'))
    )
  if (
    sources.length !== 48 ||
    new Set(sources.map((source) => `${source.cohort}\u0000${source.chrom}`)).size !== 48
  ) {
    throw new Error(
      `Expected 48 unique cohort/chromosome source identities, found ${sources.length}`
    )
  }
  const rows = shortRows.map((short) => {
    const cohortResults = {}
    for (const cohort of cohortNames) {
      const source = inventory.cohorts[cohort]
      const exact = []
      let coordinateMismatch = false
      let overlapOnly = false
      for (const locus of source.loci) {
        for (const edge of locus.exact_edges || []) {
          if (edge.short_id !== short.id) continue
          const component = locus.components[edge.component_index]
          if (
            !component ||
            regionKey(
              { chrom: component.chrom, start: component.start0, stop: component.end0 },
              component.motif
            ) !== regionKey(short.main_reference_region, short.reference_repeat_unit)
          ) {
            throw new Error(
              `${cohort}/${short.id} exact edge violates the GRCh38/coordinate/motif contract`
            )
          }
          exact.push({
            canonical_id: locus.canonical_id,
            matched_component_index: edge.component_index,
            matched_component: component,
            matched_reference_region_index: 0,
          })
        }
        coordinateMismatch ||= (locus.coordinate_equal_motif_mismatches || []).some(
          (edge) => edge.short_id === short.id
        )
        overlapOnly ||= (locus.overlap_non_equal_edges || []).some(
          (edge) => edge.short_id === short.id
        )
      }
      exact.sort(
        (left, right) =>
          left.canonical_id.localeCompare(right.canonical_id) ||
          left.matched_component_index - right.matched_component_index
      )
      const chrom = `chr${normalizedChrom(short.main_reference_region.chrom)}`
      const manifest = manifestByKey.get(`${cohort}\u0000${chrom}`)
      if (!manifest) throw new Error(`Missing presentation manifest for ${cohort}/${chrom}`)
      const duplicateCatalogKey =
        catalogIdsByKey.get(regionKey(short.main_reference_region, short.reference_repeat_unit))
          .length > 1
      const canonicalIds = new Set(exact.map((candidate) => candidate.canonical_id))
      const componentKeys = new Set(
        exact.map(
          (candidate) => `${candidate.canonical_id}\u0000${candidate.matched_component_index}`
        )
      )
      let status = 'NONE'
      let reasonCode = coordinateMismatch
        ? 'REGION_EQUAL_MOTIF_MISMATCH'
        : overlapOnly
        ? 'OVERLAP_ONLY'
        : 'NO_EXACT_COMPONENT'
      if (duplicateCatalogKey) {
        status = 'AMBIGUOUS_CATALOG'
        reasonCode = 'DUPLICATE_CATALOG_EXACT_KEY'
      } else if (componentKeys.size !== exact.length) {
        status = 'AMBIGUOUS_COMPONENT'
        reasonCode = 'DUPLICATE_ORDERED_COMPONENT'
      } else if (canonicalIds.size > 1) {
        status = 'MULTIPLE'
        reasonCode = 'MULTIPLE_CONTAINING_LR_LOCI'
      } else if (exact.length > 1) {
        status = 'AMBIGUOUS_COMPONENT'
        reasonCode = 'SHORT_RECORD_MATCHES_MULTIPLE_COMPONENTS'
      } else if (exact.length === 1) {
        status = 'EXACT_UNIQUE'
        reasonCode = null
      }
      cohortResults[cohort] = {
        status,
        reason_code: reasonCode,
        source_database: args.database,
        source_release: 'y1',
        source_run_id: manifest.run_id,
        candidates: exact,
      }
    }
    return {
      short,
      distribution_receipt: distributionReceipts.get(short.id),
      cohorts: cohortResults,
    }
  })

  const exactCounts = Object.fromEntries(
    cohortNames.map((cohort) => [
      cohort,
      rows.filter((row) => row.cohorts[cohort].status === 'EXACT_UNIQUE').length,
    ])
  )
  if (exactCounts.hgsvc_hprc !== 51 || exactCounts.aou !== 58) {
    throw new Error(`Reviewed reconciliation changed: ${JSON.stringify(exactCounts)}`)
  }

  const receiptRows = rows
    .map((row) => ({ id: row.short.id, ...row.distribution_receipt }))
    .sort((left, right) => left.id.localeCompare(right.id))
  const artifact = {
    schema_version: 3,
    generated_at: /^\d{4}-\d{2}-\d{2}$/.test(catalogInput.queried_at)
      ? `${catalogInput.queried_at}T00:00:00.000Z`
      : catalogInput.queried_at,
    catalog: {
      dataset: 'gnomad_r4',
      source: 'known disease-associated short-read TR catalog exposed on gnomAD v4 pages',
      endpoint: catalogInput.endpoint,
      queried_at: catalogInput.queried_at,
      row_count: shortRows.length,
      compact_sha256: sha256Json(shortRows),
      hard_ceiling: 500,
    },
    distribution: {
      source_index: 'gnomad_v3_short_tandem_repeats',
      concrete_index: args['distribution-concrete-index'] || null,
      index_uuid: args['distribution-index-uuid'] || null,
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
      candidate_window_bp: inventory.candidate_window_bp,
      candidate_rows: inventory.candidate_rows,
      candidate_unique_loci: inventory.candidate_unique_loci,
      primary_manifest_schema_version: manifestBundle.schema_version,
      presentation_database: args.database,
    },
    reconciliation: {
      catalog_rows: shortRows.length,
      exact_unique: exactCounts,
      absent_exact: {
        hgsvc_hprc: shortRows.length - exactCounts.hgsvc_hprc,
        aou: shortRows.length - exactCounts.aou,
      },
    },
    sources,
    rows,
  }
  fs.mkdirSync(path.dirname(args.out), { recursive: true })
  fs.writeFileSync(args.out, `${JSON.stringify(artifact, null, 2)}\n`)
  process.stdout.write(
    `${args.out}: ${artifact.reconciliation.catalog_rows} catalog rows; ` +
      `${exactCounts.hgsvc_hprc} HGSVC/HPRC exact; ${exactCounts.aou} AoU exact\n`
  )
}

if (require.main === module) main()

module.exports = {
  DISTRIBUTION_LIMITS,
  assertCanonicalComponents,
  distributionReceipt,
  normalizeCatalogRows,
  parseCanonicalId,
}

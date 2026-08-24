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
    if (!key || !key.startsWith('--') || value == null) throw new Error(`Invalid argument ${key || ''}`)
    args[key.slice(2)] = value
  }
  for (const required of ['catalog', 'inventory', 'manifests', 'database', 'out']) {
    if (!args[required]) throw new Error(`Missing --${required}`)
  }
  return args
}

const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'))
const normalizedChrom = (value) => String(value).replace(/^chr/i, '').toUpperCase()
const regionKey = (region, motif) =>
  [normalizedChrom(region.chrom), Number(region.start), Number(region.stop), String(motif).toUpperCase()].join('\u0000')

const normalizeCatalogRows = (rows) =>
  rows
    .map((row) => ({
      id: String(row.id),
      gene: {
        ensembl_id: row.gene?.ensembl_id,
        symbol: row.gene?.symbol,
        region: row.gene?.region,
      },
      associated_diseases: (row.associated_diseases || []).map((disease) => ({
        name: disease.name,
        symbol: disease.symbol,
        omim_id: disease.omim_id || null,
        inheritance_mode: disease.inheritance_mode,
        repeat_size_classifications: (disease.repeat_size_classifications || []).map(
          (classification) => ({
            classification: classification.classification,
            min: classification.min == null ? null : Number(classification.min),
            max: classification.max == null ? null : Number(classification.max),
          })
        ),
      })),
      stripy_id: row.stripy_id || null,
      strchive_id: row.strchive_id || null,
      main_reference_region: row.main_reference_region,
      reference_repeat_unit: String(row.reference_repeat_unit),
    }))
    .sort((left, right) => left.id.localeCompare(right.id))

const sha256Json = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const catalogInput = readJson(args.catalog)
  const inventory = readJson(args.inventory)
  const manifestBundle = readJson(args.manifests)
  const shortRows = normalizeCatalogRows(catalogInput.rows)

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
    if (!row.reference_repeat_unit || row.reference_repeat_unit !== row.reference_repeat_unit.toUpperCase()) {
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
          if (!component || regionKey(
            { chrom: component.chrom, start: component.start0, stop: component.end0 },
            component.motif
          ) !== regionKey(short.main_reference_region, short.reference_repeat_unit)) {
            throw new Error(`${cohort}/${short.id} exact edge violates the GRCh38/coordinate/motif contract`)
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
        overlapOnly ||= (locus.overlap_non_equal_edges || []).some((edge) => edge.short_id === short.id)
      }
      exact.sort(
        (left, right) =>
          left.canonical_id.localeCompare(right.canonical_id) ||
          left.matched_component_index - right.matched_component_index
      )
      const chrom = `chr${normalizedChrom(short.main_reference_region.chrom)}`
      const manifest = manifestByKey.get(`${cohort}\u0000${chrom}`)
      if (!manifest) throw new Error(`Missing presentation manifest for ${cohort}/${chrom}`)
      const duplicateCatalogKey = catalogIdsByKey.get(
        regionKey(short.main_reference_region, short.reference_repeat_unit)
      ).length > 1
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
    return { short, cohorts: cohortResults }
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

  const artifact = {
    schema_version: 1,
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
    rows,
  }
  fs.mkdirSync(path.dirname(args.out), { recursive: true })
  fs.writeFileSync(args.out, `${JSON.stringify(artifact, null, 2)}\n`)
  process.stdout.write(
    `${args.out}: ${artifact.reconciliation.catalog_rows} catalog rows; ` +
      `${exactCounts.hgsvc_hprc} HGSVC/HPRC exact; ${exactCounts.aou} AoU exact\n`
  )
}

main()

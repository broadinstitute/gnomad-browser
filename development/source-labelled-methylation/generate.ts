// Offline only. Input evidence is independently collected/reviewed, never invented here.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  sha256File, readSourcePhasedMethylationServingReceipt,
  SOURCE_PHASED_SERVING_RECEIPT_SHA256, SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256,
} from '../../graphql-api/src/source_phased_methylation_config'
import {
  SOURCE_LABELLED_LIMITS, SOURCE_LABELLED_ROSTER_SHA256, SOURCE_LABELLED_SCHEMA,
  validateSourceLabelledCompatibilityReceipt,
} from '../../graphql-api/src/source_labelled_methylation_compatibility'

const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const hash = (p: string) => sha256File(p, 'offline evidence')
const equal = (a: unknown, b: unknown, label: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${label} mismatch`)
}
export const generate = (inputPath: string, output: string) => {
  const input = json(inputPath)
  const bundle = json(input.primary_manifest_path)
  const bundleHash = hash(input.primary_manifest_path)
  const rawPath = path.resolve(__dirname, '../../graphql-api/config/y1-source-phased-methylation-serving-receipt.json')
  equal(hash(rawPath), SOURCE_PHASED_SERVING_RECEIPT_SHA256, 'immutable raw receipt')
  const raw = readSourcePhasedMethylationServingReceipt(rawPath)
  const rosterPath = path.resolve(__dirname, 'ordered-roster.txt')
  equal(hash(rosterPath), SOURCE_LABELLED_ROSTER_SHA256, 'checked ordered roster')
  const roster = readFileSync(rosterPath, 'utf8').trimEnd().split('\n')
  const runMap = json(input.run_map_path)
  const env = { LR_Y1_CLICKHOUSE_DATABASE: input.database,
    LR_Y1_PRIMARY_MANIFEST_PATH: input.primary_manifest_path, LR_Y1_RUN_MAP: JSON.stringify(runMap) }
  const coordinates = json(input.coordinate_evidence_path)
  equal(coordinates.primary_bundle_sha256, bundleHash, 'coordinate primary binding')
  equal(coordinates.source_manifest_sha256, raw.source_manifest_sha256, 'coordinate source binding')
  if (!Array.isArray(coordinates.evidence_files) || !coordinates.evidence_files.length) {
    throw new Error('Independent native-coordinate evidence files required')
  }
  for (const file of coordinates.evidence_files) equal(hash(file.path), file.sha256, 'coordinate evidence bytes')
  if (!Array.isArray(input.entries) || input.entries.length !== 48) throw new Error('48 evidence entries required')
  const entries = input.entries.map((entry: any) => {
    const manifest = bundle.entries.find((m: any) => m.cohort === entry.cohort && m.chrom === entry.chrom)
    if (!manifest) throw new Error('Evidence entry absent from primary bundle')
    const acceptance = json(entry.acceptance_evidence_path)
    for (const key of ['cohort', 'chrom', 'run_id', 'manifest_sha256', 'source']) {
      equal(acceptance[key], manifest[key], `accepted ${key}`)
    }
    equal(acceptance.database, input.database, 'accepted database')
    equal(acceptance.status, 'accepted', 'accepted status')
    // This envelope references real terminal/task/physical reconciliation artifacts.
    // It is NOT itself a backend completion receipt or an approval of orientation.
    if (!Array.isArray(acceptance.evidence_files) || !acceptance.evidence_files.length) {
      throw new Error('Actual post-load acceptance evidence files required')
    }
    for (const file of acceptance.evidence_files) equal(hash(file.path), file.sha256, 'acceptance evidence bytes')
    const headerEvidence = json(entry.header_evidence_path)
    equal(headerEvidence.source, manifest.source, 'header immutable source identity')
    equal(hash(headerEvidence.header_path), headerEvidence.header_sha256, 'header bytes')
    const lines = readFileSync(headerEvidence.header_path, 'utf8').split(/\r?\n/).filter((l) => l.startsWith('#CHROM\t'))
    if (lines.length !== 1) throw new Error('Exactly one VCF column header required')
    const fields = lines[0].split('\t')
    equal(fields.slice(0, 8), ['#CHROM', 'POS', 'ID', 'REF', 'ALT', 'QUAL', 'FILTER', 'INFO'], 'VCF columns')
    if (manifest.cohort === 'hgsvc_hprc') {
      equal(fields[8], 'FORMAT', 'HGSVC format column')
      equal(fields.slice(9), roster, 'exact ordered 292 header roster')
    } else equal(fields.length, 8, 'AoU aggregate-only header')
    return { cohort: manifest.cohort, chrom: manifest.chrom, run_id: manifest.run_id,
      manifest_sha256: manifest.manifest_sha256, status: 'accepted',
      acceptance_evidence_sha256: hash(entry.acceptance_evidence_path), header_sha256: headerEvidence.header_sha256,
      ordered_roster_sha256: manifest.cohort === 'hgsvc_hprc' ? SOURCE_LABELLED_ROSTER_SHA256 : null }
  })
  const physical = json(input.physical_evidence_path)
  equal(physical.database, raw.database, 'physical database')
  equal(physical.run_id, raw.route_run_id, 'physical source run')
  equal(physical.serving_receipt_sha256, SOURCE_PHASED_SERVING_RECEIPT_SHA256, 'physical source receipt')
  equal(physical.tables.length, 1, 'physical table count')
  const table = physical.tables[0]
  equal(table.name, raw.table, 'physical table name')
  equal(table.engine, 'MergeTree', 'physical engine')
  equal(table.partition_key.replace(/`/g, ''), 'chrom', 'physical partition key')
  equal(table.sorting_key.replace(/[`()\s]/g, ''), 'chrom,pos1,sample_id,source_haplotype,stable_key', 'physical sorting key')
  const ddl = table.create_table_query.replace(/`/g, '')
  if (!/source_haplotype_is_1_or_2/.test(ddl) || !/source_haplotype\s+IN\s*\(\s*1\s*,\s*2\s*\)/.test(ddl) ||
      !/one_base_bed_interval/.test(ddl) || !/pos2\s*=\s*\(?\s*pos1\s*\+\s*1\s*\)?/.test(ddl) ||
      !/methylation_percentage/.test(ddl) || !/methylation\s*>=\s*0/.test(ddl) || !/methylation\s*<=\s*100/.test(ddl)) {
    throw new Error('Physical source semantic constraints mismatch')
  }
  const columns = [...physical.columns].sort((a, b) => a.position - b.position).map((c) => [c.name, c.type])
  equal(columns, SOURCE_LABELLED_SCHEMA, 'physical schema')
  const counts = new Map(physical.parts.map((p: any) => [p.chrom.replace(/^'+|'+$/g, ''), Number(p.rows)]))
  equal(counts.size, 23, 'physical contig count')
  equal(physical.parts.length, 23, 'physical unique partitions')
  const partitions = raw.contigs.map(({ chrom, rows }) => {
    equal(counts.get(chrom), rows, `physical ${chrom} count`)
    return { chrom, rows }
  })
  const receipt = validateSourceLabelledCompatibilityReceipt({
    schema_version: 1, format: 'source_labelled_methylation_candidate_compatibility_v1',
    status: 'candidate_compatible', source_labelled_only: true, vcf_orientation_joined: false,
    vcf_strand_binding: null, phase_set_binding: null, cohort: 'hgsvc_hprc', reference_genome: 'GRCh38',
    source_product: { database: raw.database, run_id: raw.route_run_id, table: raw.table,
      serving_receipt_sha256: SOURCE_PHASED_SERVING_RECEIPT_SHA256,
      completion_receipt_sha256: raw.completion_receipt_sha256, source_manifest_sha256: raw.source_manifest_sha256,
      original_primary_bundle_sha256: SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256 },
    primary: { database: input.database, bundle_sha256: bundleHash, entries },
    coordinates: { status: coordinates.status, reference_genome: coordinates.reference_genome,
      source_native: coordinates.source_native, primary_native: coordinates.primary_native,
      transformation: coordinates.transformation, evidence_sha256: hash(input.coordinate_evidence_path) },
    ordered_sample_ids: roster, ordered_roster_sha256: SOURCE_LABELLED_ROSTER_SHA256,
    source_availability: roster.map((sample_id) => ({ sample_id,
      status: raw.source_sample_ids.includes(sample_id) ? 'source_present' : 'no_methylation_output' })),
    physical: { status: 'verified', evidence_sha256: hash(input.physical_evidence_path),
      engine: table.engine, partition_key: 'chrom', sorting_key: 'chrom,pos1,sample_id,source_haplotype,stable_key',
      columns, partitions, detail_rows: raw.detail_rows }, limits: SOURCE_LABELLED_LIMITS,
  }, raw, env)
  // No partial receipt on validation failure, no overwrite, no active env output.
  mkdirSync(output)
  const receiptPath = path.resolve(output, 'compatibility-receipt.json')
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
  writeFileSync(path.join(output, 'candidate-env.INACTIVE.json'), JSON.stringify({
    ...env, LR_Y1_SOURCE_LABELLED_COMPATIBILITY_CANDIDATE_ENABLED: 'false',
    LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE: '', LR_Y1_JOINED_PHASED_METHYLATION_ROUTE: '',
    LR_Y1_SOURCE_LABELLED_COMPATIBILITY_ROUTE: JSON.stringify({ database: raw.database,
      run_id: raw.route_run_id, receipt_path: rawPath, compatibility_receipt_path: receiptPath,
      compatibility_receipt_sha256: hash(receiptPath) }),
  }, null, 2) + '\n', { flag: 'wx' })
  return receipt
}
if (require.main === module) {
  if (process.argv.length !== 4) throw new Error('Usage: generate.ts POSTLOAD-INPUT.json NEW-OUTPUT-DIRECTORY')
  generate(process.argv[2], process.argv[3])
}

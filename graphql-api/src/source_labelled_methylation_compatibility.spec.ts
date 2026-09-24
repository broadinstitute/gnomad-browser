import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  resolveSourcePhasedMethylationRoute, readSourcePhasedMethylationServingReceipt,
  sha256File, SOURCE_PHASED_SERVING_RECEIPT_SHA256,
} from './source_phased_methylation_config'
import { SOURCE_LABELLED_SCHEMA, validateSourceLabelledCompatibilityReceipt } from './source_labelled_methylation_compatibility'
import { JOINED_PHASED_ORIENTATION_RECEIPT_SHA256, resolveJoinedPhasedMethylationRoute } from './joined_phased_methylation_config'
import { phasedMethylationCapability, sourcePhasedEvaluationScope, sourcePhasedMethylationRecords } from './graphql/resolvers/ancillary-availability'
import { generate } from '../../development/source-labelled-methylation/generate'

const config = path.resolve(__dirname, '../config')
const rawPath = path.join(config, 'y1-source-phased-methylation-serving-receipt.json')
const raw = readSourcePhasedMethylationServingReceipt(rawPath)
const load = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const hash = (p: string) => sha256File(p, 'fixture')
const clone = (v: any) => JSON.parse(JSON.stringify(v))
let dir: string
let inputPath: string
let receipt: any
let env: NodeJS.ProcessEnv
let inactive: NodeJS.ProcessEnv
const save = (name: string, value: any) => {
  const p = path.join(dir, name)
  writeFileSync(p, JSON.stringify(value))
  return p
}

describe.each(['v5', 'v6'])('isolated %s candidate', (version) => {
beforeAll(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'source-compat-SYNTHETIC-'))
  const database = `gnomad_lr_y1_scratch_${version}_synthetic_test`
  const roster = readFileSync(path.resolve(__dirname, '../../development/source-labelled-methylation/ordered-roster.txt'), 'utf8').trimEnd().split('\n')
  const bundle = load(path.join(config, 'y1-presentation-primary-manifests.json'))
  for (const m of bundle.entries) m.run_id = `synthetic-${m.cohort}-${m.chrom}`
  const primaryPath = save('primary.json', bundle)
  const runMap: any = { aou: {}, hgsvc_hprc: {} }
  for (const m of bundle.entries) runMap[m.cohort][m.chrom] = m.run_id
  const evidencePath = save('not-real-evidence.json', { synthetic: true })
  const evidenceFiles = [{ path: evidencePath, sha256: hash(evidencePath) }]
  const entries = bundle.entries.map((m: any) => {
    const headerPath = path.join(dir, `${m.cohort}-${m.chrom}.header.txt`)
    writeFileSync(headerPath, '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO' +
      (m.cohort === 'hgsvc_hprc' ? `\tFORMAT\t${roster.join('\t')}` : '') + '\n')
    return { cohort: m.cohort, chrom: m.chrom,
      header_evidence_path: save(`${m.cohort}-${m.chrom}.header.json`, { source: m.source,
        header_path: headerPath, header_sha256: hash(headerPath) }),
      acceptance_evidence_path: save(`${m.cohort}-${m.chrom}.accepted.json`, {
        database, cohort: m.cohort, chrom: m.chrom, run_id: m.run_id, manifest_sha256: m.manifest_sha256,
        source: m.source, status: 'accepted', evidence_files: evidenceFiles,
      }) }
  })
  inputPath = save('input.json', {
    database, primary_manifest_path: primaryPath, run_map_path: save('runs.json', runMap), entries,
    coordinate_evidence_path: save('coordinates.json', {
      status: 'verified', reference_genome: 'GRCh38', source_native: 'BED_0_BASED_HALF_OPEN_ONE_BASE',
      primary_native: 'VCF_1_BASED', transformation: 'none_source_positions_unchanged',
      primary_bundle_sha256: hash(primaryPath), source_manifest_sha256: raw.source_manifest_sha256,
      evidence_files: evidenceFiles,
    }),
    physical_evidence_path: save('physical.json', {
      database: raw.database, run_id: raw.route_run_id, serving_receipt_sha256: SOURCE_PHASED_SERVING_RECEIPT_SHA256,
      tables: [{ name: raw.table, engine: 'MergeTree', partition_key: 'chrom',
        sorting_key: 'chrom, pos1, sample_id, source_haplotype, stable_key',
        create_table_query: 'CONSTRAINT source_haplotype_is_1_or_2 CHECK source_haplotype IN (1, 2) ' +
          'CONSTRAINT one_base_bed_interval CHECK pos2 = (pos1 + 1) ' +
          'CONSTRAINT methylation_percentage CHECK methylation >= 0 AND methylation <= 100' }],
      columns: SOURCE_LABELLED_SCHEMA.map(([name, type], i) => ({ name, type, position: i + 1 })),
      parts: raw.contigs.map(({ chrom, rows }) => ({ chrom, rows: String(rows) })),
    }),
  })
  const output = path.join(dir, 'generated')
  receipt = generate(inputPath, output)
  inactive = load(path.join(output, 'candidate-env.INACTIVE.json'))
  env = { ...inactive, LR_Y1_SOURCE_LABELLED_COMPATIBILITY_CANDIDATE_ENABLED: 'true' }
})
afterAll(() => rmSync(dir, { recursive: true, force: true }))

test('offline generator emits inactive config; explicit opt-in retains all immutable source identities', () => {
  expect(() => resolveSourcePhasedMethylationRoute(inactive)).toThrow('candidate flag')
  const route = resolveSourcePhasedMethylationRoute(env)!
  expect(route.receipt).toEqual(raw)
  expect(route.compatibility?.source_labelled_only).toBe(true)
  expect(route.compatibility?.ordered_sample_ids).toHaveLength(292)
  expect(route.compatibility?.source_availability.filter((s) => s.status === 'source_present')).toHaveLength(231)
  expect(route.compatibility?.source_availability.filter((s) => s.status === 'no_methylation_output')).toHaveLength(61)
  expect(route.receipt.browser_primary_vcf_manifest_bundle_sha256).not.toBe(receipt.primary.bundle_sha256)
})

test.each([
  ['cohort', (r: any) => { r.cohort = 'aou' }],
  ['reference', (r: any) => { r.reference_genome = 'GRCh37' }],
  ['status', (r: any) => { r.status = 'pending' }],
  ['boolean type', (r: any) => { r.source_labelled_only = 'true' }],
  ['version type', (r: any) => { r.schema_version = '1' }],
  ['joined', (r: any) => { r.vcf_orientation_joined = true }],
  ['strand', (r: any) => { r.vcf_strand_binding = 1 }],
  ['phase set', (r: any) => { r.phase_set_binding = '123' }],
  ['source hash', (r: any) => { r.source_product.source_manifest_sha256 = 'a'.repeat(64) }],
  ['original hash', (r: any) => { r.source_product.original_primary_bundle_sha256 = r.primary.bundle_sha256 }],
  ['completion hash', (r: any) => { r.source_product.completion_receipt_sha256 = 'b'.repeat(64) }],
  ['serving hash', (r: any) => { r.source_product.serving_receipt_sha256 = 'b'.repeat(64) }],
  ['source DB', (r: any) => { r.source_product.database = r.primary.database }],
  ['source run', (r: any) => { r.source_product.run_id = 'new' }],
  ['new primary hash', (r: any) => { r.primary.bundle_sha256 = 'a'.repeat(64) }],
  ['primary DB', (r: any) => { r.primary.database = 'gnomad_lr_y1_live' }],
  ['primary cohort array', (r: any) => { r.primary.entries[0].cohort = [r.primary.entries[0].cohort] }],
  ['primary chrom array', (r: any) => { r.primary.entries[0].chrom = [r.primary.entries[0].chrom] }],
  ['primary nested arrays', (r: any) => {
    r.primary.entries[0].cohort = [[r.primary.entries[0].cohort]]
    r.primary.entries[0].chrom = [[r.primary.entries[0].chrom]]
  }],
  ['HGSVC cohort arrays bypass roster', (r: any) => {
    for (const entry of r.primary.entries.filter((e: any) => e.cohort === 'hgsvc_hprc')) {
      entry.cohort = ['hgsvc_hprc']
      entry.ordered_roster_sha256 = null
    }
  }],
  ['primary run', (r: any) => { r.primary.entries[0].run_id = 'wrong' }],
  ['primary status', (r: any) => { r.primary.entries[0].status = 'loading' }],
  ['primary entry roster', (r: any) => { r.primary.entries.find((e: any) => e.cohort === 'hgsvc_hprc').ordered_roster_sha256 = null }],
  ['duplicate primary', (r: any) => { r.primary.entries[0] = r.primary.entries[1] }],
  ['missing primary', (r: any) => { r.primary.entries.pop() }],
  ['roster order', (r: any) => { r.ordered_sample_ids.reverse() }],
  ['roster member', (r: any) => { r.ordered_sample_ids[0] = 'missing' }],
  ['subset status', (r: any) => { r.source_availability[0].status = 'source_present' }],
  ['availability type', (r: any) => { r.source_availability[0].status = true }],
  ['native coordinate', (r: any) => { r.coordinates.source_native = 'VCF_1_BASED' }],
  ['coordinate status', (r: any) => { r.coordinates.status = 'unverified' }],
  ['schema', (r: any) => { r.physical.columns[0][1] = 'String' }],
  ['count', (r: any) => { r.physical.partitions[0].rows-- }],
  ['count type', (r: any) => { r.physical.detail_rows = String(r.physical.detail_rows) }],
  ['physical status', (r: any) => { r.physical.status = 'pending' }],
  ['limits', (r: any) => { r.limits.chrY = 'measured' }],
  ['unknown field', (r: any) => { r.orientation_approved = true }],
])('rejects incompatible %s', (_label, mutate) => {
  const changed = clone(receipt)
  ;(mutate as (r: any) => void)(changed)
  expect(() => validateSourceLabelledCompatibilityReceipt(changed, raw, env)).toThrow()
})

test.each([undefined, 'false', '1', 'TRUE'])('candidate flag %s cannot admit route', (flag) => {
  expect(() => resolveSourcePhasedMethylationRoute({ ...env,
    LR_Y1_SOURCE_LABELLED_COMPATIBILITY_CANDIDATE_ENABLED: flag })).toThrow('candidate flag')
})

test.each([
  'gnomad_lr_y1_scratch_v4_test', 'gnomad_lr_y1_scratch_v7_test',
  'gnomad_lr_y1_scratch_v56_test', 'gnomad_lr_y1_scratch_v6_',
  'gnomad_lr_y1_scratch_v5_current', 'gnomad_lr_y1_scratch_v6_current',
  'gnomad_lr_y1_scratch_v6_test_current', 'gnomad_lr_y1_live',
  'gnomad_lr_y1_current', 'other_scratch_v6_test', 'gnomad_lr_y1_production_v6_test',
])('rejects unsupported database %s even with matching env', (database) => {
  const changed = clone(receipt)
  changed.primary.database = database
  expect(() => validateSourceLabelledCompatibilityReceipt(changed, raw,
    { ...env, LR_Y1_CLICKHOUSE_DATABASE: database })).toThrow('isolated candidate primary database')
})

test('requires exact candidate database env and refuses original bundle reuse', () => {
  expect(() => validateSourceLabelledCompatibilityReceipt(receipt, raw,
    { ...env, LR_Y1_CLICKHOUSE_DATABASE: undefined })).toThrow('isolated candidate primary database')
  expect(() => validateSourceLabelledCompatibilityReceipt(receipt, raw,
    { ...env, LR_Y1_CLICKHOUSE_DATABASE: 'gnomad_lr_y1_scratch_v6_other' })).toThrow('isolated candidate primary database')
  const changed = clone(receipt)
  const originalBundle = path.join(config, 'y1-presentation-primary-manifests.json')
  changed.primary.bundle_sha256 = hash(originalBundle)
  expect(() => validateSourceLabelledCompatibilityReceipt(changed, raw,
    { ...env, LR_Y1_PRIMARY_MANIFEST_PATH: originalBundle })).toThrow('new primary bundle mismatch')
})

test('old route remains old-bundle strict; candidate route cannot enable joined admission', () => {
  const legacy = JSON.stringify({ database: raw.database, run_id: raw.route_run_id, receipt_path: rawPath })
  expect(() => resolveSourcePhasedMethylationRoute({ ...env, LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE: legacy })).toThrow('mutually exclusive')
  expect(() => resolveSourcePhasedMethylationRoute({ ...env,
    LR_Y1_SOURCE_LABELLED_COMPATIBILITY_ROUTE: '', LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE: legacy })).toThrow('VCF bundle')
  expect(resolveJoinedPhasedMethylationRoute(env)).toBeNull()
  expect(() => resolveJoinedPhasedMethylationRoute({ ...env,
    LR_Y1_JOINED_PHASED_METHYLATION_ROUTE: JSON.stringify({ database: raw.database,
      run_id: raw.route_run_id, raw_receipt_path: rawPath,
      orientation_receipt_path: path.join(config, 'y1-source-to-browser-vcf-orientation-receipt.json'),
      expected_orientation_receipt_sha256: JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
    }) })).toThrow('browser VCF bundle')
  expect(() => resolveSourcePhasedMethylationRoute({ ...env,
    LR_Y1_JOINED_PHASED_METHYLATION_ROUTE: '{}' })).toThrow('cannot enable a joined')
})

test('route hash, roster and current run map fail closed', () => {
  const route = JSON.parse(env.LR_Y1_SOURCE_LABELLED_COMPATIBILITY_ROUTE!)
  expect(() => resolveSourcePhasedMethylationRoute({ ...env,
    LR_Y1_SOURCE_LABELLED_COMPATIBILITY_ROUTE: JSON.stringify({ ...route, compatibility_receipt_sha256: 'f'.repeat(64) }) })).toThrow('hash mismatch')
  const map = JSON.parse(env.LR_Y1_RUN_MAP!)
  map.hgsvc_hprc.chr1 = 'wrong'
  expect(() => resolveSourcePhasedMethylationRoute({ ...env, LR_Y1_RUN_MAP: JSON.stringify(map) })).toThrow('configured run')
})

test('candidate exposes only standalone unjoined sparse observations and honest missingness', () => {
  const route = resolveSourcePhasedMethylationRoute(env)!
  const capability = phasedMethylationCapability('hgsvc_hprc', route)
  expect(capability).toMatchObject({ available: true, joinable_to_vcf: false, orientation_status: 'UNCONFIRMED' })
  expect(capability.reason).toMatch(/raw route does not establish VCF\/copy alignment/)
  expect(capability.reason).toMatch(/partial\/skip\/no-assay/)
  expect(phasedMethylationCapability('aou', route).available).toBe(false)
  expect(() => phasedMethylationCapability(undefined, route)).toThrow('cohort')
  expect(() => sourcePhasedEvaluationScope('chr22', 0, 100, 'HG00097', route)).not.toThrow()
  for (const chrom of ['X', 'Y']) expect(() => sourcePhasedEvaluationScope(chrom, 0, 100, 'HG00097', route)).toThrow('unavailable')
  expect(() => sourcePhasedEvaluationScope('chr22', 0, 100, 'HG00096', route)).toThrow('sample')
  expect(() => sourcePhasedEvaluationScope('chr22', 0, 99999, 'HG00097', route)).not.toThrow()
  expect(() => sourcePhasedEvaluationScope('chr22', 0, 100000, 'HG00097', route)).toThrow('100kb')
  expect(sourcePhasedMethylationRecords([{ chr: 'chr22', pos1: 1, pos2: 2, sample: 'HG00097',
    methylation: 50, coverage: 3, source_haplotype: 1, vcf_strand: 1, phase_set: 'bad' }])[0]).toMatchObject({
    data_layer: 'SOURCE_PHASED', source_haplotype: 'HAP1', vcf_strand: null, phase_set: null,
  })
})

test('generator refuses incomplete post-load inputs and never overwrites output', () => {
  expect(() => generate(inputPath, path.join(dir, 'generated'))).toThrow()
  const input = load(inputPath)
  input.entries.pop()
  expect(() => generate(save('incomplete.json', input), path.join(dir, 'must-not-exist'))).toThrow('48 evidence')
  const badPhysical = load(load(inputPath).physical_evidence_path)
  badPhysical.columns[0].type = 'String'
  const badInput = { ...load(inputPath), physical_evidence_path: save('bad-physical.json', badPhysical) }
  expect(() => generate(save('bad-input.json', badInput), path.join(dir, 'must-not-exist'))).toThrow('schema')
})
})

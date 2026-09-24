import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import {
  LOCAL_JOINED_ORIENTATION_RECEIPT_SHA256,
  resolveJoinedPhasedMethylationRoute,
} from './joined_phased_methylation_config'
import { resolveY1PrimaryManifests } from './y1_admission_config'
import { resolveY1PrimaryRunMap } from './y1_config'
import {
  object, exactKeys, nonemptyString, sha256File,
  SOURCE_PHASED_METHYLATION_DATABASE, SOURCE_PHASED_METHYLATION_RUN_ID,
  SOURCE_PHASED_METHYLATION_TABLE, SOURCE_PHASED_SERVING_RECEIPT_SHA256,
  SOURCE_PHASED_COMPLETION_RECEIPT_SHA256, SOURCE_PHASED_SOURCE_MANIFEST_SHA256,
  SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256,
  type SourcePhasedMethylationRoute, type SourcePhasedMethylationServingReceipt,
} from './source_phased_methylation_config'

// Deliberately separate from the immutable v3 approval above. No scientific
// orientation decision is accepted by this mechanical compatibility contract.
export const SOURCE_LABELLED_ROSTER_SHA256 =
  '297ed617dda7aaff9f9d920d41a8a340244fd315b5e212f16eff111787b264d8'
export const SOURCE_LABELLED_LIMITS = {
  consumer: 'standalone_source_labelled_only',
  joined_candidate: 'unavailable_requires_separate_exact_vcf_orientation_evidence',
  autosomes: 'sparse_observations_not_complete_assay_or_reference_calls',
  chrX: '114_source_samples_preserved_but_sample_contig_membership_not_bound_query_unavailable',
  chrY: 'no_source_data',
  source_absent: 'no_methylation_output_not_zero',
  sample_total_status: 'separate_product_partial_skip_and_no_assay_statuses_not_promoted',
} as const

export const SOURCE_LABELLED_SCHEMA = [
  ['stable_key', 'FixedString(64)'], ['chrom', 'LowCardinality(String)'],
  ['pos1', 'UInt32'], ['pos2', 'UInt32'], ['sample_id', 'LowCardinality(String)'],
  ['source_haplotype', 'UInt8'], ['methylation', 'Float32'], ['coverage', 'UInt32'],
]

type CompatibilityPrimaryEntry = {
  cohort: 'aou' | 'hgsvc_hprc'
  chrom: string
  run_id: string
  manifest_sha256: string
  status: 'accepted'
  acceptance_evidence_sha256: string
  header_sha256: string
  ordered_roster_sha256: string | null
}
export type SourceLabelledCompatibilityReceipt = {
  schema_version: 1
  format: 'source_labelled_methylation_candidate_compatibility_v1'
  status: 'candidate_compatible'
  source_labelled_only: true
  vcf_orientation_joined: false
  vcf_strand_binding: null
  phase_set_binding: null
  cohort: 'hgsvc_hprc'
  reference_genome: 'GRCh38'
  source_product: {
    database: string; run_id: string; table: string
    serving_receipt_sha256: string; completion_receipt_sha256: string
    source_manifest_sha256: string; original_primary_bundle_sha256: string
  }
  primary: { database: string; bundle_sha256: string; entries: CompatibilityPrimaryEntry[] }
  coordinates: {
    status: 'verified'; reference_genome: 'GRCh38'
    source_native: 'BED_0_BASED_HALF_OPEN_ONE_BASE'
    primary_native: 'VCF_1_BASED'; transformation: 'none_source_positions_unchanged'
    evidence_sha256: string
  }
  ordered_sample_ids: string[]
  ordered_roster_sha256: string
  source_availability: { sample_id: string; status: 'source_present' | 'no_methylation_output' }[]
  physical: {
    status: 'verified'; evidence_sha256: string; engine: 'MergeTree'
    partition_key: 'chrom'; sorting_key: 'chrom,pos1,sample_id,source_haplotype,stable_key'
    columns: string[][]; partitions: { chrom: string; rows: number }[]
    detail_rows: number
  }
  limits: typeof SOURCE_LABELLED_LIMITS
}

const digest = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a SHA256 digest`)
  }
  return value
}
const same = (actual: unknown, expected: unknown, label: string) => {
  // Object order is immaterial; array order (notably the 292 roster) is not.
  const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v
  if (JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(expected))) {
    throw new Error(`Source-labelled compatibility ${label} mismatch`)
  }
}

export const validateSourceLabelledCompatibilityReceipt = (
  value: unknown,
  receipt: SourcePhasedMethylationServingReceipt,
  env: NodeJS.ProcessEnv
): SourceLabelledCompatibilityReceipt => {
  const r = object(value, 'source-labelled compatibility receipt')
  exactKeys(r, ['schema_version', 'format', 'status', 'source_labelled_only',
    'vcf_orientation_joined', 'vcf_strand_binding', 'phase_set_binding', 'cohort',
    'reference_genome', 'source_product', 'primary', 'coordinates', 'ordered_sample_ids',
    'ordered_roster_sha256', 'source_availability', 'physical', 'limits'], 'compatibility receipt')
  same(Object.fromEntries(['schema_version', 'format', 'status', 'source_labelled_only',
    'vcf_orientation_joined', 'vcf_strand_binding', 'phase_set_binding', 'cohort',
    'reference_genome'].map((key) => [key, r[key]])), {
    schema_version: 1, format: 'source_labelled_methylation_candidate_compatibility_v1',
    status: 'candidate_compatible', source_labelled_only: true, vcf_orientation_joined: false,
    vcf_strand_binding: null, phase_set_binding: null, cohort: 'hgsvc_hprc', reference_genome: 'GRCh38',
  }, 'contract')
  same(r.source_product, {
    database: SOURCE_PHASED_METHYLATION_DATABASE, run_id: SOURCE_PHASED_METHYLATION_RUN_ID,
    table: SOURCE_PHASED_METHYLATION_TABLE, serving_receipt_sha256: SOURCE_PHASED_SERVING_RECEIPT_SHA256,
    completion_receipt_sha256: SOURCE_PHASED_COMPLETION_RECEIPT_SHA256,
    source_manifest_sha256: SOURCE_PHASED_SOURCE_MANIFEST_SHA256,
    original_primary_bundle_sha256: SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256,
  }, 'immutable source product')
  const primary = object(r.primary, 'compatibility primary')
  exactKeys(primary, ['database', 'bundle_sha256', 'entries'], 'compatibility primary')
  const database = nonemptyString(primary.database, 'candidate primary database')
  if (!/^gnomad_lr_y1_scratch_v[56]_[a-z0-9_]+$/.test(database) || database.endsWith('_current') ||
      database !== env.LR_Y1_CLICKHOUSE_DATABASE) {
    throw new Error('Source-labelled compatibility requires the isolated candidate primary database')
  }
  const bundleHash = sha256File(nonemptyString(env.LR_Y1_PRIMARY_MANIFEST_PATH,
    'LR_Y1_PRIMARY_MANIFEST_PATH'), 'candidate primary bundle')
  if (primary.bundle_sha256 !== bundleHash || bundleHash === SOURCE_PHASED_BROWSER_VCF_BUNDLE_SHA256) {
    throw new Error('Source-labelled compatibility new primary bundle mismatch')
  }
  const manifests = resolveY1PrimaryManifests(resolveY1PrimaryRunMap(env), env)
  if (!manifests || manifests.size !== 48 || !Array.isArray(primary.entries) || primary.entries.length !== 48) {
    throw new Error('Source-labelled compatibility requires all 48 selected primary runs')
  }
  const seen = new Set<string>()
  for (const value of primary.entries) {
    const entry = object(value, 'compatibility primary entry')
    exactKeys(entry, ['cohort', 'chrom', 'run_id', 'manifest_sha256', 'status',
      'acceptance_evidence_sha256', 'header_sha256', 'ordered_roster_sha256'], 'compatibility primary entry')
    if ((entry.cohort !== 'hgsvc_hprc' && entry.cohort !== 'aou') || typeof entry.chrom !== 'string') {
      throw new Error('Source-labelled compatibility primary cohort/chrom must be primitive strings')
    }
    const key = `${entry.cohort}\u0000${entry.chrom}`
    const manifest = manifests.get(key)
    if (seen.has(key) || !manifest || entry.cohort !== manifest.cohort || entry.chrom !== manifest.chrom ||
        entry.run_id !== manifest.run_id ||
        entry.manifest_sha256 !== manifest.manifest_sha256 || entry.status !== 'accepted' ||
        entry.ordered_roster_sha256 !== (entry.cohort === 'hgsvc_hprc' ? SOURCE_LABELLED_ROSTER_SHA256 : null)) {
      throw new Error('Source-labelled compatibility primary identity/status/roster mismatch')
    }
    digest(entry.acceptance_evidence_sha256, 'primary acceptance evidence')
    digest(entry.header_sha256, 'primary header evidence')
    seen.add(key)
  }
  const coordinates = object(r.coordinates, 'compatibility coordinates')
  same(coordinates, {
    status: 'verified', reference_genome: 'GRCh38', source_native: 'BED_0_BASED_HALF_OPEN_ONE_BASE',
    primary_native: 'VCF_1_BASED', transformation: 'none_source_positions_unchanged',
    evidence_sha256: digest(coordinates.evidence_sha256, 'native coordinate evidence'),
  }, 'coordinates')
  if (!Array.isArray(r.ordered_sample_ids) || r.ordered_sample_ids.length !== 292 ||
      r.ordered_sample_ids.some((s) => typeof s !== 'string' || !/^[A-Za-z0-9_-]+$/.test(s)) ||
      new Set(r.ordered_sample_ids).size !== 292 || r.ordered_roster_sha256 !== SOURCE_LABELLED_ROSTER_SHA256 ||
      createHash('sha256').update(`${r.ordered_sample_ids.join('\n')}\n`).digest('hex') !== SOURCE_LABELLED_ROSTER_SHA256) {
    throw new Error('Source-labelled compatibility ordered 292 roster mismatch')
  }
  const source = new Set(receipt.source_sample_ids)
  if (receipt.source_sample_ids.some((s) => !(r.ordered_sample_ids as string[]).includes(s))) {
    throw new Error('Source-labelled compatibility source roster is not a primary subset')
  }
  same(r.source_availability, r.ordered_sample_ids.map((sample_id) => ({ sample_id,
    status: source.has(sample_id) ? 'source_present' : 'no_methylation_output',
  })), 'source availability subset/status')
  const physical = object(r.physical, 'compatibility physical')
  same(physical, {
    status: 'verified', evidence_sha256: digest(physical.evidence_sha256, 'physical evidence'),
    engine: 'MergeTree', partition_key: 'chrom',
    sorting_key: 'chrom,pos1,sample_id,source_haplotype,stable_key', columns: SOURCE_LABELLED_SCHEMA,
    partitions: receipt.contigs.map(({ chrom, rows }) => ({ chrom, rows })), detail_rows: receipt.detail_rows,
  }, 'schema/partition counts')
  same(r.limits, SOURCE_LABELLED_LIMITS, 'availability limits')
  return r as unknown as SourceLabelledCompatibilityReceipt
}

export const resolveSourceLabelledCompatibilityRoute = (
  raw: string, env: NodeJS.ProcessEnv,
  readSourcePhasedMethylationServingReceipt: (path: string) => SourcePhasedMethylationServingReceipt
): SourcePhasedMethylationRoute => {
  if (env.LR_Y1_SOURCE_LABELLED_COMPATIBILITY_CANDIDATE_ENABLED !== 'true') {
    throw new Error('Source-labelled compatibility candidate flag must be explicitly true')
  }
  // Compatibility itself never supplies orientation. Only the separately pinned,
  // explicit local assumption may coexist; it still goes through joined preflight.
  let separatelyApprovedJoined = null
  if ((env.LR_Y1_JOINED_PHASED_METHYLATION_ROUTE || '').trim()) {
    try {
      separatelyApprovedJoined = resolveJoinedPhasedMethylationRoute(env)
      if (separatelyApprovedJoined?.orientation_receipt_sha256 !== LOCAL_JOINED_ORIENTATION_RECEIPT_SHA256)
        throw new Error('not the separate local assumption')
    } catch (error: any) {
      throw new Error(`Source-labelled compatibility cannot enable a joined VCF route without the separate exact local assumption: ${error.message}`)
    }
  }
  const route = object(JSON.parse(raw), 'source-labelled compatibility route')
  exactKeys(route, ['database', 'run_id', 'receipt_path', 'compatibility_receipt_path',
    'compatibility_receipt_sha256'], 'source-labelled compatibility route')
  const receipt_path = nonemptyString(route.receipt_path, 'original source receipt path')
  if (route.database !== SOURCE_PHASED_METHYLATION_DATABASE || route.run_id !== SOURCE_PHASED_METHYLATION_RUN_ID ||
      sha256File(receipt_path, 'original source receipt') !== SOURCE_PHASED_SERVING_RECEIPT_SHA256) {
    throw new Error('Source-labelled compatibility must preserve the pinned v3 product receipt')
  }
  if (separatelyApprovedJoined && separatelyApprovedJoined.raw_receipt_path !== receipt_path)
    throw new Error('Separate joined assumption must bind the exact configured raw receipt path')
  const receipt = readSourcePhasedMethylationServingReceipt(receipt_path)
  const compatibilityPath = nonemptyString(route.compatibility_receipt_path, 'compatibility receipt path')
  if (sha256File(compatibilityPath, 'compatibility receipt') !==
      digest(route.compatibility_receipt_sha256, 'compatibility receipt hash')) {
    throw new Error('Source-labelled compatibility receipt hash mismatch')
  }
  const compatibility = validateSourceLabelledCompatibilityReceipt(
    JSON.parse(readFileSync(compatibilityPath, 'utf8')), receipt, env)
  return { database: SOURCE_PHASED_METHYLATION_DATABASE, run_id: SOURCE_PHASED_METHYLATION_RUN_ID,
    receipt_path, receipt, compatibility }
}

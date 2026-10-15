import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
  LOCAL_JOINED_ORIENTATION_RECEIPT_SHA256,
  LOCAL_JOINED_BROWSER_BUNDLE_SHA256,
  readJoinedPhasedMethylationOrientationReceipt,
  reconcileJoinedOrientationRoster,
  resolveJoinedPhasedMethylationRoute,
} from './joined_phased_methylation_config'

const root = path.resolve(__dirname, '../..')
const orientationPath = path.join(
  root,
  'graphql-api/config/y1-source-to-browser-vcf-orientation-receipt.json'
)
const rawPath = path.join(
  root,
  'graphql-api/config/y1-source-phased-methylation-serving-receipt.json'
)
const primaryPath = path.join(root, 'graphql-api/config/y1-presentation-primary-manifests.json')

const routeEnv = (receiptPath = orientationPath) => ({
  LR_Y1_PRIMARY_MANIFEST_PATH: primaryPath,
  LR_Y1_JOINED_PHASED_METHYLATION_ROUTE: JSON.stringify({
    database: 'gnomad_lr_y1_methylation_source_haplotype_full_genome_20260803_v3',
    run_id: 'y1-hgsvc-hprc-methylation-source-haplotype-full-genome-20260803-v3-source-labelled-v1',
    raw_receipt_path: rawPath,
    orientation_receipt_path: receiptPath,
    expected_orientation_receipt_sha256: JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
  }),
})

describe('joined phased methylation configuration', () => {
  // SYNTHETIC PARSER FIXTURE ONLY: derived from the tracked historical receipt,
  // not the real local decision or refreshed VCF identities. Never route-admissible.
  const localPath = path.join(mkdtempSync(path.join(tmpdir(), 'synthetic-local-joined-')), 'receipt.json')
  beforeAll(() => {
    const synthetic = JSON.parse(readFileSync(orientationPath, 'utf8'))
    synthetic.receipt_id = 'SYNTHETIC_TEST_ONLY_NOT_AN_APPROVAL'
    synthetic.browser_product.primary_manifest_bundle_sha256 = LOCAL_JOINED_BROWSER_BUNDLE_SHA256
    Object.assign(synthetic.approval_basis, {
      scope: `SYNTHETIC LOCAL PARSER TEST ONLY ${LOCAL_JOINED_BROWSER_BUNDLE_SHA256}`,
      approved_at: '2026-09-24',
      decision_artifact_sha256: '6935dd8b80ba640ee91738567c8333404028120480666dc792b8d835578ba111',
      decision_artifact_ref:
        'flow://rolling/enable-local-joined-methylation-under-explicit-unc-f1615509/operator-approval.json',
      production_release_gate: 'SYNTHETIC TEST ONLY: no local or production authorization',
    })
    writeFileSync(localPath, JSON.stringify(synthetic))
  })
  const localEnv = (receiptPath = localPath) => ({
    ...routeEnv(receiptPath),
    NODE_ENV: 'development',
    LR_Y1_LOCAL_JOINED_MAPPING_ASSUMPTION_ENABLED: 'true',
    LR_Y1_CLICKHOUSE_URL: 'http://reader@127.0.0.1:8128',
    LR_Y1_CLICKHOUSE_DATABASE: 'gnomad_lr_y1_scratch_v6_refresh_20260923_nullable_af',
    LR_Y1_JOINED_PHASED_METHYLATION_ROUTE: JSON.stringify({
      ...JSON.parse(routeEnv(receiptPath).LR_Y1_JOINED_PHASED_METHYLATION_ROUTE),
      expected_orientation_receipt_sha256: LOCAL_JOINED_ORIENTATION_RECEIPT_SHA256,
    }),
  })

  test('parses synthetic local approval fields but never admits synthetic bytes as an approval', () => {
    const receipt = readJoinedPhasedMethylationOrientationReceipt(localPath)
    const old = readJoinedPhasedMethylationOrientationReceipt(orientationPath)
    expect(receipt.browser_product.primary_manifest_bundle_sha256).toBe(LOCAL_JOINED_BROWSER_BUNDLE_SHA256)
    expect(receipt.approval_basis).toMatchObject({
      kind: 'operator_direct_mapping_assumption', independently_machine_verified_lineage: false,
      intermediate_objects_available_for_verification: false, cryptographic_human_signature: false,
    })
    expect(receipt.approval_basis.scope).toContain('LOCAL')
    expect(receipt.source_product).toEqual(old.source_product)
    expect(receipt.coverage).toEqual(old.coverage)
    expect(receipt.mapping_contract).toEqual(old.mapping_contract)
    expect(receipt.receipt_id).toBe('SYNTHETIC_TEST_ONLY_NOT_AN_APPROVAL')
    expect(receipt.browser_product.entries).toEqual(old.browser_product.entries)
    // Neither the local nor historical pinned route accepts this parser-only fixture.
    expect(() => resolveJoinedPhasedMethylationRoute(localEnv())).toThrow('exact approved receipt/product')
    expect(() => resolveJoinedPhasedMethylationRoute(routeEnv(localPath))).toThrow('exact approved receipt/product')

    const changedPath = path.join(path.dirname(localPath), 'changed-decision.json')
    for (const key of ['decision_artifact_sha256', 'decision_artifact_ref', 'approved_at']) {
      const changed = JSON.parse(readFileSync(localPath, 'utf8'))
      changed.approval_basis[key] = key.endsWith('sha256') ? '0'.repeat(64) : 'SYNTHETIC_WRONG_DECISION'
      writeFileSync(changedPath, JSON.stringify(changed))
      expect(() => readJoinedPhasedMethylationOrientationReceipt(changedPath)).toThrow()
    }
    const changed = JSON.parse(readFileSync(localPath, 'utf8'))
    changed.browser_product.primary_manifest_bundle_sha256 = '0'.repeat(64)
    writeFileSync(changedPath, JSON.stringify(changed))
    expect(() => readJoinedPhasedMethylationOrientationReceipt(changedPath)).toThrow()
  })

  test.each([
    ['NODE_ENV', 'production'], ['LR_Y1_LOCAL_JOINED_MAPPING_ASSUMPTION_ENABLED', 'false'],
    ['LR_Y1_CLICKHOUSE_URL', 'http://192.168.0.124:8123'],
    ['LR_Y1_CLICKHOUSE_DATABASE', 'different_database'],
  ])('refuses refreshed assumption outside explicit local scope: %s', (key, value) => {
    expect(() => resolveJoinedPhasedMethylationRoute({ ...localEnv(), [key]: value })).toThrow('explicit local development clone opt-in')
  })

  test('does not accept changed receipt bytes even with the local flag', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'local-joined-'))
    const mutated = path.join(dir, 'receipt.json')
    writeFileSync(mutated, readFileSync(localPath, 'utf8').replace('CHROMOSOME_WIDE', 'PHASE_BLOCK'))
    expect(() => resolveJoinedPhasedMethylationRoute(localEnv(mutated))).toThrow('exact approved receipt/product')
  })

  test('admits the exact direct operator-approved receipt and complete roster', () => {
    const receipt = readJoinedPhasedMethylationOrientationReceipt(orientationPath)
    expect(receipt.mapping_contract).toMatchObject({
      scope: 'CHROMOSOME_WIDE',
      source_hap1_vcf_strand: 1,
      source_hap2_vcf_strand: 2,
      parental_homolog_claim: false,
    })
    expect(receipt.approval_basis).toMatchObject({
      approved_role: 'gnomAD-LR operator',
      approved_at: '2026-08-06T14:57:45.89893-04:00',
      decision_artifact_sha256: 'ac8224a72ae98298e55be7debde87bd40c39840cd691a4fa169ce653d5a61df6',
      independently_machine_verified_lineage: false,
      cryptographic_human_signature: false,
    })
    expect(receipt.approval_basis.production_release_gate).toContain('not independent scientific')
    expect(receipt.coverage.roster).toHaveLength(292)
    const sourceSampleIds = receipt.coverage.roster
      .filter((row) => row.source_status === 'source_present')
      .map((row) => row.sample_id)
    expect(sourceSampleIds).toHaveLength(231)
    expect(new Set(sourceSampleIds).size).toBe(231)
    expect(sourceSampleIds).toEqual([...sourceSampleIds].sort())
    expect(sourceSampleIds).toContain('HG00097')
    expect(sourceSampleIds).not.toEqual(expect.arrayContaining(['HG00096', 'HG00272']))
    expect(receipt.coverage.unsupported_contigs).toEqual(['chrX', 'chrY'])
    expect(receipt.exclusions).toEqual(
      expect.arrayContaining(['aou', 'chrX', 'chrY', 'source_absent', 'fallback'])
    )
    expect(receipt.browser_product.entries).toHaveLength(22)
    expect(resolveJoinedPhasedMethylationRoute(routeEnv())?.orientation_receipt_sha256).toBe(
      JOINED_PHASED_ORIENTATION_RECEIPT_SHA256
    )
    expect(() => resolveJoinedPhasedMethylationRoute({
      ...routeEnv(), LR_Y1_PRIMARY_MANIFEST_PATH: rawPath,
    })).toThrow('configured browser VCF bundle')
  })

  test('reconciles exact present IDs and rejects raw-roster substitutions or status drift', () => {
    const resolved = resolveJoinedPhasedMethylationRoute(routeEnv())!
    expect(() =>
      reconcileJoinedOrientationRoster(resolved.receipt, resolved.source_route.receipt)
    ).not.toThrow()

    const substitutedRaw = {
      ...resolved.source_route.receipt,
      source_sample_ids: [
        'HG00096',
        ...resolved.source_route.receipt.source_sample_ids.slice(1),
      ].sort(),
    }
    expect(() => reconcileJoinedOrientationRoster(resolved.receipt, substitutedRaw as any)).toThrow(
      'does not exactly match'
    )

    const statusDrift = JSON.parse(JSON.stringify(resolved.receipt))
    statusDrift.coverage.roster.find((row: any) => row.sample_id === 'HG00097').source_status =
      'no_methylation_output'
    expect(() =>
      reconcileJoinedOrientationRoster(statusDrift, resolved.source_route.receipt)
    ).toThrow('does not exactly match')
  })

  test('pins all 292 IDs/classifications, including source-absent substitutions', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'joined-roster-'))
    const mutated = path.join(dir, 'receipt.json')
    writeFileSync(
      mutated,
      readFileSync(orientationPath, 'utf8').replace(
        '"sample_id": "HG00096"',
        '"sample_id": "HG00095"'
      )
    )
    expect(() => readJoinedPhasedMethylationOrientationReceipt(mutated)).toThrow(
      'exact 292-sample roster/classification mismatch'
    )
  })

  test('is absent when unconfigured and fails closed for stale or mutated identity', () => {
    expect(resolveJoinedPhasedMethylationRoute({})).toBeNull()
    const invalidFields = {
      database: 'wrong_database',
      run_id: 'wrong_run',
      raw_receipt_path: orientationPath,
      orientation_receipt_path: rawPath,
      expected_orientation_receipt_sha256: '0'.repeat(64),
    }
    for (const [field, value] of Object.entries(invalidFields)) {
      const invalid = routeEnv()
      const route = JSON.parse(invalid.LR_Y1_JOINED_PHASED_METHYLATION_ROUTE)
      route[field] = value
      invalid.LR_Y1_JOINED_PHASED_METHYLATION_ROUTE = JSON.stringify(route)
      expect(() => resolveJoinedPhasedMethylationRoute(invalid)).toThrow()
    }

    const dir = mkdtempSync(path.join(tmpdir(), 'joined-methylation-'))
    const mutated = path.join(dir, 'receipt.json')
    writeFileSync(
      mutated,
      readFileSync(orientationPath, 'utf8').replace('CHROMOSOME_WIDE', 'PHASE_BLOCK')
    )
    expect(() => resolveJoinedPhasedMethylationRoute(routeEnv(mutated))).toThrow(
      'exact approved receipt/product'
    )
  })
})

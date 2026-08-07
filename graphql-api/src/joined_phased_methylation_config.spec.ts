import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
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
    const stale = routeEnv()
    stale.LR_Y1_JOINED_PHASED_METHYLATION_ROUTE =
      stale.LR_Y1_JOINED_PHASED_METHYLATION_ROUTE.replace(
        JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
        '0'.repeat(64)
      )
    expect(() => resolveJoinedPhasedMethylationRoute(stale)).toThrow(
      'exact approved receipt/product'
    )

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

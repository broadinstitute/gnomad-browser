import path from 'node:path'

import {
  readSourcePhasedMethylationServingReceipt,
  resolveSourcePhasedMethylationRoute,
} from './source_phased_methylation_config'

const root = path.resolve(__dirname, '../..')
const receiptPath = path.join(
  root,
  'graphql-api/config/y1-source-phased-methylation-serving-receipt.json'
)
const primaryManifestPath = path.join(
  root,
  'graphql-api/config/y1-presentation-primary-manifests.json'
)

describe('source-phased methylation serving configuration', () => {
  test('binds the exact source-only product, roster, completion, and browser VCF bundle', () => {
    const receipt = readSourcePhasedMethylationServingReceipt(receiptPath)
    expect(receipt.serving_mode).toBe('source_labelled_only')
    expect(receipt.serving_pointer).toBe(true)
    expect(receipt.vcf_orientation_joined).toBe(false)
    expect(receipt.phase_set_semantics).toBe('source_track_has_no_phase_set')
    expect(receipt.source_sample_ids).toHaveLength(231)
    expect(receipt.contigs).toHaveLength(23)
    expect(receipt.contigs.some(({ chrom }) => chrom === 'chrY')).toBe(false)
    expect(receipt.missing_orientation_evidence).toContain('exact immutable HGSVC/HPRC VCF/TBI')

    const route = resolveSourcePhasedMethylationRoute({
      LR_Y1_PRIMARY_MANIFEST_PATH: primaryManifestPath,
      LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE: JSON.stringify({
        database: receipt.database,
        run_id: receipt.route_run_id,
        receipt_path: receiptPath,
      }),
    })
    expect(route?.receipt.completion_receipt_sha256).toBe(
      'f259273f4c66ae18f80884cfbb6640a603e0708765a059a68e75bb1b85d23f85'
    )
  })

  test('fails closed for an absent route or a route identity mismatch', () => {
    expect(resolveSourcePhasedMethylationRoute({})).toBeNull()
    expect(() => resolveSourcePhasedMethylationRoute({
      LR_Y1_PRIMARY_MANIFEST_PATH: primaryManifestPath,
      LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE: JSON.stringify({
        database: 'gnomad_lr_y1_wrong',
        run_id: 'wrong',
        receipt_path: receiptPath,
      }),
    })).toThrow('does not exactly match')
  })
})

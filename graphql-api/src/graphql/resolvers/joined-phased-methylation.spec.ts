import path from 'node:path'

import {
  JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
  resolveJoinedPhasedMethylationRoute,
} from '../../joined_phased_methylation_config'
import {
  joinedPhasedCapability,
  joinedRegionScope,
  preflightJoinedPhasedMethylation,
  projectJoinedRows,
} from './joined-phased-methylation'

const root = path.resolve(__dirname, '../../../..')
const orientationPath = path.join(
  root,
  'graphql-api/config/y1-source-to-browser-vcf-orientation-receipt.json'
)
const rawPath = path.join(
  root,
  'graphql-api/config/y1-source-phased-methylation-serving-receipt.json'
)
const primaryPath = path.join(root, 'graphql-api/config/y1-presentation-primary-manifests.json')
const route = resolveJoinedPhasedMethylationRoute({
  LR_Y1_PRIMARY_MANIFEST_PATH: primaryPath,
  LR_Y1_JOINED_PHASED_METHYLATION_ROUTE: JSON.stringify({
    database: 'gnomad_lr_y1_methylation_source_haplotype_full_genome_20260803_v3',
    run_id: 'y1-hgsvc-hprc-methylation-source-haplotype-full-genome-20260803-v3-source-labelled-v1',
    raw_receipt_path: rawPath,
    orientation_receipt_path: orientationPath,
    expected_orientation_receipt_sha256: JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
  }),
})!

const primaryManifests = new Map(
  route.receipt.browser_product.entries.map((entry) => [
    `hgsvc_hprc\u0000${entry.chrom}`,
    {
      cohort: 'hgsvc_hprc',
      chrom: entry.chrom,
      run_id: entry.run_id,
      manifest_sha256: entry.manifest_sha256,
      primary_load_mode: 'standard',
      carrier_loading_status: 'available',
      tasks: [],
      source: {
        source_uri: entry.vcf.uri,
        source_generation: entry.vcf.generation,
        source_size_bytes: entry.vcf.size_bytes,
        source_checksum_algorithm: entry.vcf.checksum_algorithm,
        source_checksum: entry.vcf.checksum,
        source_index_uri: entry.tbi.uri,
        source_index_generation: entry.tbi.generation,
        source_index_size_bytes: entry.tbi.size_bytes,
        source_index_checksum_algorithm: entry.tbi.checksum_algorithm,
        source_index_checksum: entry.tbi.checksum,
      },
    },
  ])
) as any
const admittedSnapshot = async (_cohort: any, chrom?: string | null) =>
  ({
    database: 'primary',
    release: 'y1',
    cohort: 'hgsvc_hprc',
    reference_genome: 'GRCh38',
    chrom: chrom!,
    load_scope: 'full_chromosome',
    run_id: route.receipt.browser_product.entries.find((entry) => entry.chrom === chrom)!.run_id,
    state: 'accepted_tasks',
    metadata_run_id: null,
    carriers_available: true,
  } as any)

const projectionContract = {
  completed_sample_ids: ['HG00097'],
  chrom: 'chr22',
  start: 10,
  stop: 20,
  source_run_id: route.run_id,
  orientation_receipt_sha256: route.orientation_receipt_sha256,
}

const validRow = (overrides: Record<string, unknown> = {}) => ({
  source_row_key: 'a'.repeat(64),
  chr: 'chr22',
  pos1: 9,
  pos2: 10,
  sample: 'HG00097',
  methylation: 42,
  coverage: 8,
  source_haplotype: 1,
  vcf_strand: 1,
  ...overrides,
})

describe('joined phased methylation projection contract', () => {
  test('admits only exact raw, browser identity, run, and active carriers', async () => {
    await expect(
      preflightJoinedPhasedMethylation(
        route,
        route.source_route,
        primaryManifests,
        admittedSnapshot
      )
    ).resolves.toBeUndefined()
    await expect(
      preflightJoinedPhasedMethylation(route, null, primaryManifests, admittedSnapshot)
    ).rejects.toThrow('exact admitted raw')
    await expect(
      preflightJoinedPhasedMethylation(
        route,
        route.source_route,
        primaryManifests,
        async () =>
          ({ ...(await admittedSnapshot(null, 'chr1')), carriers_available: false } as any)
      )
    ).rejects.toThrow('active primary carriers')
  })

  test('accounts exactly for source-present, source-absent, and skipped samples', () => {
    const scope = joinedRegionScope(
      '22',
      100,
      100_099,
      ['HG00097', 'HG00096', 'HG00272'],
      JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
      route
    )
    expect(scope.requested_sample_ids).toEqual(['HG00097', 'HG00096', 'HG00272'])
    expect(scope.completed_sample_ids).toEqual(['HG00097'])
    expect(scope.unavailable_samples).toEqual([
      expect.objectContaining({ sample_id: 'HG00096', status: 'UNAVAILABLE_NO_ASSAY_SOURCE' }),
      expect.objectContaining({ sample_id: 'HG00272', status: 'UNAVAILABLE_SOURCE_MARKED_SKIP' }),
    ])
  })

  test('converts raw BED rows to the explicit canonical one-based joined contract', () => {
    expect(
      projectJoinedRows(
        [
          validRow(),
          validRow({
            source_row_key: 'b'.repeat(64),
            source_haplotype: 2,
            vcf_strand: 2,
            methylation: 43,
            coverage: 9,
          }),
        ],
        projectionContract
      )
    ).toEqual([
      expect.objectContaining({
        pos1: 10,
        pos2: 11,
        source_haplotype: 'HAP1',
        vcf_strand: 1,
        mapping_scope: 'CHROMOSOME_WIDE',
        phase_set: null,
      }),
      expect.objectContaining({
        pos1: 10,
        pos2: 11,
        source_haplotype: 'HAP2',
        vcf_strand: 2,
        mapping_scope: 'CHROMOSOME_WIDE',
        phase_set: null,
      }),
    ])
  })

  test('admits the first and last canonical CpG without left shift or stop+1 admission', () => {
    expect(
      projectJoinedRows(
        [validRow(), validRow({ source_row_key: 'b'.repeat(64), pos1: 19, pos2: 20 })],
        projectionContract
      ).map((row) => row.pos1)
    ).toEqual([10, 20])
    for (const row of [validRow({ pos1: 8, pos2: 9 }), validRow({ pos1: 20, pos2: 21 })])
      expect(() => projectJoinedRows([row], projectionContract)).toThrow(
        'row_outside_requested_range'
      )
  })

  test.each([
    ['duplicate source key', [validRow(), validRow({ source_haplotype: 2, vcf_strand: 2 })]],
    [
      'duplicate biological observation',
      [validRow(), validRow({ source_row_key: 'b'.repeat(64) })],
    ],
    ['wrong chromosome', [validRow({ chr: 'chr21' })]],
    ['sample outside completed set', [validRow({ sample: 'HG00099' })]],
    ['non-one-base BED row', [validRow({ pos2: 11 })]],
    ['haplotype/strand mismatch', [validRow({ vcf_strand: 2 })]],
    ['non-finite methylation', [validRow({ methylation: 'NaN' })]],
    ['out-of-range methylation', [validRow({ methylation: 101 })]],
    ['non-finite coverage', [validRow({ coverage: Infinity })]],
    ['negative coverage', [validRow({ coverage: -1 })]],
  ])('fails closed with a typed contract mismatch for %s', (_label, rows) => {
    try {
      projectJoinedRows(rows as any[], projectionContract)
      throw new Error('Expected projection to fail')
    } catch (error) {
      expect(error).toMatchObject({
        extensions: {
          code: 'JOINED_METHYLATION_CONTRACT_MISMATCH',
          joinedMethylationInternal: true,
          joinedMethylationSafeContext: expect.objectContaining({
            source_run_id: route.run_id,
            orientation_receipt_sha256: route.orientation_receipt_sha256,
          }),
        },
      })
    }
  })

  test('rejects duplicates, unknowns, stale receipts, zero-based starts, oversized requests, and overflow with typed errors', () => {
    const capture = (fn: () => unknown) => {
      try {
        fn()
      } catch (error) {
        return error
      }
      throw new Error('Expected function to throw')
    }
    expect(
      capture(() =>
        joinedRegionScope(
          'chr22',
          0,
          1,
          ['HG00097'],
          JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
          route
        )
      )
    ).toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
    expect(
      capture(() =>
        joinedRegionScope(
          'chr22',
          1,
          2,
          ['HG00097', 'HG00097'],
          JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
          route
        )
      )
    ).toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
    expect(
      capture(() =>
        joinedRegionScope(
          'chr22',
          1,
          2,
          ['UNKNOWN'],
          JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
          route
        )
      )
    ).toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
    expect(
      capture(() => joinedRegionScope('chr22', 1, 2, ['HG00097'], '0'.repeat(64), route))
    ).toMatchObject({
      extensions: { code: 'JOINED_METHYLATION_CONTRACT_MISMATCH', isUserVisible: true },
    })
    expect(() =>
      joinedRegionScope(
        'chr22',
        1,
        100_000,
        ['HG00097'],
        JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
        route
      )
    ).not.toThrow()
    expect(() =>
      joinedRegionScope(
        'chr22',
        1,
        100_001,
        ['HG00097'],
        JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
        route
      )
    ).toThrow('100 kb')
    expect(() =>
      joinedRegionScope(
        'chr22',
        1,
        2,
        Array.from({ length: 26 }, (_, i) => `S${i}`),
        JOINED_PHASED_ORIENTATION_RECEIPT_SHA256,
        route
      )
    ).toThrow('1 to 25')
    expect(
      capture(() => projectJoinedRows(Array.from({ length: 250_001 }), projectionContract))
    ).toMatchObject({
      extensions: { code: 'JOINED_METHYLATION_RESULT_TOO_LARGE', isUserVisible: true },
    })
  })

  test('exposes the exact receipt roster only for admitted HGSVC/HPRC autosomes', async () => {
    await expect(joinedPhasedCapability(null, 'chr22', route)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    })
    await expect(joinedPhasedCapability('aou', 'chr22', route)).resolves.toMatchObject({
      available: false,
      status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
      source_sample_ids: [],
    })
    for (const chrom of ['chrX', 'chrY'])
      await expect(joinedPhasedCapability('hgsvc_hprc', chrom, route)).resolves.toMatchObject({
        available: false,
        status: 'UNAVAILABLE_ORIENTATION_EXCLUDED_CONTIG',
        source_sample_ids: [],
      })
    await expect(joinedPhasedCapability('hgsvc_hprc', 'chr22', null)).resolves.toMatchObject({
      available: false,
      status: 'UNAVAILABLE_NOT_CONFIGURED',
      source_sample_ids: [],
    })

    const available = await joinedPhasedCapability('hgsvc_hprc', 'chr22', route, admittedSnapshot)
    const expected = route.receipt.coverage.roster
      .filter((row) => row.source_status === 'source_present')
      .map((row) => row.sample_id)
    expect(available).toMatchObject({
      available: true,
      status: 'AVAILABLE_CONFIRMED',
      source_sample_ids: expected,
    })
    expect(available.source_sample_ids).toHaveLength(231)
    expect(available.source_sample_ids).not.toEqual(expect.arrayContaining(['HG00096', 'HG00272']))
  })
})

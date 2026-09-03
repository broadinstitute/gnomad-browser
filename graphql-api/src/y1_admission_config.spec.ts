import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  canonicalY1ContigLengths,
  fullGrch38PositionCount,
  readY1AncillaryReceipt,
  resolveY1PrimaryManifests,
  resolveY1RepresentedLengthAnchorRule,
  y1CoverageViewColumnShape,
} from './y1_admission_config'

const tempJson = (value: unknown) => {
  const directory = mkdtempSync(join(tmpdir(), 'y1-admission-'))
  const path = join(directory, 'receipt.json')
  writeFileSync(path, JSON.stringify(value))
  return { path, cleanup: () => rmSync(directory, { recursive: true, force: true }) }
}

const primaryEntry = () => ({
  cohort: 'aou',
  chrom: 'chrY',
  run_id: 'aou-chrY',
  manifest_sha256: 'a'.repeat(64),
  source: {
    source_uri: 'gs://gnomad-lr-data/y1/sources/aou/vcfs/gnomAD_LR_Y1.aou.chrY.vcf.gz',
    source_generation: '123',
    source_checksum_algorithm: 'md5_base64',
    source_checksum: 'AAAAAAAAAAAAAAAAAAAAAA==',
    source_size_bytes: 100,
    source_index_uri: 'gs://gnomad-lr-data/y1/sources/aou/vcfs/gnomAD_LR_Y1.aou.chrY.vcf.gz.tbi',
    source_index_generation: '124',
    source_index_checksum_algorithm: 'md5_base64',
    source_index_checksum: 'BBBBBBBBBBBBBBBBBBBBBB==',
    source_index_size_bytes: 10,
  },
  tasks: [
    { task_id: 'task-1', start: 1, stop: 30_000_000 },
    { task_id: 'task-2', start: 30_000_001, stop: 57_227_415 },
  ],
})

describe('Y1 startup admission artifacts', () => {
  test('loads all 48 bundled checked campaign manifests', () => {
    const path = join(__dirname, '../config/y1-presentation-primary-manifests.json')
    const document = JSON.parse(readFileSync(path, 'utf8'))
    const runMap = new Map<any, any>()
    for (const entry of document.entries) {
      const cohortRuns = runMap.get(entry.cohort) || new Map()
      cohortRuns.set(entry.chrom, entry.run_id)
      runMap.set(entry.cohort, cohortRuns)
    }
    const manifests = resolveY1PrimaryManifests(runMap, {
      LR_Y1_PRIMARY_MANIFEST_PATH: path,
    })!
    expect(manifests.size).toBe(48)
    expect(
      [...manifests.values()].reduce((total, manifest) => total + manifest.tasks.length, 0)
    ).toBe(6204)
    expect(manifests.get('hgsvc_hprc\u0000chrX')?.carrier_loading_status).toBe(
      'unavailable_not_loaded'
    )
    expect(manifests.get('hgsvc_hprc\u0000chrY')?.carrier_loading_status).toBe(
      'unavailable_not_loaded'
    )

    const rulePath = join(__dirname, '../config/y1-represented-length-source-contract.json')
    const rule = resolveY1RepresentedLengthAnchorRule(manifests, {
      LR_Y1_PRIMARY_MANIFEST_PATH: path,
      LR_Y1_REPRESENTED_LENGTH_RULE_PATH: rulePath,
    })!
    expect(rule).toMatchObject({
      id: 'VCF_SHARED_LEFT_PADDING_BASE_V1',
      source: 'gnomAD LR Y1 primary VCF REF and ALT fields',
      release: 'gnomAD LR Y1',
      digest: 'ad16242c7d0bff2321c87ad7d2ceecef2d7285706f71210699dc5e3af9cf1615',
      manifest_bundle_digest: '7aee998adbb40b50d920c81061dcec7437db04fd8d4c72ff12dfc40abe160c9a',
    })
    expect(rule.admitted_manifest_sha256s).toHaveLength(48)
  })

  test('rejects wrong, stale, or noncanonical represented-length receipts', () => {
    const primaryPath = join(__dirname, '../config/y1-presentation-primary-manifests.json')
    const document = JSON.parse(readFileSync(primaryPath, 'utf8'))
    const runMap = new Map<any, any>()
    for (const entry of document.entries) {
      const cohortRuns = runMap.get(entry.cohort) || new Map()
      cohortRuns.set(entry.chrom, entry.run_id)
      runMap.set(entry.cohort, cohortRuns)
    }
    const manifests = resolveY1PrimaryManifests(runMap, {
      LR_Y1_PRIMARY_MANIFEST_PATH: primaryPath,
    })!
    const original = JSON.parse(
      readFileSync(join(__dirname, '../config/y1-represented-length-source-contract.json'), 'utf8')
    )
    for (const [mutation, expected] of [
      [{ canonical_digest_sha256: '0'.repeat(64) }, /canonical digest/],
      [{ rule: { ...original.rule, id: 'OTHER_RULE' } }, /exact admitted padding rule/],
      [
        { manifest_binding: { ...original.manifest_binding, artifact_sha256: '0'.repeat(64) } },
        /stale or does not match/,
      ],
    ] as const) {
      const file = tempJson({ ...original, ...mutation })
      try {
        expect(() =>
          resolveY1RepresentedLengthAnchorRule(manifests, {
            LR_Y1_PRIMARY_MANIFEST_PATH: primaryPath,
            LR_Y1_REPRESENTED_LENGTH_RULE_PATH: file.path,
          })
        ).toThrow(expected)
      } finally {
        file.cleanup()
      }
    }
  })

  test('accepts an exact gapless checked primary manifest bundle', () => {
    const file = tempJson({ schema_version: 1, entries: [primaryEntry()] })
    try {
      const runMap = new Map<any, any>([['aou', new Map([['chrY', 'aou-chrY']])]])
      const manifests = resolveY1PrimaryManifests(runMap, {
        LR_Y1_PRIMARY_MANIFEST_PATH: file.path,
      })!
      expect(manifests.get('aou\u0000chrY')?.tasks).toHaveLength(2)
    } finally {
      file.cleanup()
    }
  })

  test.each([
    [
      [
        { task_id: 'task-1', start: 1, stop: 30_000_000 },
        { task_id: 'task-2', start: 30_000_002, stop: 57_227_415 },
      ],
      'gaplessly',
    ],
    [
      [
        { task_id: 'task-1', start: 1, stop: 30_000_000 },
        { task_id: 'task-2', start: 30_000_000, stop: 57_227_415 },
      ],
      'gaplessly',
    ],
    [
      [
        { task_id: 'task-1', start: 1, stop: 30_000_000 },
        { task_id: 'task-1', start: 30_000_001, stop: 57_227_415 },
      ],
      'duplicates task ID',
    ],
  ])('rejects gapped, overlapping, or duplicate primary tasks %#', (tasks, message) => {
    const file = tempJson({ schema_version: 1, entries: [{ ...primaryEntry(), tasks }] })
    try {
      const runMap = new Map<any, any>([['aou', new Map([['chrY', 'aou-chrY']])]])
      expect(() =>
        resolveY1PrimaryManifests(runMap, {
          LR_Y1_PRIMARY_MANIFEST_PATH: file.path,
        })
      ).toThrow(message)
    } finally {
      file.cleanup()
    }
  })

  test('accepts only the exact aggregate-only carrier-unavailable manifest markers', () => {
    const entry = primaryEntry()
    const aggregate = {
      ...entry,
      cohort: 'hgsvc_hprc',
      primary_load_mode: 'aggregate_only_no_carriers',
      carrier_loading_status: 'unavailable_not_loaded',
      source: {
        ...entry.source,
        source_uri: entry.source.source_uri
          .replace('/aou/', '/hgsvc_hprc/')
          .replace('.aou.', '.hgsvc_hprc.'),
        source_index_uri: entry.source.source_index_uri
          .replace('/aou/', '/hgsvc_hprc/')
          .replace('.aou.', '.hgsvc_hprc.'),
      },
    }
    const file = tempJson({ schema_version: 1, entries: [aggregate] })
    try {
      const runMap = new Map<any, any>([['hgsvc_hprc', new Map([['chrY', 'aou-chrY']])]])
      const manifest = resolveY1PrimaryManifests(runMap, {
        LR_Y1_PRIMARY_MANIFEST_PATH: file.path,
      })!.get('hgsvc_hprc\u0000chrY')!
      expect(manifest.carrier_loading_status).toBe('unavailable_not_loaded')
    } finally {
      file.cleanup()
    }
  })

  test('rejects methylation receipts whose per-sample rows do not sum to the global total', () => {
    const contigs = [...canonicalY1ContigLengths.keys()]
    const file = tempJson({
      schema_version: 1,
      status: 'completed',
      database: 'gnomad_lr_y1_methylation',
      run_id: 'methylation-run',
      cohort: 'hgsvc_hprc',
      modality: 'methylation',
      job_uuid: '123e4567-e89b-42d3-a456-426614174000',
      receipts: { expected: 1, accepted: 1, failed_attempts: 0, rejects: 0 },
      reconciliation: {
        roster_rows: 1,
        included_samples: 1,
        detail_rows: 25,
        summary_rows: 24,
        availability_rows: 1,
        detail_contigs: contigs.map((chrom) => ({ chrom, rows: chrom === 'chr1' ? 2 : 1 })),
        summary_contigs: contigs.map((chrom) => ({ chrom, rows: 1 })),
        samples: [
          {
            sample_id: 'sample-1',
            included: true,
            availability: 'available_complete_source',
            detail_rows: 24,
            indexed_contigs: contigs,
          },
        ],
      },
    })
    try {
      expect(() =>
        readY1AncillaryReceipt(file.path, {
          database: 'gnomad_lr_y1_methylation',
          run_id: 'methylation-run',
          cohort: 'hgsvc_hprc',
          modality: 'methylation',
        })
      ).toThrow('per-sample detail rows')
    } finally {
      file.cleanup()
    }
  })

  test('accepts a fenced terminal sample-total completion receipt', () => {
    const file = tempJson({
      status: 'validated_success',
      completed_at: '2026-08-04T01:51:08Z',
      database: 'gnomad_lr_y1_methylation',
      writer: 'methylation-writer',
      writer_remained_fenced_and_revoked: true,
      jobs: 24,
      tasks: 10,
      accepted: 10,
      failed_attempts: 0,
      receipt_items_processed: 100,
      detail_rows: 100,
      summary_rows: 20,
      summary_num_samples_sum: 100,
      summary_keys_unique: true,
      availability_rows: 4,
      availability_complete: 1,
      availability_partial: 1,
      availability_source_marked_skip: 1,
      availability_no_source: 1,
      unavailable_detail_rows: 0,
      cohort_rows: 2,
      planning_envelope_used: false,
      authoritative_count_source: 'exact durable receipts',
    })
    try {
      const receipt = readY1AncillaryReceipt(file.path, {
        database: 'gnomad_lr_y1_methylation',
        run_id: 'methylation-run',
        cohort: 'hgsvc_hprc',
        modality: 'methylation',
      })
      expect(receipt.source_format).toBe('sample_total_completion')
      expect(receipt.receipts).toEqual({
        expected: 10,
        accepted: 10,
        failed_attempts: 0,
        rejects: 0,
      })
    } finally {
      file.cleanup()
    }
  })

  test('accepts a strict raw-backed coverage View receipt and rejects storage drift', () => {
    const receipt = {
      schema_version: 1,
      status: 'validated_success',
      database: 'gnomad_lr_y1_cov_aou',
      canonical_object: 'lr_y1_coverage',
      canonical_engine: 'View',
      canonical_backing_database: 'gnomad_lr_y1_cov_aou',
      canonical_backing_table: 'lr_coverage',
      logical_rows: fullGrch38PositionCount,
      physical_copy_rows: 0,
      receipt_items_processed: fullGrch38PositionCount,
      contig_coverage: [...canonicalY1ContigLengths].map(([chrom, length]) => ({
        chrom,
        rows: length,
        unique_positions: length,
        min_pos: 1,
        max_pos: length,
      })),
      numeric_violations: {
        nonfinite: 0,
        negative_depth: 0,
        fraction_range_violations: 0,
        monotonicity_violations: 0,
      },
      representative_view_query: {
        rows: 10,
        min_position: 100000,
        max_position: 100009,
        unique_positions: 10,
        runs: 1,
        cohorts: 1,
      },
      column_shape: y1CoverageViewColumnShape.map(([name, type]) => ({ name, type })),
      source: {
        cohort: 'aou',
        modality: 'coverage',
        uri: 'gs://source/aou.coverage.tsv.gz',
        generation: '123',
        byte_size: 100,
        md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
        crc32c_base64: 'AAAAAA==',
        runtime_uri: 'gs://mirror/aou.coverage.tsv.gz',
        runtime_generation: '456',
        runtime_byte_size: 100,
        runtime_md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
        runtime_crc32c_base64: 'AAAAAA==',
        source_access: 'direct',
        mirror_verified_by_worker: true,
      },
      writer_fenced_and_revoked: true,
    }
    const expected = {
      database: receipt.database,
      run_id: 'coverage-aou',
      cohort: 'aou' as const,
      modality: 'coverage' as const,
    }
    const file = tempJson(receipt)
    try {
      const parsed = readY1AncillaryReceipt(file.path, expected)
      expect(parsed.source_format).toBe('coverage_view_completion')
      expect(parsed.reconciliation.canonical_rows).toBe(fullGrch38PositionCount)
    } finally {
      file.cleanup()
    }

    for (const drift of [
      { canonical_engine: 'MergeTree' },
      { canonical_backing_table: 'other' },
      { physical_copy_rows: 1 },
      { writer_fenced_and_revoked: false },
      { logical_rows: fullGrch38PositionCount - 1 },
    ]) {
      const invalid = tempJson({ ...receipt, ...drift })
      try {
        expect(() => readY1AncillaryReceipt(invalid.path, expected)).toThrow(
          'exact fenced raw-backed coverage view'
        )
      } finally {
        invalid.cleanup()
      }
    }

    const strictDrifts: Array<[unknown, RegExp]> = [
      [{ ...receipt, unknown_evidence: true }, /invalid keys/],
      [
        {
          ...receipt,
          contig_coverage: receipt.contig_coverage.map((row, index) =>
            index === 0 ? { ...row, rows: row.rows - 1 } : row
          ),
        },
        /incomplete raw positional bounds/,
      ],
      [
        {
          ...receipt,
          numeric_violations: { ...receipt.numeric_violations, nonfinite: 1 },
        },
        /invalid coverage measurements/,
      ],
      [
        {
          ...receipt,
          representative_view_query: { ...receipt.representative_view_query, rows: 9 },
        },
        /representative coverage view validation/,
      ],
      [
        {
          ...receipt,
          column_shape: receipt.column_shape.map((column, index) =>
            index === 0 ? { ...column, type: 'UInt64' } : column
          ),
        },
        /unexpected canonical coverage view shape/,
      ],
      [
        {
          ...receipt,
          source: { ...receipt.source, cohort: 'hgsvc_hprc' },
        },
        /invalid or cross-cohort coverage source identity/,
      ],
    ]
    for (const [invalidReceipt, error] of strictDrifts) {
      const invalid = tempJson(invalidReceipt)
      try {
        expect(() => readY1AncillaryReceipt(invalid.path, expected)).toThrow(error)
      } finally {
        invalid.cleanup()
      }
    }
  })

  test('accepts a strict full-genome STR completion receipt and rejects identity/count drift', () => {
    const contigCoverage = [...canonicalY1ContigLengths].map(([chrom, length]) => ({
      chrom,
      mapping_count: 2,
      available_exact: 1,
      unavailable_no_exact_key: 1,
      min_position: 1,
      max_position: length,
    }))
    const receipt = {
      schema_version: 1,
      status: 'validated_success',
      database: 'gnomad_lr_y1_str_aou',
      ancillary_run_id: 'str-aou',
      cohort: 'aou',
      modality: 'str',
      job_uuid: '123e4567-e89b-42d3-a456-426614174000',
      job_expected_tasks: 2,
      job_accepted_tasks: 2,
      cohort_expected_tasks: 1,
      cohort_accepted_tasks: 1,
      failed_attempts: 0,
      rejects: 0,
      receipt_items_processed: 100,
      raw_rows: 100,
      selected_primary_runs: 24,
      selected_primary_direct_tr_count: 48,
      mapping_count: 48,
      mapping_statuses: {
        available_exact: 24,
        unavailable_no_exact_key: 24,
        unavailable_ambiguous: 0,
      },
      physical_rows: 24,
      duplicate_primary_ids: 0,
      duplicate_exact_keys: 0,
      duplicate_positions: 0,
      unavailable_canonical_joins: 0,
      contig_coverage: contigCoverage,
      source: {
        cohort: 'aou',
        modality: 'str',
        uri: 'gs://source/aou.str.tsv',
        generation: '123',
        byte_size: 100,
        md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
        crc32c_base64: 'AAAAAA==',
        runtime_uri: 'gs://mirror/aou.str.tsv',
        runtime_generation: '456',
        runtime_byte_size: 100,
        runtime_md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
        runtime_crc32c_base64: 'AAAAAA==',
        source_access: 'direct',
        mirror_verified_by_worker: true,
      },
      writer_fenced_and_revoked: true,
    }
    const expected = {
      database: receipt.database,
      run_id: receipt.ancillary_run_id,
      cohort: 'aou' as const,
      modality: 'str_histogram' as const,
    }
    const file = tempJson(receipt)
    try {
      const parsed = readY1AncillaryReceipt(file.path, expected)
      expect(parsed.source_format).toBe('str_completion')
      expect(parsed.reconciliation).toMatchObject({
        raw_rows: 100,
        mapping_rows: 48,
        canonical_rows: 24,
        ambiguous_rows: 0,
      })
    } finally {
      file.cleanup()
    }

    for (const invalidReceipt of [
      { ...receipt, ancillary_run_id: 'other' },
      { ...receipt, physical_rows: 23 },
      { ...receipt, duplicate_positions: 1 },
      { ...receipt, writer_fenced_and_revoked: false },
      {
        ...receipt,
        mapping_statuses: { ...receipt.mapping_statuses, unavailable_ambiguous: 1 },
      },
    ]) {
      const invalid = tempJson(invalidReceipt)
      try {
        expect(() => readY1AncillaryReceipt(invalid.path, expected)).toThrow(
          'exact fenced STR presentation product'
        )
      } finally {
        invalid.cleanup()
      }
    }
  })

  test('accepts an exact coverage completion receipt and rejects identity/count drift', () => {
    const receipt = {
      schema_version: 1,
      status: 'completed',
      database: 'gnomad_lr_y1_cov',
      run_id: 'coverage-run',
      cohort: 'aou',
      modality: 'coverage',
      job_uuid: '123e4567-e89b-42d3-a456-426614174000',
      receipts: { expected: 2, accepted: 2, failed_attempts: 0, rejects: 0 },
      reconciliation: {
        canonical_rows: fullGrch38PositionCount,
        contigs: [...canonicalY1ContigLengths].map(([chrom, length]) => ({
          chrom,
          rows: length,
          unique_positions: length,
          min_position: 1,
          max_position: length,
        })),
      },
    }
    const file = tempJson(receipt)
    try {
      const expected = {
        database: 'gnomad_lr_y1_cov',
        run_id: 'coverage-run',
        cohort: 'aou' as const,
        modality: 'coverage' as const,
      }
      expect(readY1AncillaryReceipt(file.path, expected).job_uuid).toBe(receipt.job_uuid)
      expect(() => readY1AncillaryReceipt(file.path, { ...expected, run_id: 'other' })).toThrow(
        'run_id does not match'
      )
    } finally {
      file.cleanup()
    }

    const partial = tempJson({
      ...receipt,
      reconciliation: { ...receipt.reconciliation, canonical_rows: fullGrch38PositionCount - 1 },
    })
    try {
      expect(() =>
        readY1AncillaryReceipt(partial.path, {
          database: 'gnomad_lr_y1_cov',
          run_id: 'coverage-run',
          cohort: 'aou',
          modality: 'coverage',
        })
      ).toThrow('exact full-GRCh38 positional count')
    } finally {
      partial.cleanup()
    }
  })
})

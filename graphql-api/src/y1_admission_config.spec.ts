import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  canonicalY1ContigLengths,
  fullGrch38PositionCount,
  readY1AncillaryReceipt,
  resolveY1PrimaryManifests,
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

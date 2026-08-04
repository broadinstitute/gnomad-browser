/* eslint-disable import/first */
import { jest } from '@jest/globals'
import { canonicalY1ContigLengths } from '../../y1_admission_config'

const mockQuery = jest.fn()
const contigs = [...canonicalY1ContigLengths].map(([chrom, length]) => ({
  chrom,
  mapping_count: 2,
  available_exact: 1,
  unavailable_no_exact_key: 1,
  min_position: 1,
  max_position: length,
}))
const source = {
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
}
const route = {
  modality: 'str_histogram' as const,
  cohort: 'aou' as const,
  database: 'gnomad_lr_y1_str_aou',
  run_id: 'str-aou',
  receipt_path: '/receipt/str-aou',
  receipt: {
    schema_version: 1 as const,
    status: 'completed' as const,
    database: 'gnomad_lr_y1_str_aou',
    run_id: 'str-aou',
    cohort: 'aou' as const,
    modality: 'str_histogram' as const,
    source_format: 'str_completion' as const,
    job_uuid: '123e4567-e89b-42d3-a456-426614174000',
    receipts: { expected: 1, accepted: 1, failed_attempts: 0, rejects: 0 },
    reconciliation: {
      raw_rows: 100,
      mapping_rows: 48,
      available_rows: 24,
      unavailable_rows: 24,
      ambiguous_rows: 0,
      canonical_rows: 24,
      key_mismatches: 0,
      contigs,
      source,
    },
  },
}

jest.mock('../../clickhouse', () => ({
  isY1PilotEnabled: true,
  y1AncillaryRoutes: [route],
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))

import { getY1AncillaryRoute, preflightY1Ancillaries } from './ancillary-availability'

const shared = [
  'ancillary_run_id',
  'release',
  'cohort',
  'reference_genome',
  'modality',
  'source_uri',
  'source_generation',
  'source_size_bytes',
  'source_checksum_algorithm',
  'source_checksum',
  'runtime_source_uri',
  'runtime_source_generation',
  'primary_database',
  'primary_run_id',
  'primary_task_id',
  'primary_attempt_id',
  'y1_source_variant_id',
  'chrom',
  'position',
  'source_end',
  'motif',
]
const columns = {
  lr_y1_str_histogram_mapping: [...shared, 'raw_match_count', 'mapping_status'],
  lr_y1_str_histograms: [
    ...shared,
    'allele_size_histogram',
    'biallelic_histogram',
    'min_repeats',
    'mode_repeats',
    'mean_repeats',
    'stdev_repeats',
    'median_repeats',
    'p99_repeats',
    'max_repeats',
    'unique_allele_lengths',
    'num_called_alleles',
    'populations',
    'mapping_status',
  ],
}

type Drift = 'none' | 'engine' | 'mapping' | 'canonical' | 'key'
const installFixture = (drift: Drift = 'none') => {
  mockQuery.mockImplementation(({ query }: any) => {
    if (query.includes('FROM system.columns')) {
      return Promise.resolve({
        json: async () =>
          Object.entries(columns).flatMap(([table, names]) =>
            names.map((name) => ({ table, name }))
          ),
      })
    }
    if (query.includes('SELECT name, engine FROM system.tables')) {
      return Promise.resolve({
        json: async () => [
          { name: 'lr_y1_str_histogram_mapping', engine: 'MergeTree' },
          { name: 'lr_y1_str_histograms', engine: drift === 'engine' ? 'Log' : 'MergeTree' },
        ],
      })
    }
    if (query.includes('FULL OUTER JOIN')) {
      return Promise.resolve({ json: async () => [{ key_mismatches: drift === 'key' ? 1 : 0 }] })
    }
    if (query.includes('SELECT chrom, count() AS mapping_count')) {
      const rows = contigs.map((row) => ({ ...row, invalid: 0, exact: row.mapping_count }))
      if (drift === 'mapping') rows[0].mapping_count -= 1
      return Promise.resolve({ json: async () => rows })
    }
    if (query.includes('SELECT chrom, count() AS rows')) {
      const rows = contigs.map((row) => ({ chrom: row.chrom, rows: 1, exact: 1 }))
      if (drift === 'canonical') rows[0].rows = 0
      return Promise.resolve({ json: async () => rows })
    }
    if (query.includes('uniqExact((primary_run_id, y1_source_variant_id))')) {
      return Promise.resolve({
        json: async () => [
          {
            rows: 24,
            primary_ids: 24,
            exact_keys: 24,
            positions: 24,
          },
        ],
      })
    }
    throw new Error(`Unexpected query: ${query}`)
  })
}

describe('strict full-genome STR completion preflight', () => {
  beforeEach(() => mockQuery.mockReset())

  test('activates only the exact cohort/run receipt and physical product', async () => {
    installFixture()
    await preflightY1Ancillaries()
    expect(getY1AncillaryRoute('aou', 'str_histogram')?.run_id).toBe('str-aou')
  })

  test.each(['engine', 'mapping', 'canonical', 'key'] as const)(
    'fails closed on %s drift',
    async (drift) => {
      installFixture(drift)
      await expect(preflightY1Ancillaries()).rejects.toThrow(
        'does not match its completion receipt'
      )
      expect(getY1AncillaryRoute('aou', 'str_histogram')).toBeNull()
    }
  )
})

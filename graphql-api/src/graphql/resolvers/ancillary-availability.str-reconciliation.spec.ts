/* eslint-disable import/first */
import { jest } from '@jest/globals'
import { canonicalY1ContigLengths } from '../../y1_admission_config'

const mockQuery = jest.fn()
const contigs = [...canonicalY1ContigLengths.keys()].map((chrom) => ({
  chrom,
  rows: 1,
  min_start: 1,
  max_end: 2,
}))
const route = {
  modality: 'str_histogram' as const,
  cohort: 'hgsvc_hprc' as const,
  database: 'gnomad_lr_y1_str',
  run_id: 'str-run',
  receipt_path: '/receipt/str',
  receipt: {
    schema_version: 1 as const,
    status: 'completed' as const,
    database: 'gnomad_lr_y1_str',
    run_id: 'str-run',
    cohort: 'hgsvc_hprc' as const,
    modality: 'str_histogram' as const,
    job_uuid: '123e4567-e89b-42d3-a456-426614174000',
    receipts: { expected: 1, accepted: 1, failed_attempts: 0, rejects: 0 },
    reconciliation: {
      mapping_rows: 24,
      available_rows: 24,
      unavailable_rows: 0,
      ambiguous_rows: 0,
      canonical_rows: 24,
      key_mismatches: 0,
      contigs,
    },
  },
}

jest.mock('../../clickhouse', () => ({
  isY1PilotEnabled: true,
  y1AncillaryRoutes: [route],
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))

import { getY1AncillaryRoute, preflightY1Ancillaries } from './ancillary-availability'

const columns = {
  lr_y1_str_histograms: [
    'ancillary_run_id',
    'cohort',
    'y1_source_variant_id',
    'chrom',
    'source_start',
    'source_end',
    'motif',
    'allele_size_histogram',
    'biallelic_histogram',
    'populations',
  ],
  lr_y1_str_histogram_mapping: [
    'ancillary_run_id',
    'cohort',
    'y1_source_variant_id',
    'chrom',
    'source_start',
    'source_end',
    'motif',
    'mapping_status',
  ],
}

const installFixture = (keyMismatches: number) => {
  mockQuery.mockImplementation(({ query }: any) => {
    if (query.includes('FROM system.columns')) {
      return Promise.resolve({
        json: async () =>
          Object.entries(columns).flatMap(([table, names]) =>
            names.map((name) => ({ table, name }))
          ),
      })
    }
    if (query.includes('FULL OUTER JOIN')) {
      return Promise.resolve({ json: async () => [{ key_mismatches: keyMismatches }] })
    }
    if (query.includes('count() AS mapping_rows')) {
      return Promise.resolve({
        json: async () => [
          {
            mapping_rows: 24,
            available_rows: 24,
            unavailable_rows: 0,
            ambiguous_rows: 0,
            unknown_rows: 0,
          },
        ],
      })
    }
    if (query.includes('FROM lr_y1_str_histograms')) {
      return Promise.resolve({
        json: async () => contigs.map((row) => ({ ...row, exact: 1 })),
      })
    }
    throw new Error(`Unexpected query: ${query}`)
  })
}

describe('configured Y1 STR exact-key reconciliation', () => {
  beforeEach(() => mockQuery.mockReset())

  test('advertises a route only when mapping and canonical keys match one-to-one', async () => {
    installFixture(0)
    await preflightY1Ancillaries()
    expect(getY1AncillaryRoute('hgsvc_hprc', 'str_histogram')?.run_id).toBe('str-run')
  })

  test('rejects compensating omitted/duplicated canonical STR keys', async () => {
    installFixture(2)
    await expect(preflightY1Ancillaries()).rejects.toThrow('does not match its completion receipt')
  })
})

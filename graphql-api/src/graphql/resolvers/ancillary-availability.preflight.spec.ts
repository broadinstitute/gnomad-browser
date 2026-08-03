/* eslint-disable import/first */
import { jest } from '@jest/globals'

const mockQuery = jest.fn()
const mockRoutes = [
  {
    modality: 'coverage',
    cohort: 'hgsvc_hprc',
    database: 'gnomad_lr_y1_cov_hgsvc',
    run_id: 'cov-hgsvc',
  },
  { modality: 'coverage', cohort: 'aou', database: 'gnomad_lr_y1_cov_aou', run_id: 'cov-aou' },
] as const

jest.mock('../../clickhouse', () => ({
  isY1PilotEnabled: true,
  y1AncillaryRoutes: mockRoutes,
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))

import {
  ancillaryDecision,
  getY1AncillaryRoute,
  preflightY1Ancillaries,
} from './ancillary-availability'

const coverageColumns = ['ancillary_run_id', 'cohort', 'chrom', 'position']
const canonicalChromosomes = [
  ...Array.from({ length: 22 }, (_, index) => `chr${index + 1}`),
  'chrX',
  'chrY',
]

describe('configured Y1 ancillary preflight', () => {
  beforeEach(() => mockQuery.mockReset())

  test('keeps HGSVC/HPRC and AoU routes isolated and leaves absent modalities unavailable', async () => {
    mockQuery.mockImplementation(({ query, query_params = {} }: any) => {
      if (query.includes('FROM system.columns'))
        return Promise.resolve({
          json: async () => coverageColumns.map((name) => ({ table: 'lr_y1_coverage', name })),
        })
      if (query.includes('FROM lr_y1_coverage'))
        return Promise.resolve({
          json: async () => [{
            rows: query_params.cohort === 'aou' ? 200 : 100,
            chromosomes: canonicalChromosomes,
          }],
        })
      throw new Error(`Unexpected query: ${query}`)
    })

    await preflightY1Ancillaries()
    expect(getY1AncillaryRoute('hgsvc_hprc', 'coverage')?.run_id).toBe('cov-hgsvc')
    expect(getY1AncillaryRoute('aou', 'coverage')?.run_id).toBe('cov-aou')
    expect(ancillaryDecision('aou', 'coverage')).toEqual({
      available: true,
      source: 'Y1_DATABASE',
      reason: null,
    })
    expect(ancillaryDecision('aou', 'str_histogram').available).toBe(false)
    expect(ancillaryDecision('aou', 'methylation').available).toBe(false)
  })

  test('fails closed when a configured exact route has no canonical rows', async () => {
    mockQuery.mockImplementation(({ query }: any) => {
      if (query.includes('FROM system.columns'))
        return Promise.resolve({
          json: async () => coverageColumns.map((name) => ({ table: 'lr_y1_coverage', name })),
        })
      if (query.includes('FROM lr_y1_coverage')) {
        return Promise.resolve({ json: async () => [{ rows: 0, chromosomes: [] }] })
      }
      throw new Error(`Unexpected query: ${query}`)
    })
    await expect(preflightY1Ancillaries()).rejects.toThrow(
      'route hgsvc_hprc/cov-hgsvc is not full-genome'
    )
    expect(getY1AncillaryRoute('hgsvc_hprc', 'coverage')).toBeNull()
  })
})

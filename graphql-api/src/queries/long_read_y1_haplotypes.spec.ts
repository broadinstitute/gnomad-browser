import { jest } from '@jest/globals'

const mockQuery = jest.fn()

jest.mock('../clickhouse', () => ({
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))

import { fetchY1HaplotypeRows } from './long_read_y1_haplotypes'

describe('Y1 haplotype VCF identity query', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockQuery.mockImplementation(({ query }: any) => {
      if (query.includes('count() AS total_carrier_rows')) {
        return Promise.resolve({
          json: async () => [{
            total_carrier_rows: 2,
            phased_rows: 2,
            haploid_rows: 0,
            unphased_homozygous_alt_rows: 0,
            ambiguous_unphased_rows: 0,
          }],
        })
      }
      if (query.includes("a.allele_type = 'trv'")) {
        return Promise.resolve({
          json: async () => [
            { position: 100, ref: 'A', alt: 'G', sample_id: 'sample-1', vcf_strand: 1, phase_set: 'ps-1' },
            { position: 100, ref: 'A', alt: 'G', sample_id: 'sample-1', vcf_strand: 2, phase_set: null },
          ],
        })
      }
      return Promise.resolve({
        json: async () => [{
          source_variant_id: 'chr22-100-A-G', alt_index: 1,
          carriers: [['sample-1', 1, 'ps-1'], ['sample-1', 2, null]],
        }],
      })
    })
  })

  test('maps zero-based GT positions to explicit one-based vcf_strand and preserves FORMAT/PS', async () => {
    const result = await fetchY1HaplotypeRows('chr22', 1, 200, 'run-1')
    const queries = mockQuery.mock.calls.map(([call]: any[]) => call.query as string)
    const variantQuery = queries.find((query) => query.includes('groupUniqArray(tuple'))!
    const trvQuery = queries.find((query) => query.includes("a.allele_type = 'trv'"))!

    expect(variantQuery).toContain('toUInt16(c.genotype_position + 1)')
    expect(variantQuery).toContain("nullIf(JSONExtractString(c.genotype_fields_json, 'PS'), '')")
    expect(trvQuery).toContain('toUInt16(c.genotype_position + 1) AS vcf_strand')
    expect(trvQuery).toContain("AS phase_set")
    expect(result.variants[0].carriers).toEqual([
      ['sample-1', 1, 'ps-1'],
      ['sample-1', 2, null],
    ])
    expect(result.trvCarriers).toEqual([
      { position: 100, ref: 'A', alt: 'G', sample_id: 'sample-1', vcf_strand: 1, phase_set: 'ps-1' },
      { position: 100, ref: 'A', alt: 'G', sample_id: 'sample-1', vcf_strand: 2, phase_set: null },
    ])
  })
})

import { jest } from '@jest/globals'

const mockQuery = jest.fn()
jest.mock('../clickhouse', () => ({
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))

// The ClickHouse mock must be installed before this module initializes its client.
// eslint-disable-next-line import/first
import { fetchY1VariantById, mapY1RowToGraphQL } from './long_read_y1_variants'

const compoundLocusRow = (altIndex: number) => ({
  source_variant_id: 'chr1-121606499-TRV-37',
  alt_index: altIndex,
  alt_count: 9,
  chrom: 'chr1',
  position: 121606499,
  reference_end: 121606536,
  xpos: 1121606499,
  ref_allele: 'CAGAGAGAGACTCTGTCTCAAAAAAAAAAAAAAAAAAA',
  alt:
    altIndex === 1
      ? 'CAGAGAGAGACTCCGTCTCAAAAAAAAAAAAAAAAA'
      : 'CAGAGAGAGACTCCATCTCAAAAAAAAAAAAAAAAAA',
  allele_type: 'trv',
  filters: [],
  ac: 2,
  an: 100,
  af: 0.02,
  allele_length: altIndex - 3,
  rsids: [],
  tr_motifs: 'AG,A',
  tr_locus_id: '1-121606499-121606508-AG,1-121606517-121606536-A',
  tr_structure: '(AG)n(A)n',
})

describe('Y1 compound TR exact-route contract', () => {
  it.each([1, 2])('resolves the Open exact ALT %i identity and payload', async (altIndex) => {
    mockQuery.mockReset()
    const row = compoundLocusRow(altIndex)
    mockQuery
      .mockImplementationOnce(() => Promise.resolve({ json: async () => [row] }))
      .mockImplementationOnce(() => Promise.resolve({ json: async () => [] }))

    const variant = await fetchY1VariantById(
      `${row.source_variant_id}~${altIndex}`,
      'hgsvc_hprc',
      'run-1',
      'chr1'
    )

    const [request] = mockQuery.mock.calls[0] as any[]
    expect(request.query).toContain('a.chrom AS chrom')
    expect(request.query).toContain('a.source_variant_id AS source_variant_id')
    expect(request.query).toContain('a.position AS position')
    expect(variant).toMatchObject({
      variant_id: `${row.source_variant_id}~${altIndex}`,
      source_variant_id: row.source_variant_id,
      alt_index: altIndex,
      chrom: '1',
      ref: row.ref_allele,
      alt: row.alt,
      tr_locus_id: '1-121606499-121606508-AG+1-121606517-121606536-A',
    })
  })

  it.each(['chrom', 'source_variant_id', 'ref_allele', 'alt'])(
    'fails closed with a clear message when required %s is missing',
    (field) => {
      const row: any = compoundLocusRow(1)
      delete row[field]
      expect(() => mapY1RowToGraphQL(row, 'hgsvc_hprc', [], 'run-1')).toThrow(
        `Malformed Y1 long-read variant row: missing required ${field}`
      )
    }
  )
})

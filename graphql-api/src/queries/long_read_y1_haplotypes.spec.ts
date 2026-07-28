import { fetchY1HaplotypeRows } from './long_read_y1_haplotypes'

const queryMock = jest.fn()

jest.mock('../clickhouse', () => ({
  y1ClickhouseClient: { query: (...args: any[]) => queryMock(...args) },
}))

const result = (rows: any[]) => ({ json: async () => rows })

describe('Y1 haplotype TR metadata', () => {
  beforeEach(() => queryMock.mockReset())

  it.each([
    ['retains trusted source metadata', '22-100-110-A', 'A,AG', '(A|AG)*'],
    ['keeps absent metadata explicit', null, null, null],
  ])('%s', async (_label, tr_id, tr_motifs, tr_struc) => {
    queryMock
      .mockReturnValueOnce(result([{
        source_variant_id: 'chr22-100-TRV-1', alt_index: 1,
        tr_id, tr_motifs, tr_struc,
      }]))
      .mockReturnValueOnce(result([]))
      .mockReturnValueOnce(result([]))

    const payload = await fetchY1HaplotypeRows('chr22', 100, 200, 'accepted-run')
    const variantQuery = queryMock.mock.calls[0][0].query as string

    expect(variantQuery).toContain('LEFT JOIN (')
    expect(variantQuery).toContain('FROM lr_y1_summaries')
    expect(variantQuery).toContain("JSONExtractString(source_info_json, 'MOTIFS')")
    expect(variantQuery).toContain(
      'GROUP BY run_id, release, cohort, reference_genome, chrom, position, source_variant_id'
    )
    expect(variantQuery).toContain('a.run_id = s.run_id')
    expect(variantQuery).toContain('a.reference_genome = s.reference_genome')
    expect(variantQuery).not.toContain('INNER JOIN lr_y1_summaries')
    expect(variantQuery).not.toContain('JOIN lr_variants')
    expect(payload.variants[0]).toMatchObject({
      variant_id: 'chr22-100-TRV-1~1', tr_id, tr_motifs, tr_struc,
    })
  })
})

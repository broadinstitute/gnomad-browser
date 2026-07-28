import { browserVariantId, mapY1RowToGraphQL, sourceIdentityFromBrowserId } from './long_read_y1_variants'

describe('Y1 long-read browser identity', () => {
  it('keeps the exact source ID separate from the ALT-specific browser ID', () => {
    const sourceVariantId = 'chr22-20147573-INS-2_2'
    const id = browserVariantId(sourceVariantId, 3)

    expect(id).toBe('chr22-20147573-INS-2_2~3')
    expect(sourceIdentityFromBrowserId(id)).toEqual({ sourceVariantId, altIndex: 3 })
  })

  it('treats an unsuffixed exact source ID as ALT 1', () => {
    expect(sourceIdentityFromBrowserId('chr22-20000208-C-T')).toEqual({
      sourceVariantId: 'chr22-20000208-C-T',
      altIndex: 1,
    })
  })

  it('preserves signed and zero Y1 allele lengths without coercing missingness to zero', () => {
    const row = {
      source_variant_id: 'chr22-100-TRV-2', alt_index: 1, chrom: 'chr22',
      position: 100, reference_end: 110, xpos: 2200000100, ref_allele: 'AAAA',
      alt: 'A', allele_type: 'trv', filters: [], ac: 2, an: 10, af: 0.2,
    }
    const map = (alleleLength: unknown) =>
      mapY1RowToGraphQL({ ...row, allele_length: alleleLength }, 'hgsvc_hprc', [], 'run-1').length

    expect(map(-3)).toBe(-3)
    expect(map(0)).toBe(0)
    expect(map(null)).toBeNull()
  })
})

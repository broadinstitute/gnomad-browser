import { browserVariantId, sourceIdentityFromBrowserId } from './long_read_y1_variants'

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
})

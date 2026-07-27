import {
  browserVariantId,
  majorConsequenceFromVep,
  selectAltAnnotation,
  sourceIdentityFromBrowserId,
} from './long_read_y1_variants'

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

  it('selects Number=A annotations for the expanded ALT', () => {
    expect(selectAltAnnotation('1.25,9.5', 2)).toBe('9.5')
    expect(selectAltAnnotation('rs123', 3)).toBe('rs123')
    expect(selectAltAnnotation('.', 1)).toBeNull()
  })

  it('uses the most severe PICK consequence for the expanded ALT', () => {
    const vep = [
      'T|intron_variant|MODIFIER|GENE|||||||||||||||||||1',
      'G|synonymous_variant&splice_region_variant|LOW|GENE|||||||||||||||||||1',
    ].join(',')
    expect(majorConsequenceFromVep(vep, 'C', 'G', 2)).toBe('splice_region_variant')
  })
})

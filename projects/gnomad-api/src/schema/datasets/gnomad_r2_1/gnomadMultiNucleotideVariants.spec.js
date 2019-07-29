import { annotateVariantsWithMNVFlag } from './gnomadMultiNucleotideVariants'

describe('annotateVariantsWithMNVFlag', () => {
  it('should add flag to variants in MNV list', () => {
    const variants = [
      { variantId: '1-3-A-C', flags: [] },
      { variantId: '1-5-G-T', flags: [] },
      { variantId: '1-10-CT-C', flags: [] },
      { variantId: '1-15-A-C', flags: [] },
      { variantId: '1-17-G-T', flags: [] },
      { variantId: '1-18-G-A', flags: [] },
      { variantId: '1-19-A-C', flags: [] },
      { variantId: '1-20-A-C', flags: [] },
      { variantId: '1-21-C-T', flags: [] },
      { variantId: '1-24-A-C', flags: [] },
    ]

    const mnvs = [
      { constituent_snv_ids: ['1-2-G-T', '1-3-A-C'] },
      { constituent_snv_ids: ['1-17-G-T', '1-19-A-C'] },
      { constituent_snv_ids: ['1-18-G-A', '1-20-A-C'] },
    ]

    annotateVariantsWithMNVFlag(variants, mnvs)

    const flaggedVariants = variants.filter(v => v.flags.length).map(v => v.variantId)

    expect(flaggedVariants).toEqual(['1-3-A-C', '1-17-G-T', '1-18-G-A', '1-19-A-C', '1-20-A-C'])
  })
})

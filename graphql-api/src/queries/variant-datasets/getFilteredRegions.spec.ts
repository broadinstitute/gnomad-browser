import { describe, it, expect } from '@jest/globals'

import { getFilteredRegions, type Exon } from './gnomad-v4-variant-queries'

describe('getFilteredRegion', () => {
  it('only returns CDS exons when at least 1 CDS exon is present', () => {
    const testExons: Exon[] = [
      { feature_type: 'UTR' },
      { feature_type: 'UTR' },
      { feature_type: 'CDS' },
      { feature_type: 'exon' },
      { feature_type: 'CDS' },
      { feature_type: 'CDS' },
      { feature_type: 'exon' },
    ]
    const result = getFilteredRegions(testExons)

    const expectedExons: Exon[] = [
      { feature_type: 'CDS' },
      { feature_type: 'CDS' },
      { feature_type: 'CDS' },
    ]

    expect(result).toEqual(expectedExons)
  })

  it('only returns non UTR/CDS exons when no CDS exons are present', () => {
    const testExons: Exon[] = [
      { feature_type: 'UTR' },
      { feature_type: 'UTR' },
      { feature_type: 'exon' },
      { feature_type: 'UTR' },
      { feature_type: 'exon' },
      { feature_type: 'exon' },
    ]
    const result = getFilteredRegions(testExons)

    const expectedExons: any[] = [
      { feature_type: 'exon' },
      { feature_type: 'exon' },
      { feature_type: 'exon' },
    ]

    expect(result).toEqual(expectedExons)
  })
})

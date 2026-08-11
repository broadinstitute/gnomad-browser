import { describe, expect, test } from '@jest/globals'
import {
  countVariantLociAcrossHaplotypeRows,
  variantsForHaplotypeRow,
} from './haplotypeLocusCounts'

describe('haplotype locus counts', () => {
  test('reads variants from haploid and diploid row shapes', () => {
    const v1 = { variant_id: 'v1' }
    const v2 = { variant_id: 'v2' }

    expect(variantsForHaplotypeRow({ variants: { variants: [v1] } })).toEqual([v1])
    expect(variantsForHaplotypeRow({
      haplotypeA: { variants: [v1] },
      haplotypeB: { variants: [v2] },
    })).toEqual([v1, v2])
  })

  test('counts both chromosome copies and tolerates incomplete rows', () => {
    const counts = countVariantLociAcrossHaplotypeRows([
      { variants: { variants: [{ variant_id: 'v1' }] } },
      {
        haplotypeA: { variants: [{ variant_id: 'v1' }] },
        haplotypeB: { variants: [{ variant_id: 'v1' }, { variant_id: 'v2' }] },
      },
      {},
    ])

    expect(counts.get('v1')).toBe(3)
    expect(counts.get('v2')).toBe(1)
  })
})

import {
  excludeTargetVariantsForAutoDefaults,
  parseRestHaplotypeTargetDescriptor,
  type RestHaplotypeTargetDescriptor,
} from './haplotypeTargetDescriptor'

const descriptor: RestHaplotypeTargetDescriptor = {
  canonical_envelope: { chrom: '22', start: 100_000, stop: 100_100 },
  source_variant_ids: ['source-a', 'source-b'],
  selected_exact_allele_id: 'source-b~7',
  fixed_window: { chrom: '22', start: 50_000, stop: 150_100, flank_size: 50_000 },
}

describe('REST haplotype target descriptor', () => {
  test('accepts and preserves the complete display-only descriptor on the existing region request', () => {
    expect(
      parseRestHaplotypeTargetDescriptor(JSON.stringify(descriptor), {
        chrom: 'chr22',
        start: 50_000,
        stop: 150_100,
      })
    ).toEqual(descriptor)
  })

  test('enforces an exact contig-clipped ±50 kb window even when request and descriptor agree', () => {
    const arbitraryWindow = {
      ...descriptor,
      fixed_window: { ...descriptor.fixed_window, start: 60_000, stop: 140_100 },
    }
    expect(() =>
      parseRestHaplotypeTargetDescriptor(JSON.stringify(arbitraryWindow), {
        chrom: '22',
        start: 60_000,
        stop: 140_100,
      })
    ).toThrow('invalid target_descriptor')

    const clipped = {
      ...descriptor,
      canonical_envelope: { chrom: '22', start: 50_818_450, stop: 50_818_468 },
      fixed_window: {
        chrom: '22',
        start: 50_768_450,
        stop: 50_818_468,
        flank_size: 50_000 as const,
      },
    }
    expect(
      parseRestHaplotypeTargetDescriptor(JSON.stringify(clipped), {
        chrom: 'chr22',
        start: 50_768_450,
        stop: 50_818_468,
      })
    ).toEqual(clipped)
  })

  test('excludes every target source record and remaps carrier indices for auto-defaults', () => {
    expect(
      excludeTargetVariantsForAutoDefaults(
        [
          { source_variant_id: 'flank-a', id: 'a' },
          { source_variant_id: 'source-a', id: 'target-1' },
          { source_variant_id: 'flank-b', id: 'b' },
          { source_variant_id: 'source-b', id: 'target-2' },
        ],
        { copyA: [0, 1, 2, 3], copyB: [1, 3] },
        descriptor
      )
    ).toEqual({
      variants: [
        { source_variant_id: 'flank-a', id: 'a' },
        { source_variant_id: 'flank-b', id: 'b' },
      ],
      carrierVariantIndices: { copyA: [0, 1], copyB: [] },
    })
  })

  test.each([
    { ...descriptor, source_variant_ids: [] },
    { ...descriptor, selected_exact_allele_id: '' },
    { ...descriptor, fixed_window: { ...descriptor.fixed_window, flank_size: 10_000 } },
    { ...descriptor, fixed_window: { ...descriptor.fixed_window, start: 49_999 } },
  ])('fails closed for an invalid or request-mismatched descriptor', (invalid) => {
    expect(() =>
      parseRestHaplotypeTargetDescriptor(JSON.stringify(invalid), {
        chrom: '22',
        start: 50_000,
        stop: 150_100,
      })
    ).toThrow('invalid target_descriptor')
  })
})

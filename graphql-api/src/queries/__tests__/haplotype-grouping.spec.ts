import { reconstructSamplesFromVariants, createHaplotypeGroups } from '../haplotype-grouping'

describe('Haplotype Grouping Algorithm', () => {
  const mockESDocs = [
    {
      sample_id: 'S1',
      strand: 1,
      chrom: 'chr1',
      position: 100,
      alleles: ['A', 'G'],
      info_AF: [0.5],
    },
    {
      sample_id: 'S1',
      strand: 1,
      chrom: 'chr1',
      position: 200,
      alleles: ['C', 'T'],
      info_AF: [0.5],
    },
    {
      sample_id: 'S2',
      strand: 1,
      chrom: 'chr1',
      position: 100,
      alleles: ['A', 'G'],
      info_AF: [0.5],
    },
    {
      sample_id: 'S2',
      strand: 1,
      chrom: 'chr1',
      position: 200,
      alleles: ['C', 'T'],
      info_AF: [0.5],
    },
    {
      sample_id: 'S3',
      strand: 2,
      chrom: 'chr1',
      position: 100,
      alleles: ['A', 'G'],
      info_AF: [0.01],
    },
  ]

  it('reconstructs samples from flat documents', () => {
    const samples = reconstructSamplesFromVariants(mockESDocs)
    expect(samples.length).toBe(3)
    const s1 = samples.find((s) => s.sample_id === 'S1')
    expect(s1).toBeDefined()
    expect(s1!.variant_sets[0].variants.length).toBe(2)
  })

  it('groups identically matching variant sets', () => {
    const samples = reconstructSamplesFromVariants(mockESDocs)
    const result = createHaplotypeGroups(samples, 0, 300, 0.1, 'sample_count')

    // S1 and S2 should group together (same variants on strand 1 above threshold)
    // S3 has AF=0.01, below 0.1 threshold, so excluded
    expect(result.groups.length).toBe(1)
    expect(result.groups[0].samples.length).toBe(2)
    expect(result.groups[0].variants.variants.length).toBe(2)
  })

  it('filters by minimum allele frequency correctly', () => {
    const samples = reconstructSamplesFromVariants(mockESDocs)
    const result = createHaplotypeGroups(samples, 0, 300, 0.05, 'sample_count')

    // S3's variant is AF=0.01, so it fails the 0.05 threshold
    expect(result.groups.length).toBe(1)
    expect(result.groups[0].samples.find((s: any) => s.sample_id === 'S3')).toBeUndefined()
  })

  it('includes all variants when min allele freq is 0', () => {
    const samples = reconstructSamplesFromVariants(mockESDocs)
    const result = createHaplotypeGroups(samples, 0, 300, 0, 'sample_count')

    // With threshold 0, S3 should now form its own group
    expect(result.groups.length).toBe(2)
  })

  it('sorts by similarity_score', () => {
    const samples = reconstructSamplesFromVariants(mockESDocs)
    const result = createHaplotypeGroups(samples, 0, 300, 0, 'similarity_score')

    expect(result.groups.length).toBe(2)
  })
})

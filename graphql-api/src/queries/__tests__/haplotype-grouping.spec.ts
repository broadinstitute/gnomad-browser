import {
  assembleHaplotypeGroups,
  createHaplotypeGroups,
  createHaplotypeGroupsFromGrouped,
  reconstructSamplesFromVariants,
} from '../haplotype-grouping'

describe('Haplotype Grouping Algorithm', () => {
  const mockESDocs = [
    {
      sample_id: 'S1', strand: 1, chrom: 'chr1', position: 100, pos: 100,
      alleles: ['A', 'G'], info_AF: [0.5], freq: { af: 0.5 },
    },
    {
      sample_id: 'S1', strand: 1, chrom: 'chr1', position: 200, pos: 200,
      alleles: ['C', 'T'], info_AF: [0.5], freq: { af: 0.5 },
    },
    {
      sample_id: 'S2', strand: 1, chrom: 'chr1', position: 100, pos: 100,
      alleles: ['A', 'G'], info_AF: [0.5], freq: { af: 0.5 },
    },
    {
      sample_id: 'S2', strand: 1, chrom: 'chr1', position: 200, pos: 200,
      alleles: ['C', 'T'], info_AF: [0.5], freq: { af: 0.5 },
    },
    {
      sample_id: 'S3', strand: 2, chrom: 'chr1', position: 100, pos: 100,
      alleles: ['A', 'G'], info_AF: [0.01], freq: { af: 0.01 },
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

  it('retains distinct VCF strands in the grouped-row assembly path', () => {
    const groupedRow = (vcf_strand: number) => ({
      sample_id: 'same-sample',
      vcf_strand,
      positions: [100, 110], refs: ['A', 'C'], alts: ['G', 'T'], rsids: ['', ''],
      afs: [0.5, 0.01], acs: [2, 1], ans: [4, 4],
      allele_types: ['snv', 'snv'], allele_lengths: [0, 0],
      af_afrs: [null, null], af_amrs: [null, null], af_eass: [null, null],
      af_nfes: [null, null], af_sass: [null, null], cadd_phreds: [null, null],
      phylops: [null, null], sv_consequences_arr: [null, null], dbsnp_ids: [null, null],
      tr_ids: [null, null], tr_motifs_arr: [null, null], tr_strucs: [null, null],
      allele_methylations: [null, null], motif_counts_arr: [null, null],
      allele_purities: [null, null], short_read_match_ids: [null, null],
      major_consequences: [null, null],
    })

    const result = createHaplotypeGroupsFromGrouped(
      [groupedRow(1), groupedRow(2)] as any[], 'chr1', 0, 200, 0.1, 'sample_count'
    )

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].samples.map((sample: any) => ({
      sample_id: sample.sample_id,
      vcf_strand: sample.vcf_strand,
      phase_set: sample.phase_set,
    }))).toEqual([
      { sample_id: 'same-sample', vcf_strand: 1, phase_set: null },
      { sample_id: 'same-sample', vcf_strand: 2, phase_set: null },
    ])
    expect(result.groups[0].below_threshold.variants[0].in_haplotypes).toEqual([
      { sample_id: 'same-sample', vcf_strand: 1, phase_set: null },
      { sample_id: 'same-sample', vcf_strand: 2, phase_set: null },
    ])
  })

  it('retains VCF strand and phase set in the assignment assembly path', () => {
    const variant = (position: number, af: number, carriers: any[]) => ({
      position, ref: 'A', alt: position === 100 ? 'G' : 'T', rsid: '',
      info_AF: af, info_AC: 2, info_AN: 4, allele_type: 'snv', allele_length: 0,
      info_AF_afr: null, info_AF_amr: null, info_AF_eas: null,
      info_AF_nfe: null, info_AF_sas: null, cadd_phred: null, phylop: null,
      sv_consequences: [], dbsnp_id: null, tr_id: null, tr_motifs: null,
      tr_struc: null, allele_methylation: null, motif_counts: [], allele_purity: null,
      short_read_match_id: null, major_consequence: null, carriers,
    })
    const carriers = [
      ['same-sample', 1, 'ps-100'],
      ['same-sample', 2, 'ps-200'],
    ]
    const result = assembleHaplotypeGroups(
      [{ readable_id: 'chr1-100:A-G', carriers: carriers as any, sample_count: '2' }],
      [variant(100, 0.5, carriers), variant(110, 0.01, carriers)],
      'chr1', 0.1, 'sample_count'
    )

    expect(result.groups[0].samples.map((sample: any) => ({
      sample_id: sample.sample_id,
      vcf_strand: sample.vcf_strand,
      phase_set: sample.phase_set,
    }))).toEqual([
      { sample_id: 'same-sample', vcf_strand: 1, phase_set: 'ps-100' },
      { sample_id: 'same-sample', vcf_strand: 2, phase_set: 'ps-200' },
    ])
    expect(result.groups[0].below_threshold.variants[0]).toMatchObject({
      in_samples: ['same-sample', 'same-sample'],
      in_haplotypes: [
        { sample_id: 'same-sample', vcf_strand: 1, phase_set: 'ps-100' },
        { sample_id: 'same-sample', vcf_strand: 2, phase_set: 'ps-200' },
      ],
    })
  })
})

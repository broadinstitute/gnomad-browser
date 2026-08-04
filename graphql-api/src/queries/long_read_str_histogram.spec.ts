import {
  enrichVariantWithSTRHistogram,
  parseAlleleSizeDistribution,
  parseGenotypeDistribution,
} from './long_read_str_histogram'

const populations = [
  { key: 'AlleleSizeHistogram:afr:female', histogram: '18x:2,19x:3' },
  { key: 'AlleleSizeHistogram:afr:male', histogram: '19x:5' },
  { key: 'AlleleSizeHistogram:afr:unknown', histogram: '20x:7' },
  { key: 'BiallelicHistogram:afr:female', histogram: '18/19:2' },
  { key: 'BiallelicHistogram:afr:male', histogram: '19/19:3' },
  { key: 'BiallelicHistogram:afr:unknown', histogram: '19/20:4' },
]

describe('long-read STR histogram parsing', () => {
  it('maps only called female and male strata to XX and XY and preserves unknown', () => {
    const alleles = parseAlleleSizeDistribution(populations, 'T')!
    const genotypes = parseGenotypeDistribution(populations, 'T')!

    expect(alleles.map(({ sex }) => sex)).toEqual(['XX', 'XY', 'unknown'])
    expect(genotypes.map(({ sex }) => sex)).toEqual(['XX', 'XY', 'unknown'])
    expect(alleles.map(({ repunit }) => repunit)).toEqual(['T', 'T', 'T'])
    expect(
      alleles
        .flatMap(({ distribution }) => distribution)
        .reduce((sum, bin) => sum + bin.frequency, 0)
    ).toBe(17)
    expect(
      genotypes
        .flatMap(({ distribution }) => distribution)
        .reduce((sum, bin) => sum + bin.frequency, 0)
    ).toBe(9)
    expect(genotypes[2]).toMatchObject({
      sex: 'unknown',
      short_allele_repunit: 'T',
      long_allele_repunit: 'T',
      distribution: [
        { short_allele_repunit_count: 19, long_allele_repunit_count: 20, frequency: 4 },
      ],
    })
  })

  it('enriches a Y1 variant with the ancillary motif and falls back to existing motifs', () => {
    const variant = {
      variant_id: 'chr4-39279700-TRV-21~4',
      motifs: [],
      allele_size_distribution: null,
      genotype_distribution: null,
      max_repunits: null,
    }
    const enriched = enrichVariantWithSTRHistogram(variant, {
      motif: 'T',
      max_repeats: '24',
      populations,
    })

    expect(enriched.motifs).toEqual(['T'])
    expect(enriched.max_repunits).toBe(24)
    expect(enriched.allele_size_distribution[2]).toMatchObject({ sex: 'unknown', repunit: 'T' })
    expect(enriched.genotype_distribution[2]).toMatchObject({
      sex: 'unknown',
      short_allele_repunit: 'T',
      long_allele_repunit: 'T',
    })

    const fallback = enrichVariantWithSTRHistogram(
      { ...variant, motifs: ['TCCA', 'CCAT'] },
      { motif: '', populations }
    )
    expect(fallback.motifs).toEqual(['TCCA', 'CCAT'])
    expect(fallback.allele_size_distribution[0].repunit).toBe('TCCA,CCAT')
  })
})

import {
  aggregateTrLoci,
  getTrLocusKey,
  packTrLoci,
  type TrAlleleRecord,
} from './trLocusAggregation'

const allele = (overrides: Partial<TrAlleleRecord> = {}): TrAlleleRecord => ({
  variant_id: '1-100-A-AT',
  source_variant_id: 'tr-locus-1',
  chrom: '1',
  pos: 100,
  end: 110,
  allele_length: 1,
  main_reference_region: { chrom: '1', start: 100, stop: 110 },
  freq: { all: { af: 0.01 } },
  ...overrides,
})

describe('TR locus aggregation', () => {
  test('100 ALT records at one stable source locus produce one packed row', () => {
    const records = Array.from({ length: 100 }, (_, i) =>
      allele({ variant_id: `1-100-TR-${i}`, allele_length: i - 50 })
    )
    const loci = aggregateTrLoci(records)
    const packed = packTrLoci(loci)

    expect(loci).toHaveLength(1)
    expect(loci[0].alleles).toHaveLength(100)
    expect(packed.maxRows).toBe(1)
    // LongReadVariantTrack uses one 14px row per packed locus.
    expect(packed.maxRows * 14).toBe(14)
  })

  test('does not merge distinct stable loci merely because they overlap', () => {
    const loci = aggregateTrLoci([
      allele({ source_variant_id: 'catalog-a' }),
      allele({ source_variant_id: 'catalog-b', variant_id: 'other-alt' }),
    ])

    expect(loci).toHaveLength(2)
    expect(packTrLoci(loci).maxRows).toBe(2)
  })

  test('uses exact coordinates as the documented fallback identity', () => {
    const first = allele({ source_variant_id: null })
    const same = allele({ source_variant_id: null, variant_id: 'same-locus-alt' })
    const overlapping = allele({
      source_variant_id: null,
      variant_id: 'overlapping-locus',
      main_reference_region: { chrom: '1', start: 105, stop: 115 },
    })

    expect(getTrLocusKey(first)).toBe('coordinates:1:100:110')
    expect(aggregateTrLoci([first, same, overlapping])).toHaveLength(2)
  })

  test('retains signed extrema and maximum available ALT AF', () => {
    const locus = aggregateTrLoci([
      allele({ variant_id: 'deletion', allele_length: -23, freq: { all: { af: 0.004 } } }),
      allele({ variant_id: 'insertion', allele_length: 41, freq: { all: { af: 0.2 } } }),
      allele({ variant_id: 'middle', allele_length: 0, freq: null }),
    ])[0]

    expect(locus.minLengthDiff).toBe(-23)
    expect(locus.maxLengthDiff).toBe(41)
    expect(locus.maxAf).toBe(0.2)
    expect(locus.representative.variant_id).toBe('insertion')
  })

  test('leaves unavailable lengths and frequencies unavailable', () => {
    const locus = aggregateTrLoci([
      allele({ allele_length: null, freq: null }),
      allele({ variant_id: 'also-missing', allele_length: null, freq: { all: { af: null } } }),
    ])[0]

    expect(locus.minLengthDiff).toBeNull()
    expect(locus.maxLengthDiff).toBeNull()
    expect(locus.maxAf).toBeNull()
  })
})

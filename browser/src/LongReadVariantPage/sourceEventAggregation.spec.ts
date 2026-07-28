import {
  aggregateSourceEvents,
  getInsertionLengthDistribution,
  getSourceEventFamily,
  getSourceEventKey,
  packSourceEvents,
  type SourceEventRecord,
} from './sourceEventAggregation'

const allele = (overrides: Partial<SourceEventRecord> = {}): SourceEventRecord => ({
  variant_id: '1-100-A-ALT',
  source_variant_id: 'event-1',
  chrom: '1',
  pos: 100,
  end: 120,
  start: 100,
  stop: 120,
  allele_length: 20,
  allele_type: 'INS',
  main_reference_region: null,
  freq: { all: { af: 0.01 } },
  ...overrides,
})

describe('non-TR structural locus aggregation', () => {
  test('collapses 100 same-locus ALT records to one glyph row and retains max AF representative', () => {
    const records = Array.from({ length: 100 }, (_, i) =>
      allele({
        variant_id: `alt-${i}`,
        source_variant_id: `allele-specific-${i}`,
        allele_length: i + 1,
        freq: { all: { af: i / 1000 } },
      })
    )
    const events = aggregateSourceEvents(records)
    const packed = packSourceEvents(events)

    expect(events).toHaveLength(1)
    expect(events[0].alleles).toHaveLength(100)
    expect(events[0].maxAf).toBe(0.099)
    expect(events[0].representative.variant_id).toBe('alt-99')
    expect(packed.maxRows).toBe(1)
    expect(packed.maxRows * 14).toBe(14)
  })

  test('collapses the observed chr22 complex_dup allelic series despite allele-specific source IDs', () => {
    const ids = [
      'chr22-20075553-INS-845',
      'chr22-20075553-INS-846',
      'chr22-20075553-INS-848_1',
      'chr22-20075553-INS-848_2',
      'chr22-20075553-INS-849_1',
      'chr22-20075553-INS-849_6',
      'chr22-20075553-INS-850_4',
      'chr22-20075553-INS-853_1',
    ]
    const records = ids.map((id, index) =>
      allele({
        variant_id: `${id}~1`,
        source_variant_id: id,
        chrom: '22',
        pos: 20075553,
        end: 20075553,
        start: 20075553,
        stop: 20075553,
        allele_length: [845, 846, 848, 848, 849, 849, 850, 853][index],
        allele_type: 'complex_dup',
        freq: { all: { af: id.endsWith('849_1') ? 0.8674 : 0.0019 } },
      })
    )

    const events = aggregateSourceEvents(records)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      key: 'locus:duplication:22:20075553:20075553',
      family: 'duplication',
      minAbsoluteLength: 845,
      maxAbsoluteLength: 853,
    })
    expect(events[0].alleles).toHaveLength(ids.length)
    expect(events[0].representative.source_variant_id).toBe('chr22-20075553-INS-849_1')
    expect(packSourceEvents(events).maxRows).toBe(1)
  })

  test('keeps distinct same-position event families separate', () => {
    const events = aggregateSourceEvents([
      allele({ source_variant_id: 'chr22-20075553-INS-849_1', allele_type: 'complex_dup' }),
      allele({ source_variant_id: 'chr22-20075553-INS-1387', allele_type: 'ins' }),
      allele({ source_variant_id: 'chr22-20075553-INV-20', allele_type: 'inv' }),
    ])

    expect(events.map((event) => event.family).sort()).toEqual([
      'duplication',
      'insertion',
      'inversion',
    ])
  })

  test('packs independently located overlapping events separately', () => {
    const events = aggregateSourceEvents([
      allele({ source_variant_id: 'event-a', start: 100, stop: 130 }),
      allele({ source_variant_id: 'event-b', variant_id: 'other', start: 110, stop: 140 }),
    ])

    expect(events).toHaveLength(2)
    expect(packSourceEvents(events).maxRows).toBe(2)
  })

  test('identity is exact and family-aware, never overlap- or source-prefix-based', () => {
    const first = allele({ source_variant_id: 'chr1-100-INS-20' })
    const sameFamily = allele({
      source_variant_id: 'unrelated-format',
      variant_id: 'dup-subtype',
      allele_type: 'complex_dup',
    })
    const sameDupFamily = allele({
      source_variant_id: 'another-id',
      variant_id: 'dup',
      allele_type: 'dup',
    })
    const overlap = allele({
      source_variant_id: 'chr1-105-INS-20',
      variant_id: 'overlap',
      start: 105,
      stop: 125,
    })

    expect(getSourceEventKey(first)).toBe('locus:insertion:1:100:120')
    expect(getSourceEventFamily('complex_dup')).toBe('duplication')
    expect(aggregateSourceEvents([first, sameFamily, sameDupFamily, overlap])).toHaveLength(3)
  })

  test('reports normalized subtype constituents and coordinate/length ranges', () => {
    const event = aggregateSourceEvents([
      allele({ allele_type: 'DUP', allele_length: 30, start: 100, stop: 130 }),
      allele({
        variant_id: 'complex',
        source_variant_id: 'other-allele',
        allele_type: 'COMPLEX_DUP',
        allele_length: 45,
        start: 100,
        stop: 130,
      }),
    ])[0]

    expect(event.subtypes).toEqual(['DUP', 'COMPLEX_DUP'])
    expect(event).toMatchObject({
      start: 100,
      stop: 130,
      minStart: 100,
      maxStart: 100,
      minStop: 130,
      maxStop: 130,
      minSignedLength: 30,
      maxSignedLength: 45,
      minAbsoluteLength: 30,
      maxAbsoluteLength: 45,
    })
  })

  test('keeps missing values unavailable and omits missing insertion lengths', () => {
    const event = aggregateSourceEvents([
      allele({ allele_length: null, freq: null }),
      allele({ variant_id: 'also-missing', allele_length: null, freq: { all: { af: null } } }),
    ])[0]

    expect(event.minSignedLength).toBeNull()
    expect(event.maxAbsoluteLength).toBeNull()
    expect(event.maxAf).toBeNull()
    expect(getInsertionLengthDistribution(event.alleles)).toEqual([])
  })

  test('builds an absolute insertion-length distribution per ALT record', () => {
    expect(
      getInsertionLengthDistribution([
        allele({ allele_length: 12 }),
        allele({ variant_id: 'same-length', allele_length: 12 }),
        allele({ variant_id: 'negative-encoding', allele_length: -20 }),
        allele({ variant_id: 'missing', allele_length: null }),
      ])
    ).toEqual([
      { length_diff: 12, pop: 'N/A', count: 1 },
      { length_diff: 12, pop: 'N/A', count: 1 },
      { length_diff: 20, pop: 'N/A', count: 1 },
    ])
  })
})

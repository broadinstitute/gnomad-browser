import {
  aggregateSourceEvents,
  getInsertionLengthDistribution,
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

describe('non-TR source event aggregation', () => {
  test('collapses 100 ALT records to one glyph row and retains max AF representative', () => {
    const records = Array.from({ length: 100 }, (_, i) =>
      allele({
        variant_id: `alt-${i}`,
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

  test('packs genuinely distinct overlapping source IDs separately', () => {
    const events = aggregateSourceEvents([
      allele({ source_variant_id: 'event-a' }),
      allele({ source_variant_id: 'event-b', variant_id: 'other' }),
    ])

    expect(events).toHaveLength(2)
    expect(packSourceEvents(events).maxRows).toBe(2)
  })

  test('fallback identity is exact and type-aware, never overlap-based', () => {
    const first = allele({ source_variant_id: null })
    const same = allele({ source_variant_id: null, variant_id: 'same' })
    const otherType = allele({
      source_variant_id: null,
      variant_id: 'deletion',
      allele_type: 'DEL',
    })
    const overlap = allele({
      source_variant_id: null,
      variant_id: 'overlap',
      start: 105,
      stop: 125,
    })

    expect(getSourceEventKey(first)).toBe('coordinates:ins:1:100:120')
    expect(aggregateSourceEvents([first, same, otherType, overlap])).toHaveLength(3)
  })

  test('reports heterogeneous subtype constituents and coordinate/length ranges', () => {
    const event = aggregateSourceEvents([
      allele({ allele_type: 'INV', allele_length: -30, start: 100, stop: 130 }),
      allele({
        variant_id: 'complex',
        allele_type: 'COMPLEX',
        allele_length: 45,
        start: 98,
        stop: 143,
      }),
    ])[0]

    expect(event.subtypes).toEqual(['INV', 'COMPLEX'])
    expect(event).toMatchObject({
      start: 98,
      stop: 143,
      minStart: 98,
      maxStart: 100,
      minStop: 130,
      maxStop: 143,
      minSignedLength: -30,
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

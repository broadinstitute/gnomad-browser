import {
  aggregateSourceEvents,
  getDeletionAlleleFrequencyPoints,
  getInsertionLengthDistribution,
  getSourceEventFamily,
  getSourceEventKey,
  packSourceEvents,
  type SourceEventRecord,
} from './sourceEventAggregation'
import { assignBand, getVariantCategory } from './variantUtils'

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

  test('groups variable-length chr22 deletions by exact left anchor into two bounded glyphs', () => {
    const deletionSeries = (anchor: number, lengths: number[]) =>
      lengths.map((length, index) =>
        allele({
          variant_id: `22-${anchor}-del-${length}-${index}`,
          source_variant_id: `source-${anchor}-${length}-${index}`,
          chrom: '22',
          pos: anchor,
          end: anchor + length,
          start: anchor,
          stop: anchor + length,
          allele_length: -length,
          allele_type: index % 2 === 0 ? 'DEL' : 'ALU_DEL',
          freq: { all: { ac: index + 1, an: 200, af: (index + 1) / 200 } },
        })
      )
    const records = [
      ...deletionSeries(20077152, [7, 8, 9, 10, 12, 16, 17]),
      ...deletionSeries(20077156, [2, 3, 10, 11, 13, 20]),
    ]

    const events = aggregateSourceEvents(records).sort((a, b) => a.start - b.start)

    expect(events).toHaveLength(2)
    expect(events.map((event) => event.key)).toEqual([
      'locus:deletion:22:20077152',
      'locus:deletion:22:20077156',
    ])
    expect(events[0]).toMatchObject({
      start: 20077152,
      stop: 20077169,
      minAbsoluteLength: 7,
      maxAbsoluteLength: 17,
    })
    expect(events[1]).toMatchObject({
      start: 20077156,
      stop: 20077176,
      minAbsoluteLength: 2,
      maxAbsoluteLength: 20,
    })
    expect(events.map((event) => event.alleles.length)).toEqual([7, 6])
    expect(packSourceEvents(events)).toMatchObject({ maxRows: 2 })
  })

  test('keeps independently anchored overlapping deletions and interval-defined SVs separate', () => {
    const events = aggregateSourceEvents([
      allele({ variant_id: 'del-a', allele_type: 'del', start: 100, stop: 130 }),
      allele({ variant_id: 'del-b', allele_type: 'sva_deletion', start: 105, stop: 125 }),
      allele({ variant_id: 'inv-a', allele_type: 'inv', start: 100, stop: 130 }),
      allele({ variant_id: 'inv-b', allele_type: 'inv', start: 100, stop: 140 }),
      allele({ variant_id: 'cnv-a', allele_type: 'cnv', start: 100, stop: 130 }),
      allele({ variant_id: 'cnv-b', allele_type: 'cnv', start: 100, stop: 140 }),
    ])

    expect(getVariantCategory('sva_deletion')).toBe('deletion')
    expect(assignBand('sva_deletion')).toBe('del')
    expect(events).toHaveLength(6)
    expect(events.map((event) => event.key)).toEqual(
      expect.arrayContaining([
        'locus:deletion:1:100',
        'locus:deletion:1:105',
        'locus:inversion:1:100:130',
        'locus:inversion:1:100:140',
        'locus:cnv:1:100:130',
        'locus:cnv:1:100:140',
      ])
    )
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

  test('preserves per-record deletion AF/AC/AN values without deriving missing values', () => {
    const points = getDeletionAlleleFrequencyPoints([
      allele({ allele_length: -7, freq: { all: { af: 0.1, ac: 2, an: 20 } } }),
      allele({ variant_id: 'missing-af', allele_length: -8, freq: { all: { ac: 1, an: 18 } } }),
      allele({
        variant_id: 'missing-length-and-an',
        allele_length: null,
        freq: { all: { af: 0.2, ac: 3 } },
      }),
    ])

    expect(points.map(({ allele: _allele, ...point }) => point)).toEqual([
      { length: 7, af: 0.1, ac: 2, an: 20 },
      { length: 8, af: null, ac: 1, an: 18 },
      { length: null, af: 0.2, ac: 3, an: null },
    ])
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

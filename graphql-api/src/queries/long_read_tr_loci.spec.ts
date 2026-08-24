import { jest } from '@jest/globals'

const mockQuery = jest.fn()
jest.mock('../clickhouse', () => ({
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))
jest.mock('../cache', () => ({ withCache: (fn: any) => fn }))

// The ClickHouse mock must be installed before this module initializes its client.
// eslint-disable-next-line import/first
import {
  buildWholeRecordAlleleLandscape,
  buildWholeRecordGenotypeLandscape,
  decodeTrAlleleCursor,
  encodeTrAlleleCursor,
  fetchLongReadTrLocus,
  MAX_TR_LOCUS_PAGE_SIZE,
  MAX_TR_SELECTED_ALLELE_DETAIL_BYTES,
} from './long_read_tr_loci'

const httLocusId =
  '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG'
const httSourceTrid = httLocusId.split('+').join(',')
const sourceVariantId = 'chr4-3074876-TRV-164'

const source = (
  cohort: 'hgsvc_hprc' | 'aou',
  options: { carriers?: boolean; metadata?: boolean } = {}
) => ({
  database: 'test',
  release: 'y1',
  cohort,
  reference_genome: 'GRCh38',
  chrom: 'chr4',
  load_scope: 'full_chromosome',
  run_id: `run-${cohort}`,
  state: 'accepted_frozen' as const,
  metadata_run_id: options.metadata ? 'metadata-1' : null,
  carriers_available: options.carriers ?? cohort === 'hgsvc_hprc',
})

const result = (rows: any[]) => Promise.resolve({ json: async () => rows })

const compactAlleles = (altCount: number, an: number) =>
  Array.from({ length: altCount }, (_, offset) => {
    let alleleLength = offset - 20
    let ac = 1
    if (altCount === 72) {
      alleleLength = 0
      ac = 0
      if (offset === 0) {
        alleleLength = -24
        ac = 292
      } else if (offset === 71) {
        alleleLength = 48
        ac = 264
      }
    }
    return {
      source_variant_id: sourceVariantId,
      alt_index: offset + 1,
      ref_allele: 'ACAGCAG',
      alt: `A${'CAG'.repeat(offset + 1)}`,
      allele_length: alleleLength,
      ac,
      an,
      af: ac / an,
    }
  })

const summary = (altCount: number, an: number) => {
  const purity = new Array(altCount + 1).fill(null)
  purity[altCount] = 0.97
  const ac = new Array(altCount).fill(altCount === 72 ? 0 : 1)
  if (altCount === 72) {
    ac[0] = 292
    ac[71] = 264
  }
  return {
    task_id: 'task-1',
    attempt_id: 'attempt-1',
    position: 3074876,
    source_variant_id: sourceVariantId,
    alt_count: altCount,
    ac,
    an,
    af: ac.map((value) => value / an),
    source_info_json: JSON.stringify({
      TRID: httSourceTrid,
      MOTIFS: 'CAA,CCG,CCT,CAG,GCC',
      STRUC: '<VC172773>',
      AP_allele: purity,
      SOURCE: 'TRGT',
    }),
  }
}

const selectedAlt72 = {
  source_variant_id: sourceVariantId,
  alt_index: 72,
  ref_allele: 'C'.repeat(164),
  alt: 'C'.repeat(212),
  allele_length: 48,
  ac: 264,
  an: 584,
  af: 264 / 584,
  rsids: ['rs-test'],
  filters: [],
  cadd_phred: null,
  phylop: null,
  major_consequence: 'intron_variant',
  short_read_match_id: null,
  short_read_match_type: null,
  short_read_match_source: null,
}

describe('long-read TR locus query contract', () => {
  beforeEach(() => mockQuery.mockReset())

  test('uses versioned source/ALT keyset cursors', () => {
    const encoded = encodeTrAlleleCursor({ sourceVariantId, altIndex: 50 })
    expect(decodeTrAlleleCursor(encoded)).toEqual({ version: 1, sourceVariantId, altIndex: 50 })
    expect(decodeTrAlleleCursor('not-a-cursor')).toBeNull()
  })

  test('returns complete, privacy-safe HTT whole-record aggregates and selected detail', async () => {
    mockQuery
      .mockImplementationOnce(() => result([summary(72, 584)]))
      .mockImplementationOnce(() => result(compactAlleles(72, 584)))
      .mockImplementationOnce(() =>
        result([
          {
            source_variant_id: sourceVariantId,
            alt_index: 1,
            division: 'afr_XX',
            ac: 20,
            an: 90,
            af: 20 / 90,
          },
        ])
      )
      .mockImplementationOnce(() => result([{ unique_carrier_count: 291 }]))
      .mockImplementationOnce(() =>
        result([
          {
            ancestry_group: 'afr',
            sex: 'XX',
            allele_pair: [0, 0],
            people: 14,
            phased_people: 0,
            invalid_people: 0,
          },
          {
            ancestry_group: 'afr',
            sex: 'XX',
            allele_pair: [1, 1],
            people: 146,
            phased_people: 140,
            invalid_people: 0,
          },
          {
            ancestry_group: 'nfe',
            sex: 'XY',
            allele_pair: [72, 72],
            people: 132,
            phased_people: 130,
            invalid_people: 0,
          },
        ])
      )
      .mockImplementationOnce(() => result([selectedAlt72]))

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'hgsvc_hprc',
      first: 600,
      selectedAllele: `${sourceVariantId}~72`,
      source: source('hgsvc_hprc', { carriers: true, metadata: true }),
    })

    const summaryRequest = mockQuery.mock.calls[0][0] as any
    expect(summaryRequest.query).toContain('length(alts) AS alt_count')
    expect(summaryRequest.query).not.toContain('ref_allele')
    expect(summaryRequest.query).toContain('LIMIT {limit:UInt16}')
    expect(summaryRequest.query_params.limit).toBe(MAX_TR_LOCUS_PAGE_SIZE + 1)
    expect(locus).toMatchObject({
      id: httLocusId,
      source_trid: httSourceTrid,
      exact_alt_count: 72,
      exact_alt_count_complete: true,
      delta_min: -24,
      delta_max: 48,
      called_allele_count: 584,
      called_sample_count: 292,
      unique_carrier_count: 291,
      selected_allele_valid: true,
      selected_allele_unavailable_reason: null,
      component_measurement_available: false,
      region: { chrom: '4', start0: 3074876, end0: 3075040, size: 164 },
    })
    expect(locus.components).toHaveLength(6)
    expect(locus.components[2]).toEqual({
      chrom: '4',
      start0: 3074939,
      end0: 3074966,
      motif: 'CCG',
    })
    expect(locus.components[5].motif).toBe('CCG')
    expect(locus.whole_record_allele_landscape).toMatchObject({
      status: 'AVAILABLE',
      called_alleles: 584,
      non_reference_called_alleles: 556,
      reference_called_alleles: 28,
      exact_alt_count: 72,
    })
    expect(locus.whole_record_allele_landscape.bins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ delta: -24, called_alleles: 292, exact_alt_count: 1 }),
        expect.objectContaining({ delta: 48, called_alleles: 264, exact_alt_count: 1 }),
      ])
    )
    expect(locus.whole_record_genotype_landscape).toMatchObject({
      status: 'AVAILABLE',
      reference_allele_id: 'REFERENCE',
      called_samples: 292,
      called_alleles: 584,
    })
    expect(locus.selected_allele).toMatchObject({
      variant_id: `${sourceVariantId}~72`,
      source_variant_id: sourceVariantId,
      alt_index: 72,
      alt: 'C'.repeat(212),
      length: 48,
      motif_purity: 0.97,
      motif_purity_source: 'source_ap_allele',
      decomposition_status: 'UNAVAILABLE_COMPOUND_LOCUS',
      source_run_id: 'run-hgsvc_hprc',
    })
    expect(locus.alleles.nodes).toHaveLength(72)
    expect(locus.alleles.nodes[0]).toMatchObject({ ref: 'ACAGCAG', alt: 'ACAG' })
    const aggregateJson = JSON.stringify({
      index: locus.alleles,
      alleles: locus.whole_record_allele_landscape,
      genotypes: locus.whole_record_genotype_landscape,
    })
    expect(aggregateJson).toContain('ACAG')
    expect(aggregateJson).not.toContain('sample_id')
  })

  test('keeps valid compact metadata but withholds over-bound selected sequence detail', async () => {
    const overBoundAlt = 'G'.repeat(MAX_TR_SELECTED_ALLELE_DETAIL_BYTES)
    mockQuery
      .mockImplementationOnce(() => result([summary(1, 2)]))
      .mockImplementationOnce(() =>
        result([
          {
            source_variant_id: sourceVariantId,
            alt_index: 1,
            allele_length: MAX_TR_SELECTED_ALLELE_DETAIL_BYTES - 1,
            ac: 1,
            an: 2,
            af: 0.5,
          },
        ])
      )
      .mockImplementationOnce(() => result([]))
      .mockImplementationOnce(() =>
        result([
          {
            ...selectedAlt72,
            alt_index: 1,
            ref_allele: 'C',
            alt: overBoundAlt,
            allele_length: MAX_TR_SELECTED_ALLELE_DETAIL_BYTES - 1,
            ac: 1,
            an: 2,
            af: 0.5,
          },
        ])
      )

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'aou',
      first: 50,
      selectedAllele: `${sourceVariantId}~1`,
      source: source('aou', { carriers: false }),
    })

    expect(locus).toMatchObject({
      selected_allele_valid: true,
      selected_allele: null,
      selected_allele_unavailable_reason: 'SELECTED_ALLELE_DETAIL_BYTE_BOUND_EXCEEDED',
      alleles: {
        nodes: [
          expect.objectContaining({
            variant_id: `${sourceVariantId}~1`,
            source_variant_id: sourceVariantId,
            alt_index: 1,
            ref: null,
            alt: null,
            length: MAX_TR_SELECTED_ALLELE_DETAIL_BYTES - 1,
            freq: { all: { ac: 1, an: 2, af: 0.5 }, populations: [] },
          }),
        ],
      },
    })
    expect(JSON.stringify(locus)).not.toContain('G'.repeat(100))
    const selectedRequest = mockQuery.mock.calls[3][0] as any
    expect(JSON.stringify(selectedRequest.query_params)).not.toContain(overBoundAlt)
  })

  test('keeps all 497 AoU exact IDs reachable but makes carrier-only genotype data explicit', async () => {
    mockQuery
      .mockImplementationOnce(() => result([summary(497, 1000)]))
      .mockImplementationOnce(() => result(compactAlleles(497, 1000)))
      .mockImplementationOnce(() => result([]))

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'aou',
      first: 600,
      source: source('aou', { carriers: false }),
    })

    expect(locus).toMatchObject({
      exact_alt_count: 497,
      exact_alt_count_complete: true,
      unique_carrier_count: null,
      whole_record_genotype_landscape: {
        status: 'UNAVAILABLE',
        reason_code: 'CARRIER_CALLS_NOT_AVAILABLE',
      },
    })
    expect(locus.alleles.nodes).toHaveLength(497)
    expect(locus.alleles.nodes.at(-1).variant_id).toBe(`${sourceVariantId}~497`)
    expect(
      mockQuery.mock.calls.some(([request]: any[]) => request.query.includes('lr_y1_carriers'))
    ).toBe(false)
  })

  test('fails closed instead of returning a partial aggregate above the hard ALT bound', async () => {
    mockQuery
      .mockImplementationOnce(() => result([summary(601, 1202)]))
      .mockImplementationOnce(() => result(compactAlleles(601, 1202)))

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'aou',
      first: 600,
      selectedAllele: `${sourceVariantId}~601`,
      source: source('aou', { carriers: false }),
    })

    expect(locus).toMatchObject({
      exact_alt_count: 601,
      exact_alt_count_complete: false,
      selected_allele_valid: true,
      selected_allele: null,
      selected_allele_unavailable_reason: 'ALT_COUNT_EXCEEDS_600',
      exact_alt_count_unavailable_reason: 'ALT_COUNT_EXCEEDS_600',
      delta_min: null,
      delta_max: null,
      whole_record_allele_landscape: {
        status: 'UNAVAILABLE',
        reason_code: 'ALT_COUNT_EXCEEDS_600',
      },
    })
    expect(locus.alleles.nodes).toEqual([])
  })

  test('rejects page sizes over the hard bound before querying', async () => {
    expect(MAX_TR_LOCUS_PAGE_SIZE).toBe(600)
    await expect(
      fetchLongReadTrLocus({ id: httLocusId, cohort: 'aou', first: 601, source: source('aou') })
    ).rejects.toThrow('INVALID_TR_LOCUS_PAGE_SIZE')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  test('fails closed on malformed or nonidentical source TRID metadata', async () => {
    mockQuery.mockImplementationOnce(() =>
      result([
        {
          ...summary(1, 2),
          source_info_json: JSON.stringify({ TRID: '4-3074876-3074933-CAA' }),
        },
      ])
    )
    await expect(
      fetchLongReadTrLocus({ id: httLocusId, cohort: 'aou', source: source('aou') })
    ).rejects.toThrow('TR_LOCUS_INVARIANT')
  })
})

describe('whole-record aggregate integrity', () => {
  const compact = [
    {
      source_variant_id: sourceVariantId,
      alt_index: 1,
      allele_length: 0,
      ac: 1,
      an: 2,
      af: 0.5,
    },
  ]

  test('distinguishes reference from a zero-delta exact ALT in genotype pairs', () => {
    const landscape: any = buildWholeRecordGenotypeLandscape({
      rows: [
        {
          ancestry_group: 'afr',
          sex: 'XX',
          allele_pair: [0, 1],
          people: 1,
          phased_people: 1,
          invalid_people: 0,
        },
      ],
      alleles: compact,
      expectedCalledAlleles: 2,
    })
    expect(landscape).toMatchObject({ status: 'AVAILABLE', called_samples: 1 })
    expect(landscape.cells[0]).toMatchObject({
      shorter_delta: 0,
      longer_delta: 0,
      pairs: [
        expect.objectContaining({
          shorter_allele_id: `${sourceVariantId}~1`,
          longer_allele_id: 'REFERENCE',
        }),
      ],
    })
  })

  test('rejects genotype totals that do not reproduce exact ALT counts', () => {
    expect(
      buildWholeRecordGenotypeLandscape({
        rows: [
          {
            ancestry_group: 'afr',
            sex: 'XX',
            allele_pair: [0, 0],
            people: 1,
            phased_people: 0,
            invalid_people: 0,
          },
        ],
        alleles: compact,
        expectedCalledAlleles: 2,
      })
    ).toMatchObject({ status: 'UNAVAILABLE', reason_code: 'GENOTYPE_TOTAL_DOES_NOT_RECONCILE' })
  })

  test('retains every exact ID in equal-length allele bins and aligned purity only', () => {
    const second = { ...compact[0], alt_index: 2, ac: 1, an: 3, af: 1 / 3 }
    const first = { ...compact[0], an: 3, af: 1 / 3 }
    const landscape = buildWholeRecordAlleleLandscape({
      alleles: [first, second],
      frequencyRows: [],
      sourceRecordCount: 1,
      purityByAllele: new Map([[`${sourceVariantId}\u00001`, 0.99]]),
    })
    expect(landscape).toMatchObject({
      status: 'AVAILABLE',
      called_alleles: 3,
      non_reference_called_alleles: 2,
      bins: [
        expect.objectContaining({
          delta: 0,
          exact_alt_count: 2,
          allele_ids: [`${sourceVariantId}~1`, `${sourceVariantId}~2`],
        }),
      ],
      purity_points: [expect.objectContaining({ allele_id: `${sourceVariantId}~1` })],
    })
  })

  test('fails stratified controls closed when stratum counts do not reconcile', () => {
    const alleles = [
      { ...compact[0], ac: 1 },
      { ...compact[0], alt_index: 2, ac: 1 },
    ]
    const frequencyRows = alleles.map((allele) => ({
      source_variant_id: allele.source_variant_id,
      alt_index: allele.alt_index,
      division: 'afr_XX',
      ac: 2,
      an: 2,
      af: 1,
    }))
    const landscape: any = buildWholeRecordAlleleLandscape({
      alleles,
      frequencyRows,
      sourceRecordCount: 1,
      purityByAllele: new Map(),
    })
    expect(landscape).toMatchObject({
      status: 'AVAILABLE',
      stratified_available: false,
      stratified_unavailable_reason: 'MALFORMED_STRATIFIED_FREQUENCIES',
      ancestry_groups: [],
      sexes: [],
      bins: [expect.objectContaining({ stacks: [] })],
    })
  })
})

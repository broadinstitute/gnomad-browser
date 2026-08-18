import { jest } from '@jest/globals'

const mockQuery = jest.fn()
jest.mock('../clickhouse', () => ({
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))
jest.mock('../cache', () => ({ withCache: (fn: any) => fn }))

// The ClickHouse mock must be installed before this module initializes its client.
// eslint-disable-next-line import/first
import {
  decodeTrAlleleCursor,
  encodeTrAlleleCursor,
  fetchLongReadTrLocus,
} from './long_read_tr_loci'

const locusId = '4-39348424-39348479-AAAAG'
const sourceVariantId = 'chr4-39348424-TRV-55'
const source = (cohort: 'hgsvc_hprc' | 'aou') => ({
  database: 'test',
  release: 'y1',
  cohort,
  reference_genome: 'GRCh38',
  chrom: 'chr4',
  load_scope: 'full_chromosome',
  run_id: `run-${cohort}`,
  state: 'accepted_frozen' as const,
  metadata_run_id: null,
  carriers_available: cohort === 'hgsvc_hprc',
})

const result = (rows: any[]) => Promise.resolve({ json: async () => rows })

const summary = (altCount: number) => {
  const motifCounts = new Array(altCount + 1).fill(null)
  const purity = new Array(altCount + 1).fill(null)
  motifCounts[7] = 10
  purity[7] = 1
  return {
    position: 39348424,
    source_variant_id: sourceVariantId,
    ref_allele: `A${'AAAAG'.repeat(11)}`,
    alts: new Array(altCount).fill('A'),
    ac: new Array(altCount).fill(1),
    an: 582,
    af: new Array(altCount).fill(0.001),
    allele_lengths: new Array(altCount).fill(0),
    source_info_json: JSON.stringify({
      TRID: locusId,
      MOTIFS: 'AAAAG',
      STRUC: '(AAAAG)n',
      MC_allele: motifCounts,
      AP_allele: purity,
      SOURCE: 'TRGT',
    }),
  }
}

const alt7 = {
  source_variant_id: sourceVariantId,
  alt_index: 7,
  ref_allele: `A${'AAAAG'.repeat(11)}`,
  alt: `A${'AAAAG'.repeat(10)}`,
  allele_length: -5,
  ac: 135,
  an: 582,
  af: 0.231959,
}

describe('long-read TR locus query contract', () => {
  beforeEach(() => mockQuery.mockReset())

  test('uses versioned source/ALT keyset cursors', () => {
    const encoded = encodeTrAlleleCursor({ sourceVariantId, altIndex: 50 })
    expect(decodeTrAlleleCursor(encoded)).toEqual({ version: 1, sourceVariantId, altIndex: 50 })
    expect(decodeTrAlleleCursor('not-a-cursor')).toBeNull()
  })

  test.each([
    ['hgsvc_hprc', 200, 492],
    ['aou', 682, null],
  ] as const)(
    'keeps %s authoritative ALT totals and carrier availability separate',
    async (cohort, altCount, expectedCarriers) => {
      mockQuery
        .mockImplementationOnce(() => result([summary(altCount)]))
        .mockImplementationOnce(() => result([alt7]))
        .mockImplementationOnce(() => result([{ ...alt7, id: 'afr', ac: 20, an: 100, af: 0.2 }]))
      if (cohort === 'hgsvc_hprc') {
        mockQuery.mockImplementationOnce(() => result([{ unique_carrier_count: 492 }]))
      }

      const locus = await fetchLongReadTrLocus({
        id: locusId,
        cohort,
        first: 50,
        selectedAllele: `${sourceVariantId}~7`,
        source: source(cohort),
      })

      expect(locus).toMatchObject({
        id: locusId,
        lr_cohort: cohort,
        total_alleles: altCount,
        unique_carrier_count: expectedCarriers,
        selected_allele_valid: true,
      })
      expect(locus.alleles.nodes[0]).toMatchObject({
        variant_id: `${sourceVariantId}~7`,
        alt_index: 7,
        alt_count: altCount,
        repeat_count: 10,
        repeat_count_source: 'source_mc_allele',
        motif_purity: 1,
        length: -5,
        freq: { all: { ac: 135, an: 582, af: 0.231959 } },
      })
      for (const [request] of mockQuery.mock.calls as any[]) {
        expect(request.query_params).toMatchObject({
          cohort,
          runId: `run-${cohort}`,
          chrom: 'chr4',
        })
      }
      if (cohort === 'aou') {
        expect(
          mockQuery.mock.calls.some(([request]: any[]) => request.query.includes('lr_y1_carriers'))
        ).toBe(false)
      }
    }
  )

  test('rejects page sizes over the hard bound before querying', async () => {
    await expect(
      fetchLongReadTrLocus({ id: locusId, cohort: 'aou', first: 101, source: source('aou') })
    ).rejects.toThrow('INVALID_TR_LOCUS_PAGE_SIZE')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  test('fails closed on malformed or nonidentical source TRID metadata', async () => {
    mockQuery.mockImplementationOnce(() =>
      result([
        {
          ...summary(1),
          source_info_json: JSON.stringify({ TRID: '4-39348424-39348479-CAA' }),
        },
      ])
    )
    await expect(
      fetchLongReadTrLocus({ id: locusId, cohort: 'aou', source: source('aou') })
    ).rejects.toThrow('TR_LOCUS_INVARIANT')
  })
})

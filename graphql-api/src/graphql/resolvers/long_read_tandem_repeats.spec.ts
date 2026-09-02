import { jest } from '@jest/globals'

jest.mock('../../queries/long_read_tr_histograms', () => ({
  fetchLongReadTrRepeatCountPlots: jest.fn(),
}))
jest.mock('../../queries/long_read_tr_loci', () => ({
  fetchLongReadTrLocus: jest.fn(),
  MAX_TR_LOCUS_PAGE_SIZE: 600,
}))
jest.mock('../../queries/long_read_y1_provenance', () => ({ getY1SourceSnapshot: jest.fn() }))
jest.mock('../../queries/long_read_tr_primary_repeat', () => ({
  resolveLongReadTrPrimaryRepeat: jest.fn(),
}))
jest.mock('../../queries/long_read_tr_primary_motif_measurement', () => ({
  containedPrimaryMotifFailureReason: jest.fn(() => 'PRODUCT_IDENTITY_MISMATCH'),
  fetchLongReadTrPrimaryMotifMeasurementUncached: jest.fn(),
  unavailablePrimaryMotifMeasurement: jest.fn((reason_code, motif, biological_role) => ({
    status: 'UNAVAILABLE',
    reason_code,
    motif,
    biological_role,
  })),
}))
jest.mock('../../queries/long_read_tr_short_read_distributions', () => ({
  resolveLongReadTrShortReadDistributions: jest.fn(),
}))
jest.mock('../../queries/long_read_tr_reference', () => ({
  buildLongReadTrReferenceConnection: jest.fn(),
  legacyMatchesFromContext: jest.fn(),
  resolveLongReadTrShortReadContext: jest.fn(),
}))
jest.mock('./ancillary-availability', () => ({ getY1AncillaryRoute: jest.fn(() => ({})) }))

// eslint-disable-next-line import/first
import { fetchLongReadTrRepeatCountPlots } from '../../queries/long_read_tr_histograms'
// eslint-disable-next-line import/first
import { fetchLongReadTrLocus } from '../../queries/long_read_tr_loci'
// eslint-disable-next-line import/first
import { resolveLongReadTrPrimaryRepeat } from '../../queries/long_read_tr_primary_repeat'
// eslint-disable-next-line import/first
import { fetchLongReadTrPrimaryMotifMeasurementUncached } from '../../queries/long_read_tr_primary_motif_measurement'
// eslint-disable-next-line import/first
import { resolveLongReadTrShortReadContext } from '../../queries/long_read_tr_reference'
// eslint-disable-next-line import/first
import { getY1SourceSnapshot } from '../../queries/long_read_y1_provenance'
// eslint-disable-next-line import/first
import resolvers from './long_read_tandem_repeats'

const fetchPlots = fetchLongReadTrRepeatCountPlots as any
const fetchLocus = fetchLongReadTrLocus as any
const resolvePrimaryRepeat = resolveLongReadTrPrimaryRepeat as any
const fetchPrimaryMotif = fetchLongReadTrPrimaryMotifMeasurementUncached as any
const resolveContext = resolveLongReadTrShortReadContext as any
const getSource = getY1SourceSnapshot as any

describe('long-read tandem-repeat resolvers', () => {
  beforeEach(() => {
    fetchPlots.mockReset()
    fetchLocus.mockReset()
    resolvePrimaryRepeat.mockReset()
    fetchPrimaryMotif.mockReset()
    resolveContext.mockReset()
    getSource.mockReset()
  })

  test.each([
    ['the cohort source is absent', null, undefined],
    ['the canonical locus is absent from that cohort', { chrom: 'chrX' }, null],
  ])('returns null without cross-binding when %s', async (_case, source, locus) => {
    getSource.mockResolvedValueOnce(source)
    if (source) fetchLocus.mockResolvedValueOnce(locus)

    await expect(
      resolvers.Query.long_read_tandem_repeat_locus(
        null,
        { id: 'X-25013649-25013697-NGC', lr_cohort: 'hgsvc_hprc', first: 600 },
        null
      )
    ).resolves.toBeNull()
    expect(fetchLocus).toHaveBeenCalledTimes(source ? 1 : 0)
  })

  test('forwards the server-canonical filter and color selection without normalization', async () => {
    const source = { chrom: 'chrX' }
    getSource.mockResolvedValueOnce(source)
    fetchLocus.mockResolvedValueOnce({ id: 'locus' })

    await resolvers.Query.long_read_tandem_repeat_locus(
      null,
      {
        id: 'X-25013649-25013697-NGC',
        lr_cohort: 'hgsvc_hprc',
        first: 50,
        ancestry_group_id: 'frequency:nfe',
        sex_group_id: 'XX',
        color_by: 'SEX',
      },
      null
    )

    expect(fetchLocus).toHaveBeenCalledWith(
      expect.objectContaining({
        ancestryFilterId: 'frequency:nfe',
        sexFilterId: 'XX',
        colorBy: 'SEX',
        source,
      })
    )
  })

  test('resolves primary identity from the same receipt-validated short-read context', async () => {
    const locus = { id: 'exact-locus' }
    const context = { status: 'EXACT_UNIQUE', catalog_digest: 'digest' }
    const identity = { status: 'AVAILABLE', motif: 'TGC' }
    resolveContext.mockResolvedValueOnce(context)
    resolvePrimaryRepeat.mockReturnValueOnce(identity)

    await expect(
      resolvers.LongReadTandemRepeatLocus.primary_repeat(locus, null, { esClient: {} })
    ).resolves.toBe(identity)
    expect(resolvePrimaryRepeat).toHaveBeenCalledWith(locus, context)
  })

  test('contains an optional stale or oversized primary-motif product failure locally', async () => {
    const locus = { id: 'exact-locus', lr_cohort: 'hgsvc_hprc' }
    const identity = {
      status: 'AVAILABLE',
      motif: 'CAG',
      biological_role: 'coding polyglutamine repeat',
    }
    resolveContext.mockResolvedValueOnce({ status: 'EXACT_UNIQUE' })
    resolvePrimaryRepeat.mockReturnValueOnce(identity)
    fetchPrimaryMotif.mockRejectedValueOnce(new Error('PRIMARY_MOTIF_PRODUCT_INVARIANT: stale'))

    await expect(
      resolvers.LongReadTandemRepeatLocus.primary_motif_measurement(locus, null, { esClient: {} })
    ).resolves.toEqual({
      status: 'UNAVAILABLE',
      reason_code: 'PRODUCT_IDENTITY_MISMATCH',
      motif: 'CAG',
      biological_role: 'coding polyglutamine repeat',
    })
  })

  test('preserves a validated primary-motif product independently of other fields', async () => {
    const locus = { id: 'exact-locus', lr_cohort: 'hgsvc_hprc' }
    const identity = { status: 'AVAILABLE', motif: 'TGC' }
    const product = { status: 'AVAILABLE', motif: 'TGC', bins: [{}] }
    resolveContext.mockResolvedValueOnce({ status: 'EXACT_UNIQUE' })
    resolvePrimaryRepeat.mockReturnValueOnce(identity)
    fetchPrimaryMotif.mockResolvedValueOnce(product)

    await expect(
      resolvers.LongReadTandemRepeatLocus.primary_motif_measurement(locus, null, { esClient: {} })
    ).resolves.toBe(product)
    expect(fetchPrimaryMotif).toHaveBeenCalledWith(locus, identity)
  })

  test('turns a cohort-specific malformed ancillary histogram into an explicit unavailable state', async () => {
    fetchPlots.mockRejectedValueOnce(
      new Error('TR_HISTOGRAM_INVARIANT: called allele count does not match aggregate bins')
    )

    await expect(
      resolvers.LongReadTandemRepeatLocus.repeat_count_plots({ lr_cohort: 'hgsvc_hprc' })
    ).resolves.toMatchObject({
      status: 'UNAVAILABLE_ANCILLARY',
      reason_code: 'ADMITTED_HISTOGRAM_COULD_NOT_BE_VALIDATED',
      allele_size_distribution: [],
      genotype_distribution: [],
      interaction: { interaction_status: 'UNAVAILABLE_PLOTS' },
    })
  })

  test('preserves a validated one-cohort plot response', async () => {
    const available = { status: 'AVAILABLE_EXACT', allele_size_distribution: [{}] }
    fetchPlots.mockResolvedValueOnce(available)

    await expect(
      resolvers.LongReadTandemRepeatLocus.repeat_count_plots({ lr_cohort: 'aou' })
    ).resolves.toBe(available)
  })
})

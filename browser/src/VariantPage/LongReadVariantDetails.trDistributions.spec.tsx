import React from 'react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { clearExpandedTrDistributionCache } from '../Haplotypes/ExpandedTrDistributions'
import LongReadVariantDetails from './LongReadVariantDetails'

jest.mock('../Link', () => ({ children, to }: any) => <a href={to}>{children}</a>)

jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot', () => ({
  __esModule: true,
  default: ({ alleleSizeDistribution, repeatUnit, scaleType }: any) => (
    <div
      aria-label="variant-page allele size distribution"
      data-counts={alleleSizeDistribution.map((item: any) => item.repunit_count).join(',')}
      data-repeat-unit={repeatUnit}
      data-scale={scaleType}
    />
  ),
}))

jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatGenotypeDistributionPlot', () => ({
  __esModule: true,
  default: ({ genotypeDistribution, axisLabels }: any) => (
    <div
      aria-label="variant-page genotype distribution"
      data-counts={genotypeDistribution
        .map((item: any) => `${item.short_allele_repunit_count}/${item.long_allele_repunit_count}`)
        .join(',')}
      data-axis-labels={axisLabels.join(',')}
    />
  ),
}))

const variantId = 'chr22-22854926-TRV-105TR-2..1bp~2'

const trDetails = {
  allele_type: 'trv',
  end: 22855031,
  length: -2,
  motifs: ['TCCA', 'CCAT'],
  is_likely_tr: true,
  enveloping_tr_id: null,
  enveloped_ids: null,
  gnomad_str: null,
  short_read_match_id: null,
  short_read_match_type: null,
  short_read_match_source: null,
  sv_consequences: null,
  allelic_series: null,
  main_reference_region: null,
}

const distribution = (lr_cohort: 'hgsvc_hprc' | 'aou' = 'hgsvc_hprc') => ({
  variant_id: variantId,
  lr_cohort,
  motifs: ['TCCA', 'CCAT'],
  max_repunits: 31,
  main_reference_region: { chrom: 'chr22', start: 22854926, stop: 22855031 },
  allele_size_distribution: [
    {
      ancestry_group: 'afr',
      sex: 'XX',
      repunit: 'TCCA',
      distribution: [{ repunit_count: 21, frequency: 4 }],
    },
  ],
  genotype_distribution: [
    {
      ancestry_group: 'afr',
      sex: 'XX',
      short_allele_repunit: 'TCCA',
      long_allele_repunit: 'TCCA',
      distribution: [
        { short_allele_repunit_count: 20, long_allele_repunit_count: 21, frequency: 2 },
      ],
    },
  ],
})

const responseWithVariant = (variant: any) => ({
  ok: true,
  status: 200,
  json: jest.fn<() => Promise<any>>().mockResolvedValue({
    data: { long_read_variant: variant },
  }),
})

const renderDetails = (
  longReadDetails: any = trDetails,
  lrCohort: 'hgsvc_hprc' | 'aou' = 'hgsvc_hprc'
) =>
  render(
    <LongReadVariantDetails
      variantId={variantId}
      chrom="22"
      pos={22854926}
      longReadDetails={longReadDetails}
      ref_allele="TCCA"
      lrCohort={lrCohort}
    />
  )

describe('variant-page full-cohort TR distributions', () => {
  beforeEach(() => {
    clearExpandedTrDistributionCache()
    global.fetch = jest.fn() as typeof fetch
  })

  test('queries the exact routed variant and selected cohort, then retains controls and help', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    fetchMock.mockResolvedValue(responseWithVariant(distribution()) as any)

    renderDetails()

    expect(
      screen.getByRole('heading', { level: 2, name: 'Full-cohort repeat-count distributions' })
    ).not.toBeNull()
    expect(screen.getByRole('status').textContent).toContain(
      'Loading full cohort STR distributions'
    )

    const allelePlot = await screen.findByLabelText('variant-page allele size distribution')
    const genotypePlot = screen.getByLabelText('variant-page genotype distribution')
    expect(allelePlot.getAttribute('data-counts')).toBe('21')
    expect(allelePlot.getAttribute('data-repeat-unit')).toBe('TCCA, CCAT')
    expect(genotypePlot.getAttribute('data-counts')).toBe('20/21')
    expect(genotypePlot.getAttribute('data-axis-labels')).toBe(
      'longer TCCA, CCAT allele,shorter TCCA, CCAT allele'
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const request = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(request.body as string)
    expect(body.query).toContain('lr_cohort')
    expect(body.variables).toEqual({ variantId, lrCohort: 'hgsvc_hprc' })

    expect(screen.getAllByLabelText(/Genetic ancestry group/)).toHaveLength(2)
    expect(screen.getAllByLabelText(/Sex:/)).toHaveLength(2)
    expect(screen.getByLabelText(/Color by/)).not.toBeNull()
    expect(screen.getByLabelText(/Scale/)).not.toBeNull()

    fireEvent.click(screen.getByLabelText('About full-cohort repeat-count distributions'))
    expect(
      screen.getByText(/do not encode motif order, interruptions, or exact ALT sequences/)
    ).not.toBeNull()
  })

  test('uses cohort-scoped cache identity when the selected cohort changes', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    fetchMock
      .mockResolvedValueOnce(responseWithVariant(distribution('hgsvc_hprc')) as any)
      .mockResolvedValueOnce(responseWithVariant(distribution('aou')) as any)

    const { rerender } = renderDetails()
    await screen.findByLabelText('variant-page allele size distribution')

    rerender(
      <LongReadVariantDetails
        variantId={variantId}
        chrom="22"
        pos={22854926}
        longReadDetails={trDetails as any}
        ref_allele="TCCA"
        lrCohort="aou"
      />
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init!.body as string))
    expect(bodies.map((body) => body.variables)).toEqual([
      { variantId, lrCohort: 'hgsvc_hprc' },
      { variantId, lrCohort: 'aou' },
    ])
  })

  test('fails closed for mismatched ancillary identity and reports request errors', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    fetchMock.mockResolvedValueOnce(
      responseWithVariant({ ...distribution('aou'), variant_id: 'chr22-1-TRV-1' }) as any
    )

    const { unmount } = renderDetails()
    expect(
      await screen.findByText(/distributions are unavailable for this cohort and locus/)
    ).not.toBeNull()
    expect(screen.queryByLabelText('variant-page allele size distribution')).toBeNull()

    unmount()
    clearExpandedTrDistributionCache()
    fetchMock.mockRejectedValueOnce(new Error('ancillary endpoint unavailable'))
    renderDetails()
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to load the full cohort STR distributions.'
    )
  })

  test('does not infer distributions for a non-TR allele', () => {
    renderDetails({
      ...trDetails,
      allele_type: 'ins',
      is_likely_tr: true,
      main_reference_region: {
        reference_genome: 'GRCh38',
        chrom: '22',
        start: 22854926,
        stop: 22855031,
      },
    })

    expect(screen.queryByLabelText('Full-cohort repeat-count distributions')).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

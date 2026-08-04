import React from 'react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import HaplotypeVariantTable from './HaplotypeVariantTable'
import { clearExpandedTrDistributionCache } from './ExpandedTrDistributions'

jest.mock('../Link', () => ({ children, to, onClick }: any) => (
  <a href={to} onClick={onClick}>
    {children}
  </a>
))

jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot', () => ({
  __esModule: true,
  default: ({ alleleSizeDistribution, repeatUnit }: any) => (
    <div
      aria-label="full allele size distribution"
      data-repeats={alleleSizeDistribution
        .map((item: any) => item.repunit_count)
        .sort((a: number, b: number) => a - b)
        .join(',')}
      data-total={alleleSizeDistribution.reduce(
        (sum: number, item: any) => sum + item.frequency,
        0
      )}
      data-colors={alleleSizeDistribution
        .map((item: any) => item.colorByValue)
        .filter(Boolean)
        .sort()
        .join(',')}
      data-repeat-unit={repeatUnit || ''}
    />
  ),
}))

jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatGenotypeDistributionPlot', () => ({
  __esModule: true,
  default: ({ genotypeDistribution, axisLabels }: any) => (
    <div
      aria-label="full genotype distribution"
      data-genotypes={genotypeDistribution
        .map((item: any) => `${item.short_allele_repunit_count}/${item.long_allele_repunit_count}`)
        .sort()
        .join(',')}
      data-total={genotypeDistribution.reduce((sum: number, item: any) => sum + item.frequency, 0)}
      data-axis-labels={axisLabels.join(',')}
    />
  ),
}))

const variantId = 'chr4-39279700-TRV-21~4'
const sourceVariantId = 'chr4-39279700-TRV-21'

const haplotypeVariant = {
  variant_id: variantId,
  source_variant_id: sourceVariantId,
  chrom: 'chr4',
  pos: 39279700,
  end: 39279721,
  ref: 'TTTTTTTTTTTTTTTTTTTTT',
  alt: 'TTTTTTTTTTTTTTTTTTT',
  allele_type: 'trv',
  allele_length: -2,
  freq: { af: 0.1, ac: 1, an: 584 },
  populations: [],
  rsid: '',
}

const haplotypeGroups = {
  groups: [
    {
      hash: 1,
      start: 39279700,
      stop: 39279721,
      samples: [
        {
          sample_id: 'sample-1',
          vcf_strand: 1,
          phase_set: null,
          variant_sets: [{ readable_id: '', variants: [haplotypeVariant] }],
        },
      ],
      variants: { readable_id: '', variants: [haplotypeVariant] },
      below_threshold: { readable_id: '', variants: [] },
    },
  ],
}

const fullDistribution = {
  variant_id: variantId,
  // Exercise the component's repeat-unit fallback when motifs are absent.
  motifs: [],
  max_repunits: 24,
  main_reference_region: { chrom: 'chr4', start: 39279700, stop: 39279721 },
  allele_size_distribution: [
    {
      ancestry_group: 'afr',
      sex: 'XX',
      repunit: 'T',
      distribution: [
        { repunit_count: 13, frequency: 2 },
        { repunit_count: 19, frequency: 20 },
        { repunit_count: 21, frequency: 5 },
      ],
    },
    {
      ancestry_group: 'nfe',
      sex: 'XY',
      repunit: 'T',
      distribution: [
        { repunit_count: 14, frequency: 2 },
        { repunit_count: 18, frequency: 27 },
        { repunit_count: 19, frequency: 408 },
        { repunit_count: 20, frequency: 84 },
        { repunit_count: 21, frequency: 36 },
      ],
    },
    {
      ancestry_group: 'afr',
      sex: 'unknown',
      repunit: 'T',
      distribution: [{ repunit_count: 22, frequency: 7 }],
    },
  ],
  genotype_distribution: [
    {
      ancestry_group: 'afr',
      sex: 'XX',
      short_allele_repunit: 'T',
      long_allele_repunit: 'T',
      distribution: [
        { short_allele_repunit_count: 13, long_allele_repunit_count: 19, frequency: 2 },
        { short_allele_repunit_count: 19, long_allele_repunit_count: 21, frequency: 17 },
      ],
    },
    {
      ancestry_group: 'nfe',
      sex: 'XY',
      short_allele_repunit: 'T',
      long_allele_repunit: 'T',
      distribution: [
        { short_allele_repunit_count: 14, long_allele_repunit_count: 20, frequency: 1 },
        { short_allele_repunit_count: 21, long_allele_repunit_count: 21, frequency: 5 },
      ],
    },
    {
      ancestry_group: 'afr',
      sex: 'unknown',
      short_allele_repunit: 'T',
      long_allele_repunit: 'T',
      distribution: [
        { short_allele_repunit_count: 20, long_allele_repunit_count: 22, frequency: 4 },
      ],
    },
  ],
}

const responseWithVariant = (variant: any) => ({
  ok: true,
  status: 200,
  json: jest.fn<() => Promise<any>>().mockResolvedValue({
    data: { long_read_variant: variant },
  }),
})

const renderTable = () =>
  render(
    <HaplotypeVariantTable
      mode="haplotype"
      lrCohort="hgsvc_hprc"
      haplotypeGroups={haplotypeGroups as any}
    />
  )

const expandRow = () => fireEvent.click(screen.getByText(sourceVariantId).closest('tr')!)

describe('expanded TR full-cohort distributions', () => {
  beforeEach(() => {
    clearExpandedTrDistributionCache()
    global.fetch = jest.fn() as typeof fetch
  })

  test('fetches structured long_read_variant data only on expansion, renders full data and caches re-expansion', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    fetchMock.mockResolvedValue(responseWithVariant(fullDistribution) as any)

    renderTable()
    expect(fetchMock).not.toHaveBeenCalled()

    expandRow()
    expect(screen.getByRole('status').textContent).toContain(
      'Loading full cohort STR distributions'
    )

    const allelePlot = await screen.findByLabelText('full allele size distribution')
    const genotypePlot = screen.getByLabelText('full genotype distribution')
    expect(allelePlot.getAttribute('data-repeats')).toBe('13,14,18,19,20,21,22')
    expect(allelePlot.getAttribute('data-total')).toBe('591')
    expect(allelePlot.getAttribute('data-repeat-unit')).toBe('T')
    expect(genotypePlot.getAttribute('data-genotypes')).toBe('13/19,14/20,19/21,20/22,21/21')
    expect(genotypePlot.getAttribute('data-total')).toBe('29')
    expect(genotypePlot.getAttribute('data-axis-labels')).toBe('longer T allele,shorter T allele')
    expect(screen.getByText(/Repeat motif: T/)).not.toBeNull()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const request = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(request.body as string)
    expect(body.query).toContain('long_read_variant')
    expect(body.query).toContain('allele_size_distribution')
    expect(body.query).toContain('genotype_distribution')
    expect(body.variables).toEqual({ variantId, lrCohort: 'hgsvc_hprc' })

    const colorByControl = screen.getByLabelText(/Color by/)
    fireEvent.change(colorByControl, { target: { value: 'sex' } })
    expect(allelePlot.getAttribute('data-colors')).toBe('XX,XX,XX,XY,XY,XY,XY,XY,unknown')

    const sexControls = screen.getAllByLabelText(/Sex:/)
    expect(
      Array.from((sexControls[0] as HTMLSelectElement).options).map((option) => option.text)
    ).toContain('Unknown')
    fireEvent.change(sexControls[0], { target: { value: 'unknown' } })
    expect(allelePlot.getAttribute('data-repeats')).toBe('22')
    expect(allelePlot.getAttribute('data-total')).toBe('7')
    expect(allelePlot.getAttribute('data-colors')).toBe('unknown')
    fireEvent.change(sexControls[1], { target: { value: 'unknown' } })
    expect(genotypePlot.getAttribute('data-genotypes')).toBe('20/22')
    expect(genotypePlot.getAttribute('data-total')).toBe('4')

    const ancestryControls = screen.getAllByLabelText(/Genetic ancestry group/)
    fireEvent.change(sexControls[0], { target: { value: '' } })
    fireEvent.change(ancestryControls[0], { target: { value: 'afr' } })
    expect(allelePlot.getAttribute('data-repeats')).toBe('13,19,21,22')
    fireEvent.change(sexControls[1], { target: { value: '' } })
    fireEvent.change(ancestryControls[1], { target: { value: 'nfe' } })
    expect(genotypePlot.getAttribute('data-genotypes')).toBe('14/20,21/21')

    expandRow()
    expect(screen.queryByLabelText('Full cohort STR distributions')).toBeNull()
    expandRow()
    await screen.findByLabelText('full allele size distribution')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('keeps the deterministic haplotype plot as an explicit fallback when full data is absent', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    fetchMock.mockResolvedValue(
      responseWithVariant({
        ...fullDistribution,
        allele_size_distribution: null,
        max_repunits: null,
        genotype_distribution: null,
      }) as any
    )

    renderTable()
    expandRow()

    expect(await screen.findByText(/Full cohort STR distributions are unavailable/)).not.toBeNull()
    expect(
      screen.getByText('Haplotype-only carrier distribution (context/fallback)')
    ).not.toBeNull()
    expect(screen.getByText(/not the complete cohort STR distribution/)).not.toBeNull()
    expect(screen.getByLabelText('TR allele length distribution')).not.toBeNull()
  })

  test('reports a lazy-load error without removing haplotype context', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    fetchMock.mockRejectedValue(new Error('network unavailable'))

    renderTable()
    expandRow()

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to load the full cohort STR distributions.'
    )
    expect(
      screen.getByText('Haplotype-only carrier distribution (context/fallback)')
    ).not.toBeNull()
  })
})

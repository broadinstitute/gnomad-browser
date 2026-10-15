import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { RepeatCountPlotCard } from './LongReadTrVisualizations'
import { repeatPlotAvailable } from './SourceContextHistogram'
import { sourceContextHistogram } from './__fixtures__/sourceContextHistogram'

const renderCard = (plots = sourceContextHistogram(), kind: 'allele' | 'genotype' = 'allele') =>
  render(
    <RepeatCountPlotCard variantId="source-context-fixture" repeatCountPlots={plots} kind={kind} />
  )

describe('source-context histogram UI', () => {
  test('normal autosome uses source-size axes, counts, raw bounds and explicit unknown semantics', () => {
    renderCard()
    expect(screen.getByRole('heading', { name: 'Repeat-size distribution' })).not.toBeNull()
    expect(screen.getByText('Source-reported size (source units)')).not.toBeNull()
    expect(screen.getByText(/2 measured allele observations in this view/)).not.toBeNull()
    expect(screen.getByText(/Measurement units and producer version are unknown/)).not.toBeNull()
    expect(screen.getByText(/without POS conversion/)).not.toBeNull()
    expect(screen.getByText(/1:100-130/)).not.toBeNull()
    expect(screen.queryByText('Repeats of CAG')).toBeNull()
    expect(screen.queryByText('Called allele copies')).toBeNull()
    expect(screen.getByText(/full-cohort coverage is not established/)).not.toBeNull()
    expect(screen.getByRole('option', { name: 'All source observations' })).not.toBeNull()
    expect(screen.queryByRole('option', { name: 'Global' })).toBeNull()
    expect(
      screen.getByRole('img', {
        name: /Repeat-size distribution.*Source size 10: 1 measured allele observations/,
      })
    ).not.toBeNull()
    expect(screen.queryAllByRole('button', { name: /Filter by/ })).toHaveLength(0)
  })

  test.each(['1:90-140', ''])('wider record context is visible regardless of VC %s', (vc) => {
    const plots = sourceContextHistogram()
    plots.source_context = {
      ...plots.source_context!,
      interval_raw: '1:90-140',
      vc_raw: vc,
      context_relation: 'CONTAINS',
    }
    renderCard(plots)
    expect(screen.getByText('Wider source context.')).not.toBeNull()
    expect(screen.getByText(/not independently localized to its interval/)).not.toBeNull()
    expect(screen.getAllByText(/1:90-140/).length).toBeGreaterThan(0)
    expect(screen.getByText(/1-100-130-CAG/)).not.toBeNull()
    if (!vc) expect(screen.getByText(/Blank \(not supplied\)/)).not.toBeNull()
  })

  test('Y diagonal counts source entries once, with no people or diploid claim', () => {
    const plots = sourceContextHistogram({
      pair_encoding: 'SOURCE_N_OVER_N_MAY_BE_ONE_VALUE',
      pair_observations: 145,
    })
    plots.source_context = {
      ...plots.source_context!,
      source_locus_id: 'Y-100-130-CAG',
      interval_raw: 'Y:100-130',
    }
    plots.genotype_distribution = [
      {
        ancestry_group: 'afr',
        sex: 'XY',
        short_allele_repunit: 'CAG',
        long_allele_repunit: 'CAG',
        distribution: [
          { short_allele_repunit_count: 8, long_allele_repunit_count: 8, frequency: 1 },
          { short_allele_repunit_count: 9, long_allele_repunit_count: 9, frequency: 143 },
          { short_allele_repunit_count: 10, long_allele_repunit_count: 10, frequency: 1 },
        ],
      },
    ]
    const { container } = renderCard(plots, 'genotype')
    expect(screen.getByRole('heading', { name: 'Size-pair distribution' })).not.toBeNull()
    expect(screen.getByText(/145 source pair entries in this view/)).not.toBeNull()
    expect(screen.getByText(/not phased.*one or two observed alleles/)).not.toBeNull()
    expect(screen.getByText('Larger encoded value (source units)')).not.toBeNull()
    expect(screen.getByText('Smaller encoded value (source units)')).not.toBeNull()
    expect(
      screen.getByRole('img', { name: /9 \/ 9 encoded values.*143 source pair entries/ })
    ).not.toBeNull()
    expect(container.textContent).not.toMatch(/people|individuals|diploid|hemizyg|290/)
    expect(screen.queryByRole('option', { name: 'XY' })).toBeNull()
    expect(screen.getByRole('option', { name: 'Male (source metadata)' })).not.toBeNull()
  })

  test('unknown sex is selectable and counted once; empty selected strata remain empty', () => {
    const plots = sourceContextHistogram()
    plots.allele_size_distribution.push({
      ancestry_group: 'afr',
      sex: 'unknown',
      repunit: 'CAG',
      distribution: [{ repunit_count: 9, frequency: 3 }],
    })
    renderCard(plots)
    expect(screen.getByText(/5 measured allele observations in this view/)).not.toBeNull()
    fireEvent.change(screen.getByLabelText('Sex (source metadata):'), {
      target: { value: 'unknown' },
    })
    expect(screen.getByText(/3 measured allele observations in this view/)).not.toBeNull()
    fireEvent.change(screen.getByLabelText('Color by:'), { target: { value: 'sex' } })
    expect(screen.getAllByText('Unknown (source metadata)').length).toBeGreaterThan(1)
    expect(screen.queryByText('XX')).toBeNull()
    fireEvent.change(screen.getByLabelText('Sex (source metadata):'), { target: { value: 'XY' } })
    expect(screen.getByText(/0 measured allele observations in this view/)).not.toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).not.toContain('Source size')
  })

  test.each(['UNAVAILABLE_MISSING', 'UNAVAILABLE_INVALID'])(
    'pair %s does not remove valid allele plot',
    (pair_status) => {
      const plots = sourceContextHistogram({ pair_status, genotype_distribution: [] })
      expect(repeatPlotAvailable(plots, 'allele')).toBe(true)
      expect(repeatPlotAvailable(plots, 'genotype')).toBe(false)
      renderCard(plots)
      expect(screen.getByText(`Size-pair distribution unavailable: ${pair_status}.`)).not.toBeNull()
    }
  )

  test('availability is explicit and independent in both directions', () => {
    const plots = sourceContextHistogram({
      allele_status: 'UNAVAILABLE',
      allele_size_distribution: [],
    })
    expect(repeatPlotAvailable(plots, 'allele')).toBe(false)
    expect(repeatPlotAvailable(plots, 'genotype')).toBe(true)
    expect(repeatPlotAvailable({ ...plots, pair_status: 'UNREVIEWED_ENCODING' }, 'genotype')).toBe(
      false
    )
    expect(repeatPlotAvailable({ ...plots, source_context: null }, 'genotype')).toBe(false)
  })

  test('partial pairs retain their own entry denominator, not a reconstructed genotype total', () => {
    const plots = sourceContextHistogram({ pair_encoding: 'SOURCE_N_OVER_N_MAY_BE_ONE_VALUE' })
    plots.allele_size_distribution[0].distribution[0].frequency = 50
    renderCard(plots, 'genotype')
    expect(screen.getByText(/1 source pair entries in this view/)).not.toBeNull()
  })

  test('N motif stays literal and AN mismatch is not promoted to primary counts', () => {
    const plots = sourceContextHistogram({
      repeat_unit: 'NGC',
      primary_binding: { status: 'NOT_ESTABLISHED', an_concordance: 'NOT_ESTABLISHED' },
      primary_an_comparison: 'MISMATCH',
    })
    plots.source_context = { ...plots.source_context!, source_locus_id: '1-100-130-NGC' }
    renderCard(plots)
    expect(screen.getByText(/1-100-130-NGC; motif: NGC/)).not.toBeNull()
    expect(
      screen.getByText(
        /primary AN concordance: NOT_ESTABLISHED.*do not replace primary AN or REF counts/
      )
    ).not.toBeNull()
    expect(screen.getByText(/primary AN comparison: MISMATCH/)).not.toBeNull()
    expect(
      screen.getByText(/does not establish shared records, primary binding or cohort coverage/)
    ).not.toBeNull()
    expect(screen.queryByText('AVAILABLE_EXACT')).toBeNull()
  })

  test.each(['UNAVAILABLE_COMPOUND_LOCUS', 'UNAVAILABLE_AMBIGUOUS_CONTEXT'])(
    '%s never renders a guessed plot',
    (status) => {
      const plots = sourceContextHistogram({ status, source_context: null })
      expect(repeatPlotAvailable(plots, 'allele')).toBe(false)
      expect(repeatPlotAvailable(plots, 'genotype')).toBe(false)
      const { container } = renderCard(plots)
      expect(container.textContent).toBe('')
    }
  )

  test('v1 keeps existing headings, units, sex labels and people counts', () => {
    const plots = sourceContextHistogram({ status: 'AVAILABLE_EXACT', source_context: null })
    renderCard(plots, 'genotype')
    expect(
      screen.getByRole('heading', { name: 'Genotype repeat-count distribution' })
    ).not.toBeNull()
    expect(screen.getByText('Repeats in longer allele')).not.toBeNull()
    expect(
      screen.getByRole('img', { name: /Genotype repeat-count distribution.*1 person/ })
    ).not.toBeNull()
    expect(screen.getByRole('option', { name: 'XX' })).not.toBeNull()
    expect(
      within(screen.getByTestId('genotype-repeat-count-card')).queryByText(/Source provenance/)
    ).toBeNull()
  })
})

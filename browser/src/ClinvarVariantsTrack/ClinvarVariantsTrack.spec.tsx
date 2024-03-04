import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'
import clinvarVariantFactory from '../__factories__/ClinvarVariant'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import React from 'react'
import userEvent from '@testing-library/user-event'
import ClinvarVariantTrack from './ClinvarVariantTrack'
import { Transcript } from '../TranscriptPage/TranscriptPage'
import transcriptFactory from '../__factories__/Transcript'
import { render, screen } from '@testing-library/react'
import renderer from 'react-test-renderer'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { RegionViewerContext } from '@gnomad/region-viewer'
import { BrowserRouter } from 'react-router-dom'

describe('Clinvar Variants Track', () => {
  const mockClinvarVariants: ClinvarVariant[] = [
    clinvarVariantFactory.build({ gold_stars: 0, major_consequence: 'missense_variant' }),
    clinvarVariantFactory.build({ gold_stars: 1, major_consequence: 'missense_variant' }),
    clinvarVariantFactory.build({ gold_stars: 2, major_consequence: 'missense_variant' }),
    clinvarVariantFactory.build({ gold_stars: 3, major_consequence: 'missense_variant' }),
    clinvarVariantFactory.build({ gold_stars: 4, major_consequence: 'missense_variant' }),
  ]

  const mockTranscripts: Transcript[] = [
    transcriptFactory.build(),
    transcriptFactory.build(),
    transcriptFactory.build(),
    transcriptFactory.build(),
  ]

  const childProps = {
    centerPanelWidth: 3,
    isPositionDefined: true,
    leftPanelWidth: 4,
    regions: [],
    rightPanelWidth: 5,
    scalePosition: (i: number) => i,
  }

  test('renders correctly with default props', () => {
    const tree = renderer.create(
      <RegionViewerContext.Provider value={childProps}>
        <ClinvarVariantTrack
          referenceGenome="GRCh38"
          transcripts={mockTranscripts}
          variants={mockClinvarVariants}
        />
      </RegionViewerContext.Provider>
    )
    expect(tree).toMatchSnapshot()
  })

  test('Allow user to change to different review status filters', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <RegionViewerContext.Provider value={childProps}>
          <ClinvarVariantTrack
            referenceGenome="GRCh38"
            transcripts={mockTranscripts}
            variants={mockClinvarVariants}
          />
        </RegionViewerContext.Provider>
      </BrowserRouter>
    )

    const filterSelect = screen.getByRole('combobox')
    const allStarOpt = screen.getByRole('option', { name: '0-4 Stars' }) as HTMLOptionElement
    const OnePlusStarOpt = screen.getByRole('option', { name: '>=1 Stars' }) as HTMLOptionElement
    const TwoPlusStarOpt = screen.getByRole('option', { name: '>=2 Stars' }) as HTMLOptionElement
    const ThreePlusStarOpt = screen.getByRole('option', { name: '>=3 Stars' }) as HTMLOptionElement
    const FourStarOpt = screen.getByRole('option', { name: '4 Stars' }) as HTMLOptionElement

    expect(allStarOpt.selected).toBe(true)

    await user.selectOptions(filterSelect, OnePlusStarOpt)

    expect(OnePlusStarOpt.selected).toBe(true)
    expect(allStarOpt.selected).toBe(false)

    await user.selectOptions(filterSelect, TwoPlusStarOpt)

    expect(TwoPlusStarOpt.selected).toBe(true)
    expect(OnePlusStarOpt.selected).toBe(false)

    await user.selectOptions(filterSelect, ThreePlusStarOpt)

    expect(ThreePlusStarOpt.selected).toBe(true)
    expect(TwoPlusStarOpt.selected).toBe(false)

    await user.selectOptions(filterSelect, FourStarOpt)

    expect(FourStarOpt.selected).toBe(true)
    expect(ThreePlusStarOpt.selected).toBe(false)
  })

  test('review status selector filters correctly ', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <RegionViewerContext.Provider value={childProps}>
          <ClinvarVariantTrack
            referenceGenome="GRCh38"
            transcripts={mockTranscripts}
            variants={mockClinvarVariants}
          />
        </RegionViewerContext.Provider>
      </BrowserRouter>
    )
    const filterSelect = screen.getByRole('combobox')

    expect(screen.getByText('ClinVar variants (5)')).not.toBeNull()
    await user.selectOptions(
      filterSelect,
      screen.getByRole('option', { name: '>=1 Stars' }) as HTMLOptionElement
    )
    expect(screen.getByText('ClinVar variants (4)')).not.toBeNull()
    await user.selectOptions(
      filterSelect,
      screen.getByRole('option', { name: '>=2 Stars' }) as HTMLOptionElement
    )
    expect(screen.getByText('ClinVar variants (3)')).not.toBeNull()
    await user.selectOptions(
      filterSelect,
      screen.getByRole('option', { name: '>=3 Stars' }) as HTMLOptionElement
    )
    expect(screen.getByText('ClinVar variants (2)')).not.toBeNull()
    await user.selectOptions(
      filterSelect,
      screen.getByRole('option', { name: '4 Stars' }) as HTMLOptionElement
    )
    expect(screen.getByText('ClinVar variants (1)')).not.toBeNull()
  })
})

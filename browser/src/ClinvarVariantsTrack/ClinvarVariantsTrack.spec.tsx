import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'
import clinvarVariantFactory from '../__factories__/ClinvarVariant'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import React from 'react'
import userEvent from '@testing-library/user-event'
import ClinvarVariants, { ClinvarVariantTrack } from './ClinvarVariantTrack'
import { Transcript } from '../TranscriptPage/TranscriptPage'
import transcriptFactory from '../__factories__/Transcript'
import { render, screen } from '@testing-library/react'
import renderer from 'react-test-renderer'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'
import { BrowserRouter } from 'react-router-dom'
import { PageType } from '../TrackPage'

const mockClinvarVariants: ClinvarVariant[] = [
  clinvarVariantFactory.build({ gold_stars: 0, major_consequence: 'missense_variant' }),
  clinvarVariantFactory.build({ gold_stars: 1, major_consequence: 'missense_variant' }),
  clinvarVariantFactory.build({ gold_stars: 2, major_consequence: 'missense_variant' }),
  clinvarVariantFactory.build({ gold_stars: 3, major_consequence: 'missense_variant' }),
  clinvarVariantFactory.build({ gold_stars: 4, major_consequence: 'missense_variant' }),
]

const mockClinvarVariantsOfEachCategory: ClinvarVariant[] = [
  clinvarVariantFactory.build({
    clinical_significance: 'Pathogenic',
    major_consequence: 'frameshift_variant',
    gold_stars: 4,
    in_gnomad: true,
    pos: 60,
  }),
  clinvarVariantFactory.build({
    clinical_significance: 'Likely pathogenic',
    major_consequence: 'stop_gained',
    gold_stars: 3,
    in_gnomad: true,
    pos: 120,
  }),
  clinvarVariantFactory.build({
    clinical_significance: 'Uncertain significance',
    major_consequence: 'missense_variant',
    gold_stars: 2,
    pos: 180,
  }),
  clinvarVariantFactory.build({
    clinical_significance: 'Conflicting classifications of pathogenicity',
    major_consequence: 'splice_region_variant',
    gold_stars: 1,
    pos: 240,
  }),
  clinvarVariantFactory.build({
    clinical_significance: 'Benign',
    major_consequence: 'synonymous_variant',
    gold_stars: 2,
    in_gnomad: true,
    pos: 300,
  }),
  clinvarVariantFactory.build({
    clinical_significance: 'Likely benign',
    major_consequence: 'missense_variant',
    gold_stars: 1,
    pos: 360,
  }),
  clinvarVariantFactory.build({
    clinical_significance: 'drug response',
    major_consequence: 'intron_variant',
    gold_stars: 0,
    pos: 420,
  }),
]

const mockTranscripts: Transcript[] = [
  transcriptFactory.build(),
  transcriptFactory.build(),
  transcriptFactory.build(),
  transcriptFactory.build(),
]

const childProps = {
  centerPanelWidth: 3,
  isPositionDefined: () => true,
  leftPanelWidth: 4,
  regions: [],
  rightPanelWidth: 5,
  scalePosition: regionViewerScale([], [0, 500]),
}

const plottedRegions = [{ start: 1, stop: 500 }]
const childPropsWithNonEmptyRegions = {
  ...childProps,
  centerPanelWidth: 500,
  regions: plottedRegions,
  scalePosition: regionViewerScale(plottedRegions, [0, 500]),
}

describe('Clinvar Variants Track', () => {
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

  test('renders the collapsed binned-variants plot correctly', () => {
    const { asFragment } = render(
      <BrowserRouter>
        <RegionViewerContext.Provider value={childPropsWithNonEmptyRegions}>
          <ClinvarVariantTrack
            referenceGenome="GRCh38"
            transcripts={mockTranscripts}
            variants={mockClinvarVariantsOfEachCategory}
          />
        </RegionViewerContext.Provider>
      </BrowserRouter>
    )

    expect(asFragment()).toMatchSnapshot()
  })

  test('renders the expanded all-variants plot correctly', async () => {
    const user = userEvent.setup()
    const { asFragment } = render(
      <BrowserRouter>
        <RegionViewerContext.Provider value={childPropsWithNonEmptyRegions}>
          <ClinvarVariantTrack
            referenceGenome="GRCh38"
            transcripts={mockTranscripts}
            variants={mockClinvarVariantsOfEachCategory}
          />
        </RegionViewerContext.Provider>
      </BrowserRouter>
    )

    await user.click(screen.getByRole('button', { name: 'Expand to all variants' }))

    expect(screen.getByRole('button', { name: 'Collapse to bins' })).not.toBeNull()
    expect(asFragment()).toMatchSnapshot()
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

describe('ClinvarVariants', () => {
  const renderClinvarVariants = ({
    clinvarVariants,
    pageType = 'gene',
    zoomRegion = null,
  }: {
    clinvarVariants: ClinvarVariant[] | null | undefined
    pageType?: PageType
    zoomRegion?: { start: number; stop: number } | null
  }) =>
    render(
      <BrowserRouter>
        <RegionViewerContext.Provider value={childPropsWithNonEmptyRegions}>
          <ClinvarVariants
            clinvarVariants={clinvarVariants}
            clinvarReleaseDate="2023-03-01"
            referenceGenome="GRCh38"
            transcripts={mockTranscripts}
            pageType={pageType}
            zoomRegion={zoomRegion}
          />
        </RegionViewerContext.Provider>
      </BrowserRouter>
    )

  test('renders the heading, the track and the release date when variants are present', () => {
    const { asFragment } = renderClinvarVariants({
      clinvarVariants: mockClinvarVariantsOfEachCategory,
    })

    expect(screen.getByRole('heading', { name: 'ClinVar variants' })).not.toBeNull()
    expect(screen.getByText(/Data displayed here is from ClinVar/)).not.toBeNull()
    expect(asFragment()).toMatchSnapshot()
  })

  test.each(['gene', 'transcript', 'region'] as PageType[])(
    'reports that none were found on a %s page when the list is empty',
    (pageType) => {
      const { asFragment } = renderClinvarVariants({ clinvarVariants: [], pageType })

      expect(screen.getByText(`No ClinVar variants found in this ${pageType}.`)).not.toBeNull()
      expect(asFragment()).toMatchSnapshot()
    }
  )

  test.each([
    ['null', null],
    ['undefined', undefined],
  ] as [string, ClinvarVariant[] | null | undefined][])(
    'reports that the data could not be loaded, rather than that none were found, when the list is %s',
    (_label, clinvarVariants) => {
      const { asFragment } = renderClinvarVariants({ clinvarVariants })

      expect(screen.getByRole('heading', { name: 'ClinVar variants' })).not.toBeNull()
      expect(screen.getByText(/ClinVar variants could not be loaded/)).not.toBeNull()
      expect(screen.queryByText(/No ClinVar variants found/)).toBeNull()
      expect(asFragment()).toMatchSnapshot()
    }
  )

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', []],
  ] as [string, ClinvarVariant[] | null | undefined][])(
    'renders without throwing when the list is %s',
    (_label, clinvarVariants) => {
      expect(() => renderClinvarVariants({ clinvarVariants })).not.toThrow()
    }
  )

  test.each([
    ['null', null],
    ['undefined', undefined],
  ] as [string, ClinvarVariant[] | null | undefined][])(
    'renders without throwing when a zoom region is set and the list is %s',
    (_label, clinvarVariants) => {
      expect(() =>
        renderClinvarVariants({ clinvarVariants, zoomRegion: { start: 100, stop: 200 } })
      ).not.toThrow()

      expect(screen.getByText(/ClinVar variants could not be loaded/)).not.toBeNull()
    }
  )
})

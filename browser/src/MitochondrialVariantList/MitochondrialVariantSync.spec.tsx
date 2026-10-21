import '@testing-library/jest-dom'
import React from 'react'
import { beforeEach, afterEach, expect, jest, test } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

import stubVariantTrackCanvas from '../../../tests/__helpers__/stubVariantTrackCanvas'
import geneFactory from '../__factories__/Gene'
import transcriptFactory from '../__factories__/Transcript'
import clinvarVariantFactory from '../__factories__/ClinvarVariant'
import mitochondrialVariantFactory from '../__factories__/MitochondrialVariant'
import MitochondrialVariantsInGene from '../GenePage/MitochondrialVariantsInGene'
import MitochondrialVariantsInTranscript from '../TranscriptPage/MitochondrialVariantsInTranscript'
import MitochondrialVariantsInRegion from '../RegionPage/MitochondrialVariantsInRegion'
import Query from '../Query'
import userPreferences from '../userPreferences'
import { VARIANT_SYNC_LABEL, NO_SHARED_VARIANTS_MESSAGE } from '../VariantList/VariantSyncControl'
import { ClinvarVariant } from '../VariantPage/VariantPage'

jest.mock('../Query', () => ({ __esModule: true, default: jest.fn() }))
jest.setTimeout(20_000)

const variants = [100, 200, 300].map((pos) => ({
  ...mitochondrialVariantFactory.build({ pos, an: 100, ac_het: 2, flags: [] }),
  consequence: 'missense_variant',
  hgvsc: '',
  hgvsp: '',
  filters: pos === 300 ? ['artifact_prone_site'] : [],
}))
const clinvarVariants = [100, 300, 400].map((pos) =>
  clinvarVariantFactory.build({
    pos,
    variant_id: `M-${pos}-A-C`,
    clinical_significance: 'Pathogenic',
    major_consequence: 'missense_variant',
    gold_stars: pos === 300 ? 3 : 4,
    in_gnomad: false,
  })
)
const gene = geneFactory.build({ chrom: 'M', reference_genome: 'GRCh38', transcripts: [] })
const transcript = transcriptFactory.build({ chrom: 'M', exons: [] })
const region = { chrom: 'M', start: 1, stop: 500, genes: [], non_coding_constraints: null }
const regions = [{ start: 1, stop: 500 }]
const pages = {
  gene: MitochondrialVariantsInGene,
  transcript: MitochondrialVariantsInTranscript,
  region: MitochondrialVariantsInRegion,
}

const pageElement = (
  page: keyof typeof pages,
  zoomRegion?: { start: number; stop: number },
  datasetId: DatasetId = 'gnomad_r3'
) => {
  const Page = pages[page]
  return (
    <BrowserRouter>
      <RegionViewerContext.Provider
        value={{
          centerPanelWidth: 1200,
          leftPanelWidth: 200,
          rightPanelWidth: 0,
          regions,
          scalePosition: regionViewerScale(regions, [0, 1200]),
          isPositionDefined: () => true,
        }}
      >
        <Page
          datasetId={datasetId}
          gene={gene}
          transcript={transcript}
          region={region}
          zoomRegion={zoomRegion}
        />
      </RegionViewerContext.Provider>
    </BrowserRouter>
  )
}
const tableIds = () => {
  const grid = screen.queryByRole('grid')
  return grid
    ? within(grid)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent)
    : []
}
const toggles = () => screen.getAllByRole('checkbox', { name: VARIANT_SYNC_LABEL, exact: true })

const setResponse = (
  clinvar: ClinvarVariant[] | null = clinvarVariants,
  mitochondrial = variants
) => {
  jest
    .mocked(Query)
    .mockImplementation(
      ({ children }: { children: (result: { data: unknown }) => React.ReactElement }) => {
        const data = { mitochondrial_variants: mitochondrial, clinvar_variants: clinvar }
        return children({
          data: {
            meta: { clinvar_release_date: '2026-10-01' },
            gene: data,
            transcript: data,
            region: data,
          },
        })
      }
    )
}

beforeEach(async () => {
  localStorage.clear()
  await userPreferences.loadPreferences()
  stubVariantTrackCanvas()
  setResponse()
})
afterEach(() => {
  jest.restoreAllMocks()
})

test.each(['gene', 'transcript', 'region'] as const)(
  'links mitochondrial filters on the %s page',
  async (page) => {
    const user = userEvent.setup()
    const view = render(pageElement(page))
    await user.click(screen.getByRole('button', { name: 'Expand to all variants' }))
    expect(tableIds()).toEqual(['M-100-A-C', 'M-200-A-C'])
    expect(toggles()).toHaveLength(2)
    await user.click(toggles()[0])
    toggles().forEach((toggle) => expect(toggle).toBeChecked())
    expect(tableIds()).toEqual(['M-100-A-C'])
    expect(screen.getByText('ClinVar variants (1)')).toBeVisible()

    await user.click(screen.getByRole('checkbox', { name: 'Include filtered variants' }))
    expect(tableIds()).toEqual(['M-100-A-C', 'M-300-A-C'])
    expect(screen.getByText('ClinVar variants (2)')).toBeVisible()

    await user.selectOptions(screen.getByRole('combobox'), '4')
    expect(tableIds()).toEqual(['M-100-A-C'])
    expect(screen.getByText('ClinVar variants (1)')).toBeVisible()
    await user.selectOptions(screen.getByRole('combobox'), '0')

    await user.type(screen.getByPlaceholderText('Search variant table'), 'M-300')
    expect(tableIds()).toEqual(['M-300-A-C'])
    expect(screen.getByText('ClinVar variants (1)')).toBeVisible()

    await user.click(toggles()[1])
    expect(tableIds()).toEqual(['M-300-A-C'])
    expect(screen.getByText('ClinVar variants (3)')).toBeVisible()
    await user.clear(screen.getByPlaceholderText('Search variant table'))
    await user.click(toggles()[1])
    view.rerender(pageElement(page, { start: 200, stop: 400 }))
    expect(tableIds()).toEqual(['M-300-A-C'])
    expect(screen.getByText('ClinVar variants (1)')).toBeVisible()
    expect(
      Array.from(view.container.querySelectorAll('[data-variant-id]')).map((marker) =>
        marker.getAttribute('data-variant-id')
      )
    ).toEqual(['M-300-A-C'])

    view.rerender(pageElement(page, undefined, 'gnomad_r4'))
    toggles().forEach((toggle) => expect(toggle).not.toBeChecked())
    expect(tableIds()).toEqual(['M-100-A-C', 'M-200-A-C'])
  }
)

test('suspends sync during a ClinVar outage and resumes it when data returns', async () => {
  const user = userEvent.setup()
  const view = render(pageElement('region'))
  await user.click(toggles()[0])
  setResponse(null)
  view.rerender(pageElement('region'))
  expect(tableIds()).toEqual(['M-100-A-C', 'M-200-A-C'])
  toggles().forEach((toggle) => {
    expect(toggle).toBeChecked()
    expect(toggle).toBeDisabled()
  })
  setResponse()
  view.rerender(pageElement('region'))
  expect(tableIds()).toEqual(['M-100-A-C'])
  toggles().forEach((toggle) => expect(toggle).toBeEnabled())
})

test('treats an empty ClinVar response as available and recovers when sync is disabled', async () => {
  setResponse([])
  const user = userEvent.setup()
  render(pageElement('region'))
  await user.click(toggles()[0])
  expect(tableIds()).toEqual([])
  expect(screen.getAllByText(NO_SHARED_VARIANTS_MESSAGE)).toHaveLength(2)
  await user.click(toggles()[1])
  expect(tableIds()).toEqual(['M-100-A-C', 'M-200-A-C'])
})

test('allows sync with no gnomAD variants without repeating its empty-state message', async () => {
  setResponse(clinvarVariants, [])
  const user = userEvent.setup()
  render(pageElement('region'))
  await user.click(toggles()[1])
  expect(screen.getByText('No gnomAD variants found.')).toBeVisible()
  expect(screen.getAllByText(NO_SHARED_VARIANTS_MESSAGE)).toHaveLength(1)
  expect(screen.getByText('ClinVar variants (0)')).toBeVisible()
})

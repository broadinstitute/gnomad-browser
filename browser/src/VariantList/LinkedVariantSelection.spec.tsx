import '@testing-library/jest-dom'
import React from 'react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

import stubVariantTrackCanvas from '../../../tests/__helpers__/stubVariantTrackCanvas'
import geneFactory from '../__factories__/Gene'
import transcriptFactory from '../__factories__/Transcript'
import { ClinvarVariant, Variant } from '../VariantPage/VariantPage'
import ConnectedVariantsInGene, { VariantsInGene } from '../GenePage/VariantsInGene'
import ConnectedVariantsInTranscript, {
  VariantsInTranscript,
} from '../TranscriptPage/VariantsInTranscript'
import ConnectedVariantsInRegion, { VariantsInRegion } from '../RegionPage/VariantsInRegion'
import userPreferences from '../userPreferences'
import { ClinvarVariantTrack } from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import * as clinvarAllVariantsPlot from '../ClinvarVariantsTrack/ClinvarAllVariantsPlot'
import * as variantMerging from './mergeExomeAndGenomeData'
import buildLinkedVariantFixture, {
  buildLinkedV4VariantFixture,
} from './__fixtures__/linkedVariants'
import {
  VariantSyncControl,
  NO_SHARED_VARIANTS_MESSAGE,
  VARIANT_SYNC_LABEL,
} from './VariantSyncControl'

jest.mock('../Query', () => ({
  __esModule: true,
  default: ({ children }: { children: (result: { data: unknown }) => React.ReactNode }) => {
    const { default: buildFixture } = jest.requireActual<
      typeof import('./__fixtures__/linkedVariants')
    >('./__fixtures__/linkedVariants')
    const fixture = buildFixture()
    const data = { variants: fixture.variants, clinvar_variants: fixture.clinvarVariants }
    return children({
      data: {
        meta: { clinvar_release_date: '2026-10-01' },
        gene: data,
        transcript: data,
        region: data,
      },
    })
  },
}))

jest.setTimeout(20_000)

type Fixture = {
  variants: Variant[]
  clinvarVariants: ClinvarVariant[] | null | undefined
  datasetId?: DatasetId
}
const pages = { gene: VariantsInGene, transcript: VariantsInTranscript, region: VariantsInRegion }
const connectedPages = {
  gene: ConnectedVariantsInGene,
  transcript: ConnectedVariantsInTranscript,
  region: ConnectedVariantsInRegion,
}
const gene = geneFactory.build({ chrom: '1', reference_genome: 'GRCh37', transcripts: [] })
const transcript = transcriptFactory.build({ chrom: '1', exons: [] })
const region = { chrom: '1', start: 1, stop: 900, genes: [] }
const regions = [{ start: 1, stop: 900 }]

const pageElement = (
  fixture: Fixture,
  page: keyof typeof pages = 'region',
  zoomRegion: { start: number; stop: number } | undefined = undefined,
  connection: { datasetId: DatasetId; identity: 'first' | 'next' } | undefined = undefined
) => {
  const Page = connection ? connectedPages[page] : pages[page]
  const isNextIdentity = connection?.identity === 'next'
  const nextGene = { ...gene, gene_id: `${gene.gene_id}-next` }
  const nextTranscript = { ...transcript, transcript_id: `${transcript.transcript_id}-next` }
  const nextRegion = { ...region, stop: 850 }
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
          clinvarReleaseDate="2026-10-01"
          {...fixture}
          datasetId={connection?.datasetId ?? fixture.datasetId ?? 'gnomad_r2_1'}
          gene={isNextIdentity ? nextGene : gene}
          transcript={isNextIdentity ? nextTranscript : transcript}
          region={isNextIdentity ? nextRegion : region}
          includeUTRs={false}
          includeNonCodingTranscripts={false}
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
const markerIds = (container: HTMLElement) => {
  return Array.from(container.querySelectorAll('[data-variant-id]'))
    .map((marker) => marker.getAttribute('data-variant-id'))
    .sort()
}
const toggles = () => screen.getAllByRole('checkbox', { name: VARIANT_SYNC_LABEL, exact: true })
const expectToggleState = (enabled: boolean) =>
  toggles().forEach((checkbox) => {
    if (enabled) {
      expect(checkbox).toBeChecked()
    } else {
      expect(checkbox).not.toBeChecked()
    }
  })
const expectSharedIds = (container: HTMLElement, expected: string[]) => {
  expect(tableIds()).toEqual(expected)
  expect(markerIds(container)).toEqual([...expected].sort())
  expect(screen.getByText(`ClinVar variants (${expected.length})`)).toBeVisible()
  expect(screen.getByText(`gnomAD v2.1.1 variants (${expected.length})`)).toBeVisible()
}
const expand = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Expand to all variants' }))
}

beforeEach(async () => {
  localStorage.clear()
  await userPreferences.loadPreferences()
  stubVariantTrackCanvas()
})
afterEach(() => {
  jest.restoreAllMocks()
  Reflect.deleteProperty(URL, 'createObjectURL')
  document.querySelectorAll('a[download]').forEach((link) => link.remove())
})

describe('linked variant filters', () => {
  test.each(['gene', 'transcript', 'region'] as const)(
    'wires both toggles on the %s page',
    async (page) => {
      const user = userEvent.setup()
      const { container } = render(pageElement(buildLinkedVariantFixture(), page))
      expectToggleState(false)
      expect(toggles()[0].id).not.toBe(toggles()[1].id)
      const reviewStatusLabel = screen.getByRole('combobox').closest('label')
      expect(reviewStatusLabel?.previousElementSibling).toContainElement(toggles()[0])
      await user.click(toggles()[0])
      expectToggleState(true)
      await expand(user)
      expectSharedIds(container, ['1-100-A-C', '1-200-A-C', '1-300-A-AT', '1-700-A-C', '1-800-A-C'])
      await user.click(toggles()[1])
      expectToggleState(false)
      expect(tableIds()).toContain('1-600-A-C')
      expect(markerIds(container)).toContain('1-500-A-C')
      await user.click(toggles()[1])
      expectToggleState(true)
      await user.click(toggles()[0])
      expectToggleState(false)
    }
  )

  test.each([false, true])(
    'combines independent filters regardless of change order: gnomAD first=%s',
    async (gnomadFirst) => {
      const user = userEvent.setup()
      const { container } = render(pageElement(buildLinkedVariantFixture()))
      await expand(user)
      await user.click(toggles()[0])
      const restrictClinvar = () => user.selectOptions(screen.getByRole('combobox'), '3')
      const restrictGnomad = () =>
        user.click(screen.getByRole('checkbox', { name: 'Exomes', exact: true }))
      if (gnomadFirst) {
        await restrictGnomad()
        await restrictClinvar()
      } else {
        await restrictClinvar()
        await restrictGnomad()
      }
      expectSharedIds(container, ['1-700-A-C'])
      const grid = screen.getByRole('grid')
      const headers = within(grid)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent)
      const row = within(grid).getByRole('rowheader', { name: '1-700-A-C' }).closest('[role="row"]')
      if (!row) throw new Error('Missing variant row')
      expect(row.children[headers.indexOf('Allele Count')]).toHaveTextContent('6')
      expect(row.children[headers.indexOf('Allele Number')]).toHaveTextContent('200')
      await user.click(toggles()[1])
      expect(tableIds()).toEqual(['1-200-A-C', '1-700-A-C'])
      expect(markerIds(container)).toContain('1-500-A-C')
      expect(screen.getByRole('combobox')).toHaveValue('3')
      expect(screen.getByRole('checkbox', { name: 'Exomes', exact: true })).not.toBeChecked()
    }
  )

  test('applies independently annotated consequences before intersecting', async () => {
    const user = userEvent.setup()
    const { container } = render(pageElement(buildLinkedVariantFixture()))
    await expand(user)
    await user.click(toggles()[0])
    const clinvarConsequence = screen.getAllByRole('checkbox', { name: 'pLoF', exact: true })[0]
    const gnomadConsequence = screen.getAllByRole('checkbox', {
      name: 'Missense / Inframe indel',
      exact: true,
    })[1]
    const selectOnlyConsequence = async (checkbox: HTMLElement) => {
      const category = checkbox.closest('label')?.parentElement
      if (!category) throw new Error('Missing consequence category control')
      await user.click(within(category).getByRole('button', { name: 'only', exact: true }))
    }
    await selectOnlyConsequence(clinvarConsequence)
    await selectOnlyConsequence(gnomadConsequence)
    expectSharedIds(container, ['1-100-A-C'])
  })

  test('recovers from zero matches caused by either section and keeps all controls mounted', async () => {
    const user = userEvent.setup()
    const { container } = render(pageElement(buildLinkedVariantFixture()))
    await expand(user)
    await user.click(toggles()[1])
    await user.selectOptions(screen.getByRole('combobox'), '4')
    await user.click(screen.getByRole('checkbox', { name: 'Exomes', exact: true }))
    expectSharedIds(container, [])
    expect(screen.getAllByText(NO_SHARED_VARIANTS_MESSAGE)).toHaveLength(2)
    await user.click(screen.getByRole('checkbox', { name: 'Exomes', exact: true }))
    expectSharedIds(container, ['1-100-A-C'])
    await user.click(screen.getByRole('checkbox', { name: 'SNVs', exact: true }))
    expectSharedIds(container, [])
    await user.selectOptions(screen.getByRole('combobox'), '3')
    expectSharedIds(container, ['1-300-A-AT'])
  })

  test('uses actual overlap rather than legacy precomputed gnomAD membership', async () => {
    const user = userEvent.setup()
    const { container } = render(pageElement(buildLinkedVariantFixture()))
    expect(
      screen.queryByRole('checkbox', { name: 'Only show ClinVar variants that are in gnomAD' })
    ).toBeNull()
    await expand(user)
    await user.click(toggles()[0])
    expectSharedIds(container, ['1-100-A-C', '1-200-A-C', '1-300-A-AT', '1-700-A-C', '1-800-A-C'])
  })

  test('search only restricts membership without neighbors and honors configured columns', async () => {
    const user = userEvent.setup()
    const { container } = render(pageElement(buildLinkedVariantFixture()))
    await expand(user)
    await user.click(toggles()[0])
    fireEvent.change(screen.getByPlaceholderText('Search variant table'), {
      target: { value: 'search-A' },
    })
    expect(tableIds()).toHaveLength(5)
    await user.click(screen.getByRole('checkbox', { name: 'Display neighboring variants' }))
    expectSharedIds(container, ['1-100-A-C'])
    await user.click(screen.getByRole('button', { name: 'Configure table' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /^HGVS Consequence/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expectSharedIds(container, [])
    fireEvent.change(screen.getByPlaceholderText('Search variant table'), { target: { value: '' } })
    expectSharedIds(container, ['1-100-A-C', '1-200-A-C', '1-300-A-AT', '1-700-A-C', '1-800-A-C'])
    expect(userPreferences.getPreference('variantTableColumns')).not.toContain('hgvs')
  })

  test.each([null, undefined])(
    'disables both controls when ClinVar is unavailable: %s',
    (clinvarVariants) => {
      render(pageElement({ ...buildLinkedVariantFixture(), clinvarVariants }))
      toggles().forEach((button) => expect(button).toBeDisabled())
      expect(tableIds()).toHaveLength(7)
      expect(screen.getByText(/ClinVar variants could not be loaded/)).toBeVisible()
    }
  )

  test('suspends sync while unavailable and resumes when data returns', async () => {
    const user = userEvent.setup()
    const fixture = buildLinkedVariantFixture()
    const view = render(pageElement(fixture))
    await user.click(toggles()[0])
    await user.selectOptions(screen.getByRole('combobox'), '4')
    view.rerender(pageElement({ ...fixture, clinvarVariants: null }))
    expectToggleState(true)
    toggles().forEach((button) => expect(button).toBeDisabled())
    expect(screen.getAllByText(/Sync is suspended/)).toHaveLength(2)
    expect(tableIds()).toHaveLength(7)
    view.rerender(pageElement(fixture))
    expectToggleState(true)
    expect(screen.getByRole('combobox')).toHaveValue('4')
    expect(tableIds()).toEqual(['1-100-A-C'])
  })

  test('treats loaded empty ClinVar data as ready and allows sync to be disabled', async () => {
    const user = userEvent.setup()
    render(pageElement({ ...buildLinkedVariantFixture(), clinvarVariants: [] }))
    toggles().forEach((button) => expect(button).not.toBeDisabled())
    await user.click(toggles()[0])
    expect(tableIds()).toEqual([])
    await user.click(toggles()[1])
    expect(tableIds()).toHaveLength(7)
  })

  test('keeps ClinVar accessible when the original gnomAD source is empty', async () => {
    const user = userEvent.setup()
    const { container } = render(pageElement({ ...buildLinkedVariantFixture(), variants: [] }))
    await expand(user)
    expect(markerIds(container)).toHaveLength(7)
    await user.click(toggles()[0])
    expect(tableIds()).toEqual([])
    expect(markerIds(container)).toEqual([])
    expect(screen.getByText('ClinVar variants (0)')).toBeVisible()
    const emptyGnomadMessage = screen.getByText('No gnomAD variants found.')
    expect(emptyGnomadMessage).toBeVisible()
    expect(emptyGnomadMessage.parentElement).not.toHaveTextContent(NO_SHARED_VARIANTS_MESSAGE)
    expect(screen.getAllByText(NO_SHARED_VARIANTS_MESSAGE)).toHaveLength(1)
    await user.click(toggles()[1])
    expect(markerIds(container)).toHaveLength(7)
    expect(screen.queryByText(NO_SHARED_VARIANTS_MESSAGE)).not.toBeInTheDocument()
  })

  test('preserves filters across zoom', async () => {
    const user = userEvent.setup()
    const fixture = buildLinkedVariantFixture()
    const view = render(pageElement(fixture))
    await user.click(toggles()[0])
    await user.selectOptions(screen.getByRole('combobox'), '4')
    view.rerender(pageElement(fixture, 'region', { start: 200, stop: 800 }))
    expect(tableIds()).toEqual([])
    view.rerender(pageElement(fixture))
    expect(tableIds()).toEqual(['1-100-A-C'])
    expectToggleState(true)
  })

  test.each(['gene', 'transcript', 'region'] as const)(
    'resets linked filters only when the connected %s dataset or page identity changes',
    async (page) => {
      const user = userEvent.setup()
      const fixture = buildLinkedVariantFixture()
      const connectedPage = (datasetId: DatasetId, identity: 'first' | 'next' = 'first') =>
        pageElement(fixture, page, undefined, { datasetId, identity })
      const view = render(connectedPage('gnomad_r2_1'))
      const restrictFilters = async () => {
        await user.click(toggles()[0])
        await user.selectOptions(screen.getByRole('combobox'), '4')
        await user.click(screen.getByRole('checkbox', { name: 'Genomes', exact: true }))
        expect(tableIds()).toEqual(['1-100-A-C'])
      }
      const expectReset = () => {
        expectToggleState(false)
        expect(screen.getByRole('combobox')).toHaveValue('0')
        expect(screen.getByRole('checkbox', { name: 'Genomes', exact: true })).toBeChecked()
        expect(tableIds()).toHaveLength(7)
      }

      await restrictFilters()
      view.rerender(connectedPage('gnomad_r2_1'))
      expectToggleState(true)
      expect(screen.getByRole('combobox')).toHaveValue('4')
      expect(screen.getByRole('checkbox', { name: 'Genomes', exact: true })).not.toBeChecked()
      expect(tableIds()).toEqual(['1-100-A-C'])

      view.rerender(connectedPage('gnomad_r2_1', 'next'))
      expectReset()
      await restrictFilters()
      view.rerender(connectedPage('gnomad_r2_1_controls', 'next'))
      expectReset()
    }
  )

  test.each(['gene', 'transcript', 'region'] as const)(
    'does not redraw the %s ClinVar plot while typing with synchronization disabled',
    async (page) => {
      const plot = jest.spyOn(clinvarAllVariantsPlot, 'default')
      const user = userEvent.setup()
      render(pageElement(buildLinkedVariantFixture(), page))
      await expand(user)
      const initialRenders = plot.mock.calls.length
      expect(initialRenders).toBeGreaterThan(0)
      await user.type(screen.getByPlaceholderText('Search variant table'), 'search-A')
      expect(plot).toHaveBeenCalledTimes(initialRenders)
    }
  )

  test('does not repeat gnomAD source merging for ClinVar criteria, sync, or sort changes', async () => {
    const merge = jest.spyOn(variantMerging, 'default')
    const user = userEvent.setup()
    render(pageElement(buildLinkedVariantFixture()))
    const initialMerges = merge.mock.calls.length
    expect(initialMerges).toBeGreaterThan(0)
    await user.click(toggles()[0])
    await user.selectOptions(screen.getByRole('combobox'), '4')
    await user.click(screen.getByRole('button', { name: 'Variant ID', exact: true }))
    expect(merge).toHaveBeenCalledTimes(initialMerges)
    await user.click(screen.getByRole('checkbox', { name: 'Genomes', exact: true }))
    expect(merge).toHaveBeenCalledTimes(initialMerges + 1)
  })

  test('keeps standalone mitochondrial ClinVar filtering free of synchronization controls', async () => {
    const user = userEvent.setup()
    const fixture = buildLinkedVariantFixture()
    render(
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
          <ClinvarVariantTrack
            referenceGenome="GRCh37"
            transcripts={[]}
            variants={fixture.clinvarVariants.map((variant) => ({
              ...variant,
              variant_id: variant.variant_id.replace(/^1-/, 'M-'),
            }))}
          />
        </RegionViewerContext.Provider>
      </BrowserRouter>
    )
    expect(screen.queryByRole('checkbox', { name: VARIANT_SYNC_LABEL })).toBeNull()
    expect(screen.getByText('ClinVar variants (7)')).toBeVisible()
    await user.selectOptions(screen.getByRole('combobox'), '4')
    expect(screen.getByText('ClinVar variants (2)')).toBeVisible()
  })

  test('sorting and switching plot modes preserve selected membership', async () => {
    const user = userEvent.setup()
    const { container } = render(pageElement(buildLinkedVariantFixture()))
    await user.click(toggles()[1])
    await expand(user)
    const expected = ['1-100-A-C', '1-200-A-C', '1-300-A-AT', '1-700-A-C', '1-800-A-C']
    await user.click(screen.getByRole('button', { name: 'Variant ID', exact: true }))
    expect([...tableIds()].sort()).toEqual(expected)
    expect(markerIds(container)).toEqual(expected)
    await user.click(screen.getByRole('button', { name: 'Collapse to bins' }))
    await expand(user)
    expect(markerIds(container)).toEqual(expected)
  })

  test.each([
    { name: 'joint', exclude: null, includeFiltered: false, ac: '5', an: '250' },
    { name: 'genomes', exclude: 'Exomes', includeFiltered: false, ac: '6', an: '200' },
    { name: 'AC0 exomes excluded', exclude: 'Genomes', includeFiltered: false, ac: null, an: null },
    { name: 'AC0 exomes included', exclude: 'Genomes', includeFiltered: true, ac: '0', an: '100' },
  ])(
    'preserves linked v4 $name membership and exported metrics',
    async ({ exclude, includeFiltered, ac, an }) => {
      const user = userEvent.setup()
      const { container } = render(
        pageElement({ ...buildLinkedV4VariantFixture(), datasetId: 'gnomad_r4' })
      )
      await expand(user)
      await user.click(toggles()[0])
      if (includeFiltered) {
        await user.click(screen.getByRole('checkbox', { name: 'Filtered variants', exact: true }))
      }
      if (exclude) {
        await user.click(screen.getByRole('checkbox', { name: exclude, exact: true }))
      }
      const expectedIds = ac === null ? [] : ['1-700-A-C']
      expect(tableIds()).toEqual(expectedIds)
      expect(markerIds(container)).toEqual(expectedIds)
      if (ac === null || an === null) return

      const grid = screen.getByRole('grid')
      const headers = within(grid)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent)
      const tableRow = within(grid)
        .getByRole('rowheader', { name: '1-700-A-C' })
        .closest('[role="row"]')
      if (!tableRow) throw new Error('Missing v4 table row')
      expect(tableRow.children[headers.indexOf('Allele Count')]).toHaveTextContent(ac)
      expect(tableRow.children[headers.indexOf('Allele Number')]).toHaveTextContent(an)

      let csvBlob: Blob | undefined
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: (blob: Blob) => {
          csvBlob = blob
          return 'blob:linked-v4-export'
        },
      })
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      await user.click(screen.getByRole('button', { name: 'Export variants to CSV' }))
      if (!csvBlob) throw new Error('Missing v4 CSV download')
      const exportedBlob = csvBlob
      const csv = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsText(exportedBlob)
      })
      const [header, ...rows] = csv
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split(','))
      expect(rows.map((row) => row[0])).toEqual(expectedIds)
      expect(rows[0][header.indexOf('Allele Count')]).toBe(ac)
      expect(rows[0][header.indexOf('Allele Number')]).toBe(an)
    }
  )

  test('exports exactly the shared source-filtered rows and metrics', async () => {
    const user = userEvent.setup()
    render(pageElement(buildLinkedVariantFixture()))
    await user.click(toggles()[0])
    await user.click(screen.getByRole('checkbox', { name: 'Exomes', exact: true }))
    let csvBlob: Blob | undefined
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob: Blob) => {
        csvBlob = blob
        return 'blob:linked-export'
      },
    })
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await user.click(screen.getByRole('button', { name: 'Export variants to CSV' }))
    if (!csvBlob) throw new Error('Missing CSV download')
    const exportedBlob = csvBlob
    const csv = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(exportedBlob)
    })
    const [header, ...rows] = csv
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(','))
    expect(rows.map((row) => row[0])).toEqual(['1-200-A-C', '1-700-A-C'])
    expect(rows.map((row) => row[header.indexOf('Allele Count')])).toEqual(['6', '6'])
    expect(rows.map((row) => row[header.indexOf('Allele Number')])).toEqual(['200', '200'])
  })
})

describe('shared sync control copy', () => {
  test('uses a labeled checkbox and the existing help button', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    const { rerender } = render(
      <VariantSyncControl id="test-sync" state={{ enabled: false, available: true, onChange }} />
    )
    expect(screen.getByRole('checkbox', { name: VARIANT_SYNC_LABEL })).not.toBeChecked()
    expect(screen.queryByRole('group', { name: VARIANT_SYNC_LABEL })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More information' })).toBeVisible()
    rerender(
      <VariantSyncControl id="test-sync" state={{ enabled: true, available: true, onChange }} />
    )
    await user.click(screen.getByRole('checkbox', { name: VARIANT_SYNC_LABEL }))
    expect(onChange).toHaveBeenCalledWith(false)
  })
})

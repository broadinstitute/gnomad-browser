import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import ReferenceSequenceContextPage from './ReferenceSequenceContextPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <ReferenceSequenceContextPage />
    </MemoryRouter>
  )

const openAdvanced = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Advanced: browse all 9,440 GIAB regions' }))

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const topicCases: Array<[string, string | string[], number]> = [
  ['Duplicated sequence', 'Segmental duplications', 189],
  ['Low short-read mappability', 'Low short-read mappability', 6473],
  ['Long tandem repeats', 'Long tandem repeats (≥101 bp)', 3875],
  ['Satellites / reference gaps', ['Satellites', 'Reference gaps ±15 kb'], 79],
  ['IGL locus', 'VDJ / IGL named stratum', 1],
  ['GRCh38 false duplication', 'Correct copy of falsely duplicated sequence', 1],
]

describe('ReferenceSequenceContextPage', () => {
  test('starts with a concise guided state and does not mount the advanced table', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Explore chr22 sequence contexts with long-read data' })
    ).not.toBeNull()
    expect(screen.getByText('Pilot / experimental')).not.toBeNull()
    expect(
      screen.getByText(/find reference annotations—not observed long-read superiority/)
    ).not.toBeNull()
    expect(screen.getAllByTestId('featured-region-card')).toHaveLength(3)
    expect(screen.queryByTestId('context-region-row')).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(
      screen
        .getByRole('button', { name: /Advanced: browse all 9,440/ })
        .getAttribute('aria-expanded')
    ).toBe('false')
  })

  test('offers only bounded LR summary links for all three featured regions', () => {
    renderPage()

    const expected = new Map([
      ['LCR22', '/region/22-21227238-21327237?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc'],
      ['IGL', '/region/22-22424495-22524494?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc'],
      [
        'CYP2D6/CYP2D7 area',
        '/region/22-42123192-42132193?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc',
      ],
    ])

    screen.getAllByTestId('featured-region-card').forEach((card) => {
      const label = within(card).getByRole('heading').textContent!
      const link = within(card).getByRole('link', { name: 'Explore long-read data' })
      expect(link.getAttribute('href')).toBe(expected.get(label))
      expect(link.getAttribute('href')).not.toContain('show_haplotypes')
      expect(link.getAttribute('href')).not.toContain('dataset=gnomad_r4&')
    })
    expect(screen.queryByRole('link', { name: /short-read|standard region/i })).toBeNull()
  })

  test('reveals featured exact evidence and limitations accessibly', () => {
    renderPage()

    const cypCard = screen.getAllByTestId('featured-region-card')[2]
    const disclosure = within(cypCard).getByRole('button', { name: 'Why this region?' })
    expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(disclosure)
    expect(disclosure.getAttribute('aria-expanded')).toBe('true')
    expect(within(cypCard).getByText('chr22 42123191 42132193')).not.toBeNull()
    expect(
      within(cypCard).getByText(/do not establish coverage, callability, accuracy/)
    ).not.toBeNull()
    expect(
      within(cypCard).getAllByRole('link', { name: 'Pinned source file' }).length
    ).toBeGreaterThan(0)
  })

  test.each(topicCases)(
    'maps the %s topic to its source categories and reveals results',
    (topic, categories, count) => {
      renderPage()

      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${escapeRegex(topic)}`) }))
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: 'Advanced GIAB region browser' })
      )
      expect(
        screen.getByText(new RegExp(`Showing ${count.toLocaleString('en-US')} of 9,440`))
      ).not.toBeNull()
      expect(screen.getAllByTestId('context-region-row')).toHaveLength(Math.min(50, count))
      expect(
        (
          screen.getByRole('checkbox', {
            name: /Multiple source contexts only/,
          }) as HTMLInputElement
        ).checked
      ).toBe(false)
      expect((screen.getByLabelText('Match contexts') as HTMLSelectElement).value).toBe('any')

      const expectedCategories = Array.isArray(categories) ? categories : [categories]
      expectedCategories.forEach((category) => {
        expect(
          (
            screen.getByRole('checkbox', {
              name: new RegExp(escapeRegex(category)),
            }) as HTMLInputElement
          ).checked
        ).toBe(true)
      })
      const checkedCategories = screen
        .getAllByRole('checkbox')
        .filter((checkbox) => (checkbox as HTMLInputElement).checked)
      expect(checkedCategories).toHaveLength(expectedCategories.length)
    }
  )

  test('opens Advanced directly with the existing default and keeps filtering and pagination', () => {
    renderPage()
    openAdvanced()

    expect(screen.getByText(/Showing 1,005 of 9,440/)).not.toBeNull()
    expect(screen.getAllByTestId('context-region-row')).toHaveLength(50)
    fireEvent.click(screen.getByRole('checkbox', { name: /Multiple source contexts only/ }))
    expect(screen.getByText(/Showing 9,440 of 9,440/)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/Page 2 of 189/)).not.toBeNull()
    expect(screen.getAllByTestId('context-region-row')).toHaveLength(50)
  })

  test('filters to IGL, exposes exact evidence, and uses improved row actions', () => {
    renderPage()
    openAdvanced()

    fireEvent.change(screen.getByRole('searchbox', { name: /Find coordinate or reviewed locus/ }), {
      target: { value: 'IGL' },
    })
    expect(screen.getByText(/Showing 1 of 9,440/)).not.toBeNull()
    const row = screen.getByTestId('context-region-row')
    expect(within(row).getByText('22:22,026,076–22,922,912')).not.toBeNull()
    const longRead = within(row).getByRole('link', { name: 'Explore long-read data' })
    expect(longRead.getAttribute('href')).toMatch(
      /^\/region\/22-\d+-\d+\?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc$/
    )

    fireEvent.click(within(row).getByRole('button', { name: 'Why this region?' }))
    expect(screen.getByText('chr22 22026075 22922912')).not.toBeNull()
    expect(screen.getByText(/Browser start = BED start \+ 1/)).not.toBeNull()
  })

  test('supports no-match, invalid-coordinate, chromosome, reset, and provenance states', () => {
    renderPage()
    openAdvanced()

    const search = screen.getByRole('searchbox', { name: /Find coordinate or reviewed locus/ })
    fireEvent.change(search, { target: { value: 'not a reviewed label' } })
    expect(screen.getByText('No chr22 regions match these filters.')).not.toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0])
    expect(screen.getByText(/Showing 1,005 of 9,440/)).not.toBeNull()

    fireEvent.change(search, { target: { value: '22:not-a-coordinate' } })
    expect(screen.getByRole('alert').textContent).toMatch(/22:start-stop/)
    fireEvent.change(search, { target: { value: '21:1-100' } })
    expect(screen.getByRole('alert').textContent).toMatch(/chromosome 22 only/)
    expect(screen.getByText('Methods & provenance')).not.toBeNull()
  })
})

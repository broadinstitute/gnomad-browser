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

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const topicCases: Array<[string, string, number]> = [
  ['Low short-read mappability', 'Low short-read mappability', 6473],
  ['Segmental duplications', 'Segmental duplications', 189],
  ['Long tandem repeats', 'Long tandem repeats (≥101 bp)', 3875],
  ['Satellites', 'Satellites', 65],
  ['Reference gaps', 'Reference gaps ±15 kb', 50],
  ['Reference representation', 'Correct copy of falsely duplicated sequence', 1],
  ['Highly polymorphic immune loci', 'VDJ / IGL named stratum', 1],
]

describe('ReferenceSequenceContextPage', () => {
  test('starts category-first without featured examples or mounted result rows', () => {
    renderPage()

    expect(
      screen.getByRole('heading', {
        name: 'Explore reference sequence contexts on chromosome 22',
      })
    ).not.toBeNull()
    expect(screen.getByText('Pilot / experimental')).not.toBeNull()
    expect(
      screen.getByText('Choose a sequence context to see matching chromosome 22 regions.')
    ).not.toBeNull()
    expect(screen.getByText(/They do not show observed long-read superiority/)).not.toBeNull()
    expect(screen.getAllByRole('button', { name: /matching regions/ })).toHaveLength(7)
    expect(screen.queryByTestId('featured-region-card')).toBeNull()
    expect(screen.queryByText('Start with a featured region')).toBeNull()
    expect(screen.queryByText('Why this region?')).toBeNull()
    expect(screen.queryByTestId('context-region-row')).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  test.each(topicCases)(
    'maps the %s topic to one source category and announces its count',
    (topic, category, count) => {
      renderPage()

      const topicButton = screen.getByRole('button', {
        name: new RegExp(`^${escapeRegex(topic)}`),
      })
      expect(topicButton.textContent).toContain(`${count.toLocaleString('en-US')} matching regions`)
      fireEvent.click(topicButton)

      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: `Regions matching “${topic}”` })
      )
      expect(screen.getByRole('status').textContent).toMatch(
        new RegExp(`^${count.toLocaleString('en-US')} matching regions`)
      )
      expect(screen.getAllByTestId('context-region-row')).toHaveLength(Math.min(50, count))

      fireEvent.click(screen.getByRole('button', { name: 'More filters ▾' }))
      expect(
        (
          screen.getByRole('checkbox', {
            name: category,
          }) as HTMLInputElement
        ).checked
      ).toBe(true)
      expect(
        screen.getAllByRole('checkbox').filter((checkbox) => (checkbox as HTMLInputElement).checked)
      ).toHaveLength(1)
      expect(
        (
          screen.getByRole('checkbox', {
            name: 'Multiple source contexts only',
          }) as HTMLInputElement
        ).checked
      ).toBe(false)
      expect((screen.getByLabelText('Match contexts') as HTMLSelectElement).value).toBe('any')
    }
  )

  test('renders compact rows with full-region LR-only actions and no per-region evidence dump', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^Segmental duplications/ }))

    const row = screen.getAllByTestId('context-region-row')[0]
    expect(within(row).getByRole('heading').textContent).toMatch(/^22:[\d,]+–[\d,]+ · /)
    expect(within(row).getByLabelText('Sequence contexts').children.length).toBeGreaterThan(0)
    expect(
      within(row).getByText(/context types? · [\d,]+ underlying source annotations?/)
    ).not.toBeNull()

    const longRead = within(row).getByRole('link', { name: 'Explore long-read data' })
    expect(longRead.getAttribute('href')).toMatch(
      /^\/region\/22-\d+-\d+\?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc$/
    )
    expect(longRead.getAttribute('href')).not.toContain('show_haplotypes')
    expect(longRead.getAttribute('href')).not.toContain('dataset=gnomad_r4&')
    expect(screen.queryByRole('link', { name: /short-read|standard region/i })).toBeNull()
    expect(screen.queryByText('Why this region?')).toBeNull()
    expect(document.body.textContent).not.toMatch(/chr22 \d+ \d+/)
  })

  test('More filters does not mount rows until Show all regions and preserves pagination', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'More filters ▾' }))

    expect(
      screen.getByRole('searchbox', { name: /Find coordinate or named source region/ })
    ).not.toBeNull()
    expect(screen.queryByTestId('context-region-row')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show all regions' }))

    expect(screen.getByRole('status').textContent).toMatch(/^9,440 matching regions/)
    expect(screen.getAllByTestId('context-region-row')).toHaveLength(50)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Page 2 of 189')).not.toBeNull()
    expect(screen.getAllByTestId('context-region-row')).toHaveLength(50)
  })

  test('supports multi-category filters, sorting, no-match, validation, and reset', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^Segmental duplications/ }))
    fireEvent.click(screen.getByRole('button', { name: 'More filters ▾' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Low short-read mappability' }))
    fireEvent.change(screen.getByLabelText('Match contexts'), { target: { value: 'all' } })
    expect(
      screen.getByRole('heading', { name: 'Chromosome 22 regions matching filters' })
    ).not.toBeNull()

    const search = screen.getByRole('searchbox', {
      name: /Find coordinate or named source region/,
    })
    fireEvent.change(search, { target: { value: 'not a named source' } })
    expect(screen.getByText('No chromosome 22 regions match these filters.')).not.toBeNull()
    fireEvent.change(search, { target: { value: '22:not-a-coordinate' } })
    expect(screen.getByRole('alert').textContent).toMatch(/22:start-stop/)
    fireEvent.change(search, { target: { value: '21:1-100' } })
    expect(screen.getByRole('alert').textContent).toMatch(/chromosome 22 only/)

    fireEvent.click(screen.getByRole('button', { name: 'Reset explorer' }))
    expect(screen.queryByTestId('context-region-row')).toBeNull()
    expect(
      screen.getByText('Choose a sequence context to see matching chromosome 22 regions.')
    ).not.toBeNull()
  })

  test('groups all seven pinned source definitions and traceability under Methods & provenance', () => {
    renderPage()
    fireEvent.click(screen.getByText('Methods & provenance'))

    expect(screen.getByRole('heading', { name: 'Pinned source definitions' })).not.toBeNull()
    expect(screen.getAllByRole('link', { name: 'Pinned source file' })).toHaveLength(7)
    expect(
      screen.getByText(/Coordinates shown in the explorer are GRCh38, 1-based, and inclusive/)
    ).not.toBeNull()
    expect(screen.getByText(/Generated asset SHA-256/)).not.toBeNull()
    expect(screen.getByRole('link', { name: 'DOI' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'NIST data-use policy' })).not.toBeNull()
  })
})

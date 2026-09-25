import { afterEach, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import LongReadExamplesPage from './LongReadExamplesPage'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import HomePage from './HomePage'

import { BrowserRouter } from 'react-router-dom'

const originalLrMode = process.env.LR_Y1_ENABLED

afterEach(() => {
  if (originalLrMode === undefined) delete process.env.LR_Y1_ENABLED
  else process.env.LR_Y1_ENABLED = originalLrMode
})

test('Home Page has no unexpected changes', () => {
  process.env.LR_Y1_ENABLED = 'false'
  const tree = renderer.create(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  )
  expect(tree).toMatchSnapshot()
})

test.each(['true', 'false'])(
  'homepage retains the examples index but not temporary links (LR=%s)',
  (mode) => {
    process.env.LR_Y1_ENABLED = mode
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    expect(
      screen.getByRole('link', { name: 'Long-read example regions' }).getAttribute('href')
    ).toBe('/long-read-examples')
    const removedLinks = [
      'Chromosome 22 long-read examples',
      'Long-read literature workflows',
      'Chromosome 22 reference sequence-context regions',
    ]
    removedLinks.forEach((name) => {
      expect(screen.queryByRole('link', { name })).toBeNull()
    })
    expect(screen.queryByRole('heading', { name: 'Long Read beta' }) !== null).toBe(mode === 'true')
    expect(screen.queryByRole('heading', { name: 'About the long-read datasets' })).toBeNull()
    expect(
      (screen.getByRole('combobox', { name: 'Search dataset' }) as HTMLSelectElement).value
    ).toBe(mode === 'true' ? 'gnomad_r4_lr' : 'gnomad_r4')
  }
)

test.each(['true', 'false'])('homepage uses the original centered shell (LR=%s)', (mode) => {
  process.env.LR_Y1_ENABLED = mode
  render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  )
  const heading = screen.getByRole('heading', { name: 'Genome Aggregation Database' })
  const headingContainer = heading.parentElement!
  const page = headingContainer.parentElement!
  expect(page).toHaveStyleRule('max-width', '740px')
  expect(page).toHaveStyleRule('margin-top', '90px')
  expect(headingContainer).toHaveStyleRule('align-items', 'center')
  expect(headingContainer).toHaveStyleRule('flex-direction', 'column')
  expect(headingContainer).toHaveStyleRule('width', '100%')
  expect(headingContainer).toHaveStyleRule('margin-bottom', '1em')
  expect(headingContainer.querySelector('svg')?.getAttribute('width')).toBe('60%')
  expect(heading).toHaveStyleRule('font-size', '1.2em')
  expect(heading).toHaveStyleRule('font-weight', 'normal')
  expect(heading).toHaveStyleRule('letter-spacing', '2px')
  expect(heading).toHaveStyleRule('text-align', 'center')
  const search = screen.getByRole('combobox', { name: 'Search dataset' }).parentElement!
  expect(search).toHaveStyleRule('width', '100%')
  expect(headingContainer.nextElementSibling).toBe(search)
})

test('LR summary uses the approved shared-dataset description before the examples', () => {
  process.env.LR_Y1_ENABLED = 'true'
  render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  )
  const lrHeading = screen.getByRole('heading', { name: 'Long Read beta' })
  const summary = lrHeading.nextElementSibling!
  const paragraphs = Array.from(summary.querySelectorAll('p')).map((p) =>
    p.textContent?.replace(/\s+/g, ' ').trim()
  )
  expect(paragraphs).toEqual([
    'Explore structural variants, tandem repeats, and other genetic variation from long-read sequencing in HGSVC/HPRC and All of Us (AoU). Both datasets provide allele frequencies and repeat-length distributions, helping characterize variation in complex and repetitive regions of the genome.',
    'HGSVC/HPRC additionally includes haplotype and methylation views, allowing exploration of how nearby variants occur together and their associated methylation patterns.',
  ])
  const search = screen.getByRole('combobox', { name: 'Search dataset' }).parentElement!
  expect(search.nextElementSibling).toBe(lrHeading)
  expect(summary.nextElementSibling).toBe(screen.getByRole('heading', { name: 'Examples' }))
  expect(lrHeading).toHaveStyleRule('color', '#000')
  expect(lrHeading).toHaveStyleRule('font-weight', 'normal')
  expect(lrHeading.children).toHaveLength(0)
  ;['6-31400000-31450000', '1-2100000-2150000', '1-103600000-103650000'].forEach((region) => {
    expect(screen.getByText(region)).toHaveStyleRule('color', '#666')
    expect(screen.getByText(region)).toHaveStyleRule('font-size', '0.875em')
  })
})

test('LR featured regions link directly to existing curated examples with matching view settings', () => {
  process.env.LR_Y1_ENABLED = 'true'
  const home = render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  )
  expect(screen.getByRole('heading', { level: 3, name: 'Examples' })).toBeTruthy()
  expect(
    screen.getByRole('heading', { level: 1, name: 'Genome Aggregation Database' })
  ).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'PCSK9' })).toBeNull()
  expect(screen.getAllByRole('listitem')).toHaveLength(4)
  expect(screen.queryByText('A longer view of human genetic variation')).toBeNull()
  expect(
    screen.queryByText(
      'A few entry points from our existing long-read example regions. Coordinates use GRCh38.'
    )
  ).toBeNull()
  const links = ['MHC region', 'Subtelomeric repeats', 'AMY1A / AMY1B / AMY2A'].map((name) =>
    screen.getByRole('link', { name }).getAttribute('href')
  )
  expect(links).toEqual([
    '/region/6-31400000-31450000?dataset=gnomad_r4_lr&show_haplotypes=true',
    '/region/1-2100000-2150000?dataset=gnomad_r4_lr&show_haplotypes=true',
    '/region/1-103600000-103650000?dataset=gnomad_r4_lr',
  ])
  home.unmount()
  render(<LongReadExamplesPage />)
  const curatedLinks = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
  links.forEach((link) => expect(curatedLinks).toContain(link))
})

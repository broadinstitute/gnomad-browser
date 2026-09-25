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
    expect(screen.queryByText('LONG READ · BETA') !== null).toBe(mode === 'true')
    expect(
      (screen.getByRole('combobox', { name: 'Search dataset' }) as HTMLSelectElement).value
    ).toBe(mode === 'true' ? 'gnomad_r4_lr' : 'gnomad_r4')
  }
)

test('LR featured regions link directly to existing curated examples with matching view settings', () => {
  process.env.LR_Y1_ENABLED = 'true'
  const home = render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  )
  expect(screen.getByRole('heading', { level: 2, name: 'example regions' })).toBeTruthy()
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
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

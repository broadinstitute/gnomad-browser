import '@testing-library/jest-dom'
import React from 'react'
import { beforeEach, expect, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'

import stubVariantTrackCanvas from '../../../tests/__helpers__/stubVariantTrackCanvas'
import mitochondrialVariantFactory from '../__factories__/MitochondrialVariant'
import userPreferences from '../userPreferences'
import MitochondrialVariants from './MitochondrialVariants'
import useMitochondrialVariantFiltering from './useMitochondrialVariantFiltering'

const variants = [100, 200, 300].map((pos) => ({
  ...mitochondrialVariantFactory.build({ pos, an: 100, ac_het: 2, flags: [], filters: [] }),
  consequence: 'missense_variant',
  hgvsc: '',
  hgvsp: '',
}))
const region = { chrom: 'M', start: 1, stop: 500, genes: [], non_coding_constraints: null }
const regions = [{ start: 1, stop: 500 }]

const MitochondrialVariantsHarness = () => {
  const selection = useMitochondrialVariantFiltering({
    variants,
    // @ts-expect-error The region fixture omits fields MitochondrialVariants does not read.
    context: region,
    clinvarReleaseDate: '2026-10-01',
  })
  return <MitochondrialVariants context={region} exportFileName="variants" selection={selection} />
}

beforeEach(async () => {
  localStorage.clear()
  await userPreferences.loadPreferences()
  stubVariantTrackCanvas()
})

test('allows navigator clicks while search leaves the mitochondrial table empty', () => {
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
        <MitochondrialVariantsHarness />
      </RegionViewerContext.Provider>
    </BrowserRouter>
  )
  const search = screen.getByPlaceholderText('Search variant table')
  fireEvent.change(search, { target: { value: 'no-such-variant' } })
  expect(screen.queryByRole('grid')).not.toBeInTheDocument()

  const navigator = screen.getByText('Viewing in table')
  fireEvent.mouseMove(navigator, { clientX: 500 })
  fireEvent.click(navigator)

  fireEvent.change(search, { target: { value: '' } })
  expect(screen.getByRole('grid')).toBeInTheDocument()
})

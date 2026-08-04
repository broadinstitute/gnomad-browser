import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

const mockUnifiedViewProps: any[] = []

jest.mock('../Query', () => ({ children }: any) =>
  children({
    data: {
      meta: { clinvar_release_date: '2026-01-01' },
      long_read_y1_provenance: null,
      region: { long_read_variants: [] },
    },
  })
)

jest.mock('../LongReadVariantPage/LongReadUnifiedView', () => (props: any) => {
  mockUnifiedViewProps.push(props)
  return <div data-testid="long-read-view" />
})

// Jest mocks must be registered before importing the component under test.
// eslint-disable-next-line import/first
import VariantsInRegion from './VariantsInRegion'

const region = {
  reference_genome: 'GRCh38' as const,
  chrom: '22',
  start: 100,
  stop: 200,
  genes: [],
}

const LocationProbe = () => {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

describe('long-read region variant_id integration', () => {
  beforeEach(() => {
    mockUnifiedViewProps.length = 0
  })

  test('passes a decoded direct-load search to the existing unified view without changing the URL', () => {
    const search =
      '?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&show_haplotypes=true&variant_id=22-100-A%3ET&other=kept'

    render(
      <MemoryRouter initialEntries={[`/region/22-100-200${search}`]}>
        <VariantsInRegion datasetId={'gnomad_r4_lr' as any} region={region} />
        <LocationProbe />
      </MemoryRouter>
    )

    expect(screen.getByTestId('long-read-view')).not.toBeNull()
    expect(mockUnifiedViewProps.at(-1).variantSearch).toBe('22-100-A>T')
    expect(screen.getByTestId('location').textContent).toBe(search)
  })
})

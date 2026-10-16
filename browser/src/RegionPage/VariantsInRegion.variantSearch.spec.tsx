import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

const mockUnifiedViewProps: any[] = []
const mockQueryProps: any[] = []

jest.mock('../Query', () => (props: any) => {
  mockQueryProps.push(props)
  return props.children({
    data: {
      meta: { clinvar_release_date: '2026-01-01' },
      long_read_y1_provenance: null,
      region: { long_read_variants: [] },
    },
  })
})

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
  genes: [{ gene_id: 'ENSG1', symbol: 'BRCA1', start: 120, stop: 180, transcripts: [] }],
}

const LocationProbe = () => {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

describe('long-read region variant_id integration', () => {
  beforeEach(() => {
    mockUnifiedViewProps.length = 0
    mockQueryProps.length = 0
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
    expect(mockUnifiedViewProps.at(-1).genes).toBe(region.genes)
    expect(screen.getByTestId('location').textContent).toBe(search)
  })

  test('treats a failed long-read variant query as an error rather than an empty region', () => {
    render(
      <MemoryRouter initialEntries={['/region/22-100-200?dataset=gnomad_r4_lr']}>
        <VariantsInRegion datasetId={'gnomad_r4_lr' as any} region={region} />
      </MemoryRouter>
    )

    // The API returns null for long_read_variants when its database query fails
    const { success } = mockQueryProps.at(-1)
    expect(success({ region: { long_read_variants: null } })).toBeFalsy()
    expect(success({ region: { long_read_variants: [] } })).toBeTruthy()
  })
})

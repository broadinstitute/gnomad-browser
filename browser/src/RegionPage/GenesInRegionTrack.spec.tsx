import React from 'react'
import { render, screen } from '@testing-library/react'

import GenesInRegionTrack from './GenesInRegionTrack'

jest.mock('@gnomad/region-viewer', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    Track: ({ children, renderLeftPanel, renderTopPanel }: any) =>
      mockReact.createElement(
        'section',
        null,
        mockReact.createElement('aside', null, renderLeftPanel()),
        mockReact.createElement('header', null, renderTopPanel()),
        children({ scalePosition: (position: number) => position, width: 1000 })
      ),
  }
})

jest.mock('@gnomad/track-genes', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    GenesPlot: ({ genes, renderGeneLabel }: any) =>
      mockReact.createElement(
        'svg',
        { 'data-testid': 'genes-plot' },
        genes.map((gene: any) =>
          mockReact.createElement('g', { key: gene.gene_id }, renderGeneLabel(gene))
        )
      ),
  }
})

jest.mock('../Link', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return ({ children, className, to }: any) =>
    mockReact.createElement('a', { className, href: to }, children)
})

const region = {
  reference_genome: 'GRCh38' as const,
  chrom: '22',
  start: 100,
  stop: 200,
}

test('keeps an inaccessible gene-track spacer without showing an empty-state message', () => {
  const { container } = render(<GenesInRegionTrack genes={[]} region={region} />)

  expect(screen.queryByText('No genes found in this region')).not.toBeInTheDocument()
  expect(screen.queryByTestId('genes-plot')).not.toBeInTheDocument()

  const spacer = container.querySelector('[aria-hidden="true"]')
  expect(spacer).not.toBeNull()
  expect(spacer).toHaveStyle({ fontSize: '1.5em', marginBottom: '1em', visibility: 'hidden' })
})

test('continues to render genes and their labels in non-empty regions', () => {
  render(
    <GenesInRegionTrack
      genes={[
        {
          gene_id: 'ENSG00000123456',
          symbol: 'GENE1',
          start: 120,
          stop: 180,
          exons: [{ feature_type: 'CDS', start: 130, stop: 170 }],
        },
      ]}
      region={region}
    />
  )

  expect(screen.getByTestId('genes-plot')).toBeInTheDocument()
  expect(screen.getByText('GENE1')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'GENE1' })).toHaveAttribute(
    'href',
    '/gene/ENSG00000123456'
  )
  expect(screen.getByRole('checkbox', { name: 'Include non-coding genes' })).toBeDisabled()
})

import React from 'react'
import { render } from '@testing-library/react'

import { HaplotypeVariantTooltipContent } from './TrVariantTooltip'

const trVariant = {
  variant_id: 'chr4-39348424-TRV-55~49',
  chrom: '4',
  pos: 39348424,
  end: 39348479,
  ref: 'A'.repeat(56),
  alt: 'A'.repeat(273),
  allele_type: 'trv',
  allele_length: 217,
  freq: { af: 0.001, ac: 1, an: 584 },
  populations: [],
  rsid: '',
}

describe('haplotype TR tooltip semantics', () => {
  test('reports carrier ALT length separately from the reference-span glyph', () => {
    const { container } = render(
      <HaplotypeVariantTooltipContent variant={trVariant} />
    )

    expect(container.textContent).toContain('Reference locus: 4:39348424-39348479')
    expect(container.textContent).toContain('Reference allele: 56 bp')
    expect(container.textContent).toContain('Carrier ALT allele: 273 bp')
    expect(container.textContent).toContain('ALT−REF length: +217 bp')
    expect(container.textContent).toContain(
      'The bar spans the reference locus; its width does not encode this carrier’s ALT length.'
    )
  })

  test('labels expanded bars as capped synthetic length-difference space', () => {
    const { container } = render(
      <HaplotypeVariantTooltipContent variant={trVariant} phantomExpanded />
    )

    expect(container.textContent).toContain(
      'The synthetic bar shows the absolute length difference, subject to display caps'
    )
    expect(container.textContent).toContain('added bases have no GRCh38 coordinates')
  })
})

import React from 'react'
import { render } from '@testing-library/react'

import VariantPageTitle from './VariantPageTitle'

describe('long-read variant page title', () => {
  test('omits chr from displayed text without changing the supplied ID', () => {
    const rawId = 'chr22-20077152-DEL-7~2'
    const { container } = render(<VariantPageTitle datasetId="gnomad_r4_lr" variantId={rawId} />)

    expect(container.textContent).toContain('22-20077152-DEL-7 (Allele 2)')
    expect(container.textContent).not.toContain(rawId)
  })

  test('uses explicit symbolic allele fields instead of parsing source-ID tokens', () => {
    const rawId = 'chr22-20077152-DEL-7~2'
    const { container } = render(
      <VariantPageTitle
        datasetId="gnomad_r4_lr"
        variantId={rawId}
        longReadAllele={{
          variant_id: rawId,
          source_variant_id: 'chr22-20077152-DEL-7',
          alt_index: 2,
          alt_count: 3,
          chrom: 'chr22',
          pos: 20077152,
          ref: 'N',
          alt: '<DEL>',
          allele_type: 'del',
          length: -7,
        }}
      />
    )

    expect(container.textContent).toContain(
      'Deletion:22:20077152 deletion (-7 bp; ALT <DEL>) — Allele 2 of 3'
    )
    expect(container.textContent).not.toContain('Insertion')
  })

  test('does not normalize short-read dataset titles', () => {
    const rawId = 'chr22-100-A-T'
    const { container } = render(<VariantPageTitle datasetId="gnomad_r4" variantId={rawId} />)

    expect(container.textContent).toContain(rawId)
  })
})

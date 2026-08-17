import React from 'react'
import { render } from '@testing-library/react'

import VariantPageTitle from './VariantPageTitle'

describe('long-read variant page title', () => {
  test('omits chr from displayed text without changing the supplied ID', () => {
    const rawId = 'chr22-20077152-DEL-7~2'
    const { container } = render(<VariantPageTitle datasetId="gnomad_r4_lr" variantId={rawId} />)

    expect(container.textContent).toContain('22-20077152-DEL-7~2')
    expect(container.textContent).not.toContain(rawId)
  })

  test('does not normalize short-read dataset titles', () => {
    const rawId = 'chr22-100-A-T'
    const { container } = render(<VariantPageTitle datasetId="gnomad_r4" variantId={rawId} />)

    expect(container.textContent).toContain(rawId)
  })
})

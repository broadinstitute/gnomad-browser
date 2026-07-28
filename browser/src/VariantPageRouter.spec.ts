import { describe, expect, test } from '@jest/globals'

import { isLrVariantId } from './VariantPageRouter'

describe('isLrVariantId', () => {
  test.each([
    '22-36286017-TRV-72',
    '22-36286660-SNV',
    'chr22-36280147-TRV-17~1',
    'chr22-36280195-C-T~1',
    'X-12345-DEL-100',
  ])('accepts %s', (variantId) => {
    expect(isLrVariantId(variantId)).toBe(true)
  })

  test.each(['chr23-123-A-C', '22-position-SNV', 'not-a-variant'])('rejects %s', (variantId) => {
    expect(isLrVariantId(variantId)).toBe(false)
  })
})

import { describe, expect, test } from '@jest/globals'

import { isLongReadVariantId } from '@gnomad/dataset-metadata/longReadVariantId'

describe('isLongReadVariantId', () => {
  test.each([
    '22-36286017-TRV-72',
    '22-36286660-SNV',
    'chr22-36280147-TRV-17~1',
    'chr22-22854926-TRV-105TR-2..1bp~2',
    'chr22-36280195-C-T~1',
    'X-12345-DEL-100',
  ])('accepts %s', (variantId) => {
    expect(isLongReadVariantId(variantId)).toBe(true)
  })

  test.each(['chr23-123-A-C', '22-position-SNV', 'not-a-variant'])('rejects %s', (variantId) => {
    expect(isLongReadVariantId(variantId)).toBe(false)
  })
})

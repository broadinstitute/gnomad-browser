import { describe, expect, test } from '@jest/globals'

import queryString from 'query-string'

import { isLongReadVariantId } from '@gnomad/dataset-metadata/longReadVariantId'
import {
  isLegacyExactLongReadTrAllele,
  legacyTrRedirectSearch,
} from './VariantPageRouter'

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

describe('legacy exact long-read TR routes', () => {
  test('only redirects exact LR TR ALT identities', () => {
    expect(
      isLegacyExactLongReadTrAllele('gnomad_r4_lr', 'chr22-36280147-TRV-17~1')
    ).toBe(true)
    expect(isLegacyExactLongReadTrAllele('gnomad_r4_lr', 'chr22-36280147-TRV-17')).toBe(
      false
    )
    expect(isLegacyExactLongReadTrAllele('gnomad_r4_lr', 'chr22-36280195-C-T~1')).toBe(
      false
    )
    expect(isLegacyExactLongReadTrAllele('gnomad_r4', 'chr22-36280147-TRV-17~1')).toBe(
      false
    )
  })

  test('preserves dataset, valid cohort, and unrelated query parameters while selecting the allele', () => {
    const variantId = 'chr4-3074876-TRV-164~49'
    const search = legacyTrRedirectSearch(
      '?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&view=haplotypes&allele=old',
      variantId,
      'hgsvc_hprc'
    )
    expect(queryString.parse(search)).toEqual({
      allele: variantId,
      dataset: 'gnomad_r4_lr',
      lr_cohort: 'hgsvc_hprc',
      view: 'haplotypes',
    })
  })

  test('drops an invalid cohort rather than forwarding it to the canonical route', () => {
    const search = legacyTrRedirectSearch(
      '?dataset=gnomad_r4_lr&lr_cohort=not-a-cohort&keep=1',
      'chr4-3074876-TRV-164~2',
      undefined
    )
    expect(queryString.parse(search)).toEqual({
      allele: 'chr4-3074876-TRV-164~2',
      dataset: 'gnomad_r4_lr',
      keep: '1',
    })
  })
})

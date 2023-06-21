import { describe, test, expect } from '@jest/globals'
import { isStructuralVariantId } from './identifiers'

describe('isStructuralVariantId', () => {
  const v2VariantTypes = ['BND', 'CPX', 'CTX', 'DEL', 'DUP', 'INS', 'INV', 'MCNV', 'OTH']
  const chromosomes = ['1', '12', 'X', 'Y']
  const positions = ['3', '63', '963']

  v2VariantTypes.forEach((v2VariantType) => {
    chromosomes.forEach((chromosome) => {
      positions.forEach((position) => {
        const variantId = [v2VariantType, chromosome, position].join('_')
        test(`recognizes ${variantId} as a v2 variant ID`, () => {
          expect(isStructuralVariantId(variantId)).toEqual(true)
        })
      })
    })
  })
})

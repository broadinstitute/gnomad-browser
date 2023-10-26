import { describe, test, expect } from '@jest/globals'
import { isStructuralVariantId } from './identifiers'
import { forDatasetsMatching } from '../../tests/__helpers__/datasets'

describe('isStructuralVariantId', () => {
  const chromosomes = ['1', '12', 'X', 'Y']

  forDatasetsMatching(/gnomad_sv_r2/, 'with dataset %s', (datasetId) => {
    const variantTypes = ['BND', 'CPX', 'CTX', 'DEL', 'DUP', 'INS', 'INV', 'MCNV', 'OTH']
    const positions = ['3', '63', '963']

    variantTypes.forEach((variantType) => {
      chromosomes.forEach((chromosome) => {
        positions.forEach((position) => {
          const variantId = [variantType, chromosome, position].join('_')
          test(`recognizes ${variantId} as a v2 variant ID`, () => {
            expect(isStructuralVariantId(variantId, datasetId)).toEqual(true)
          })
        })
      })
    })
  })

  forDatasetsMatching(/gnomad_sv_r4/, 'with dataset %s', (datasetId) => {
    const variantTypes = ['BND', 'CPX', 'CTX', 'DEL', 'DUP', 'INS', 'INV', 'CNV']
    const suffixes = ['0F1E2D3C', 'DEADBEEF', '12345678']

    variantTypes.forEach((variantType) => {
      chromosomes.forEach((chromosome) => {
        suffixes.forEach((suffix) => {
          const variantId = [variantType, `CHR${chromosome}`, suffix].join('_')
          test(`recognizes ${variantId} as a v4 variant ID`, () => {
            expect(isStructuralVariantId(variantId, datasetId)).toEqual(true)
          })
        })
      })
    })
  })
})

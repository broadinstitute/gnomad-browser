import { describe, expect, test } from '@jest/globals'

import clinvarVariantFactory from '../__factories__/ClinvarVariant'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import annotateVariantsWithClinvar from './annotateVariantsWithClinvar'

const annotatedVariant = clinvarVariantFactory.build({
  variant_id: '1-100-A-C',
  clinical_significance: 'Pathogenic',
  clinvar_variation_id: '987654',
})

const variants = [{ variant_id: '1-100-A-C' }, { variant_id: '1-200-G-T' }]

describe('annotateVariantsWithClinvar', () => {
  test('copies clinical significance and variation id onto matching variants', () => {
    const [matched] = annotateVariantsWithClinvar(variants, [annotatedVariant])

    expect(matched).toEqual({
      variant_id: '1-100-A-C',
      clinical_significance: 'Pathogenic',
      clinvar_variation_id: '987654',
    })
  })

  test('leaves variants with no ClinVar record untouched', () => {
    const [, unmatched] = annotateVariantsWithClinvar(variants, [annotatedVariant])

    expect(unmatched).toEqual({ variant_id: '1-200-G-T' })
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', []],
  ] as [string, ClinvarVariant[] | null | undefined][])(
    'returns variants unannotated when the ClinVar list is %s',
    (_label, clinvarVariants) => {
      expect(annotateVariantsWithClinvar(variants, clinvarVariants)).toEqual(variants)
    }
  )

  test('does not mutate its arguments', () => {
    const clinvarVariants = [annotatedVariant]

    annotateVariantsWithClinvar(variants, clinvarVariants)

    expect(variants).toEqual([{ variant_id: '1-100-A-C' }, { variant_id: '1-200-G-T' }])
    expect(clinvarVariants).toEqual([annotatedVariant])
  })
})

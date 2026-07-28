import { describe, expect, test } from '@jest/globals'

import {
  ALLELE_TYPE_COLORS,
  getAlleleTypeColor,
  getVariantCategory,
  GNOMAD_SV_CLASS_COLORS,
  normalizeAlleleTypeToSvClass,
  VARIANT_CATEGORY_COLORS,
} from './variantUtils'
import { getColorBySvTypeCSS, getColorBySvTypeRGBA } from './variantColorUtils'
import { VARIANT_TYPE_COLORS } from '../Haplotypes/colors'

describe('long-read structural variant palette', () => {
  test.each([
    ['del', 'DEL', '#D43925'],
    ['ALU_DELETION', 'DEL', '#D43925'],
    ['dup', 'DUP', '#2376B2'],
    ['dup_interspersed', 'DUP', '#2376B2'],
    ['mcnv', 'MCNV', '#7459B2'],
    ['cnv', 'MCNV', '#7459B2'],
    ['ins', 'INS', '#D474E0'],
    ['line_ins', 'INS', '#D474E0'],
    ['numt', 'INS', '#D474E0'],
    ['inv', 'INV', '#FA931E'],
    ['complex_dup', 'CPX', '#71E38C'],
    ['inv_dup', 'CPX', '#71E38C'],
    ['bnd', 'OTH', '#397246'],
    ['CTX', 'OTH', '#397246'],
  ])('maps %s to the %s class color', (alleleType, svClass, color) => {
    expect(normalizeAlleleTypeToSvClass(alleleType)).toBe(svClass)
    expect(getAlleleTypeColor(alleleType)).toBe(color)
    expect(getColorBySvTypeCSS(alleleType)).toBe(color)
    expect(ALLELE_TYPE_COLORS[alleleType.toLowerCase()]).toBe(color)
    expect(VARIANT_TYPE_COLORS[alleleType.toLowerCase()]).toBe(color)
  })

  test('preserves SNV/TR colors and classifies all LR insertion aliases correctly', () => {
    expect(getAlleleTypeColor('snv')).toBe('#4A90D9')
    expect(getAlleleTypeColor('trv')).toBe('#E8A838')
    expect(VARIANT_CATEGORY_COLORS.snv).toBe('#4A90D9')
    expect(VARIANT_CATEGORY_COLORS.tr).toBe('#E8A838')
    expect(['ins', 'insertion', 'alu_ins', 'line_ins', 'sva_ins', 'numt'].map((type) => getVariantCategory(type))).toEqual(
      Array(6).fill('insertion')
    )
  })

  test('uses OTH for unknown LR SV categories in CSS and track RGBA paths', () => {
    expect(getAlleleTypeColor('future_sv')).toBe(GNOMAD_SV_CLASS_COLORS.OTH)
    expect(getColorBySvTypeRGBA('DUP')).toEqual([35, 118, 178, 255])
  })
})

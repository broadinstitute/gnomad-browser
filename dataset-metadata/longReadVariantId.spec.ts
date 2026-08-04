import { isLongReadVariantId, parseLongReadVariantId } from './longReadVariantId'

describe('long-read variant IDs', () => {
  test.each([
    '22-36286660-SNV',
    '22-36286017-TRV-72',
    'chr22-36280147-TRV-17~1',
    'chr22-22854926-TRV-105TR-2..1bp~2',
    'chr22-36280195-C-T~1',
    '22-36280195-C-T',
    'X-12345-DEL-100',
  ])('accepts %s', (variantId) => {
    expect(isLongReadVariantId(variantId)).toBe(true)
  })

  test.each(['chr23-123-A-C', '22-position-SNV', '22-123-A-<DEL>', 'not-a-variant'])(
    'rejects %s',
    (variantId) => {
      expect(isLongReadVariantId(variantId)).toBe(false)
    }
  )

  test('parses sequence alleles and provenance', () => {
    expect(parseLongReadVariantId('chr22-36280195-C-T~1')).toEqual({
      chrom: '22',
      pos: 36280195,
      ref: 'C',
      alt: 'T',
      provenance: 1,
    })
  })

  test('parses compact symbolic alleles', () => {
    expect(parseLongReadVariantId('22-36286017-TRV-72')).toEqual({
      chrom: '22',
      pos: 36286017,
      alleleType: 'trv',
      alleleLength: 72,
    })
  })

  test('preserves source-defined symbolic suffixes used by canonical TR routes', () => {
    expect(parseLongReadVariantId('chr22-22854926-TRV-105TR-2..1bp~2')).toEqual({
      chrom: '22',
      pos: 22854926,
      alleleType: 'trv',
      symbolicSuffix: '105TR-2..1bp',
      provenance: 2,
    })
  })
})

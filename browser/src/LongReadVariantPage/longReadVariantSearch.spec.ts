import {
  filterLongReadVariantsBySearch,
  LONG_READ_VARIANT_SEARCH_LIMITS,
  matchesLongReadVariantSearch,
  parseLongReadVariantSearch,
} from './longReadVariantSearch'

const region = { chrom: '22', start: 100, stop: 500 }
const variants = [
  {
    variant_id: '22-123-A-T', source_variant_id: 'source-SNV-1', chrom: 'chr22', pos: 123,
    ref: 'A', alt: 'T', rsids: ['rs123'], allele_type: 'snv', short_read_match_id: '22-123-A-T',
  },
  {
    variant_id: '22-200-event~2', source_variant_id: 'SV_EVENT_9', chrom: '22', pos: 200, end: 260,
    ref: 'N', alt: 'ACGTAC', rsid: '', allele_type: 'dup', tr_id: 'TR22_200', motifs: ['CAG'],
  },
]

describe('long-read variant search', () => {
  test.each([
    ['123', ['22-123-A-T']],
    [' chr22 : 123 ', ['22-123-A-T']],
    ['22-123', ['22-123-A-T']],
    ['chr22:190-210', ['22-200-event~2']],
    ['a > t', ['22-123-A-T']],
    ['123 A>T', ['22-123-A-T']],
    ['chr22:123 A>T', ['22-123-A-T']],
    ['22-123-A-T', ['22-123-A-T']],
    ['22\t123\tA\tT', ['22-123-A-T']],
    ['RS123', ['22-123-A-T']],
    ['sv_event_9', ['22-200-event~2']],
    ['dup', ['22-200-event~2']],
    ['tr22_200', ['22-200-event~2']],
    ['cgt', ['22-200-event~2']],
    ['cag', ['22-200-event~2']],
  ])('normalizes and matches %s', (input, expectedIds) => {
    const search = parseLongReadVariantSearch(input, region)
    expect(search.status).toBe('ready')
    expect(filterLongReadVariantsBySearch(variants, search).map((variant) => variant.variant_id))
      .toEqual(expectedIds)
  })

  test('normalizes useful structural and tandem-repeat type aliases', () => {
    expect(matchesLongReadVariantSearch(variants[1], parseLongReadVariantSearch('SV', region))).toBe(true)
    expect(matchesLongReadVariantSearch(
      { ...variants[1], allele_type: 'trv' },
      parseLongReadVariantSearch('TR', region)
    )).toBe(true)
  })

  test('matches preserved aliases on aggregated TR/SV rows', () => {
    const search = parseLongReadVariantSearch('alternate-tr-allele', region)
    expect(matchesLongReadVariantSearch({
      ...variants[1],
      search_identifiers: ['alternate-TR-allele'],
    }, search)).toBe(true)
  })

  test('combines pasted comma/newline terms with OR semantics', () => {
    const search = parseLongReadVariantSearch('rs123,\n SV_EVENT_9', region)
    expect(filterLongReadVariantsBySearch(variants, search)).toHaveLength(2)
  })

  test('reports malformed terms while retaining valid OR terms', () => {
    const search = parseLongReadVariantSearch('rs123, chr22:not-a-position', region)
    expect(search.status).toBe('partial')
    expect(search.terms[1]).toMatchObject({ status: 'malformed', code: 'invalid_coordinate' })
    expect(matchesLongReadVariantSearch(variants[0], search)).toBe(true)
  })

  test('reports out-of-region coordinates as navigation targets, not local matches', () => {
    const search = parseLongReadVariantSearch('chr6:1000-1200', region)
    expect(search.status).toBe('invalid')
    expect(search.terms[0]).toMatchObject({
      status: 'out_of_region', chrom: '6', start: 1000, end: 1200,
    })
    expect(matchesLongReadVariantSearch(variants[0], search)).toBe(false)
  })

  test('distinguishes exact positions from substring position matching', () => {
    const search = parseLongReadVariantSearch('23', { chrom: '22', start: 1, stop: 500 })
    expect(filterLongReadVariantsBySearch(variants, search)).toEqual([])
  })

  test('bounds input and pasted term count', () => {
    expect(parseLongReadVariantSearch('x'.repeat(LONG_READ_VARIANT_SEARCH_LIMITS.maxInputLength + 1), region))
      .toMatchObject({ status: 'limit_exceeded', issues: [{ code: 'input_too_long' }] })
    expect(parseLongReadVariantSearch(
      Array.from({ length: LONG_READ_VARIANT_SEARCH_LIMITS.maxTerms + 1 }, (_, index) => `rs${index}`).join(','),
      region
    )).toMatchObject({ status: 'limit_exceeded', issues: [{ code: 'too_many_terms' }] })
  })

  test('treats an empty query as an inactive match-all search', () => {
    const search = parseLongReadVariantSearch('   ', region)
    expect(search.status).toBe('empty')
    expect(variants.every((variant) => matchesLongReadVariantSearch(variant, search))).toBe(true)
  })
})

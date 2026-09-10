import { abbreviateLongReadTableLabel, condenseLongReadMotifs } from './longReadTablePresentation'

const stored = (motifs: string[]) => condenseLongReadMotifs(motifs, 'Stored: ')

describe('table label abbreviation', () => {
  test.each([0, 39, 40, 41, 100])('bounds %s code points', (length) => {
    const value = '🧬'.repeat(length)
    const label = abbreviateLongReadTableLabel(value)
    expect(Array.from(label)).toHaveLength(Math.min(length, 40))
    expect(label).toBe(length <= 40 ? value : `${'🧬'.repeat(27)}…${'🧬'.repeat(12)}`)
  })
})

describe('complete-motif condensation', () => {
  test('keeps exact strings, stable order, and no new case/orientation equivalence', () => {
    expect(stored(['CAG', 'AGC', 'CTG', 'CAG', 'cag']).motifs).toEqual(['CAG', 'AGC', 'CTG', 'cag'])
    expect(stored(['CAG', 'AGC', 'CTG', 'CAG']).label).toBe('Stored: CAG, AGC, CTG')
  })

  test('preserves the empty list without an invented zero-motif suffix', () => {
    expect(stored([])).toEqual({
      label: 'Stored: ',
      motifs: [],
      displayedMotifs: [],
      omittedMotifs: [],
      omittedCount: 0,
    })
  })

  test('shows a complete list at the exact 40-character boundary, but never clips a motif', () => {
    expect(stored(['A'.repeat(32)]).label).toBe(`Stored: ${'A'.repeat(32)}`)
    expect(stored(['A'.repeat(33)]).label).toBe('Stored: +1 more motif')
    expect(stored(['A'.repeat(15), 'C'.repeat(15)]).label).toHaveLength(40)
    expect(stored(['A'.repeat(15), 'C'.repeat(16)]).label).toBe(
      `Stored: ${'A'.repeat(15)} +1 more motif`
    )
  })

  test('skips an overlong first motif but admits a later complete motif', () => {
    const long = 'A'.repeat(33)
    expect(stored([long, 'CAG', long])).toEqual({
      label: 'Stored: CAG +1 more motif',
      motifs: [long, 'CAG'],
      displayedMotifs: ['CAG'],
      omittedMotifs: [long],
      omittedCount: 1,
    })
  })

  test('scans once in order instead of optimizing for the most motifs', () => {
    const line = condenseLongReadMotifs(
      ['AAAAA', 'CC', 'GG', 'TT', 'A'.repeat(100)],
      'Catalog pathogenic: '
    )
    expect(line.label).toBe('Catalog pathogenic: AAAAA +4 more motifs')
    expect(line.displayedMotifs).toEqual(['AAAAA'])
  })

  test('shows only the omitted distinct count when all motifs are overlong', () => {
    const a = 'A'.repeat(100)
    const c = 'C'.repeat(100)
    expect(stored([a, c, a]).label).toBe('Stored: +2 more motifs')
    expect(stored([a, c, a]).omittedCount).toBe(2)
  })

  test.each([9, 10])('reserves the actual %s-omission suffix including skipped motifs', (count) => {
    const long = Array.from({ length: count }, (_, i) => 'A'.repeat(40 + i))
    const line = condenseLongReadMotifs([...long, 'CAGCA'], 'Catalog pathogenic: ')
    expect(line.label).toBe(
      count === 9
        ? 'Catalog pathogenic: CAGCA +9 more motifs'
        : 'Catalog pathogenic: +11 more motifs'
    )
    expect(line.omittedCount).toBe(count === 9 ? 9 : 11)
    expect(condenseLongReadMotifs([...long, 'CAGC'], 'Catalog pathogenic: ').label).toBe(
      `Catalog pathogenic: CAGC +${count} more motifs`
    )
    expect(Array.from(line.label).length).toBeLessThanOrEqual(40)
  })

  test('counts Unicode code points, not UTF-16 units', () => {
    expect(stored(['🧬'.repeat(32)]).omittedCount).toBe(0)
    expect(stored(['🧬'.repeat(33)]).label).toBe('Stored: +1 more motif')
  })

  test('RFC1 catalog context fits exactly without replacing the benign stored motif', () => {
    const motifs = ['AAGGC', 'AAGGG', 'AGAGG', 'AGGGC', 'GGACA']
    const line = condenseLongReadMotifs(motifs, 'Catalog pathogenic: ')
    expect(line.label).toBe('Catalog pathogenic: AAGGC +4 more motifs')
    expect(line.label).toHaveLength(40)
    expect(line.omittedMotifs).toEqual(motifs.slice(1))
    expect(stored(['AAAAG']).label).toBe('Stored: AAAAG')
  })
})

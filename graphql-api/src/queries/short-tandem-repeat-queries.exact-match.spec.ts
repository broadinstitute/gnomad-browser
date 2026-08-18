jest.mock('../elasticsearch', () => ({ catchNotFound: (error: unknown) => error }))

// The Elasticsearch mock must be installed before this query module initializes.
// eslint-disable-next-line import/first
import { exactShortTandemRepeatCatalogMatches } from './short-tandem-repeat-queries'

const httComponents = [
  { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
  { chrom: '4', start0: 3074927, end0: 3074936, motif: 'CAA' },
  { chrom: '4', start0: 3074939, end0: 3074966, motif: 'CCG' },
  { chrom: '4', start0: 3074966, end0: 3074972, motif: 'CCT' },
  { chrom: '4', start0: 3074983, end0: 3074994, motif: 'GCC' },
  { chrom: '4', start0: 3075029, end0: 3075040, motif: 'CCG' },
]

describe('exact LR/classic tandem-repeat catalog matching', () => {
  test('matches HTT only through the exact CAG component contract', () => {
    const matches = exactShortTandemRepeatCatalogMatches(
      [
        {
          id: 'HTT',
          gene: { symbol: 'HTT' },
          main_reference_region: { chrom: '4', start: 3074876, stop: 3074933 },
          reference_repeat_unit: 'CAG',
          stripy_id: 'HTT',
          strchive_id: 'HD_HTT',
        },
      ],
      httComponents
    )
    expect(matches).toEqual([
      {
        id: 'HTT',
        gene_symbol: 'HTT',
        reference_repeat_unit: 'CAG',
        stripy_id: 'HTT',
        strchive_id: 'HD_HTT',
      },
    ])
  })

  test.each([
    { chrom: '4', start: 3074877, stop: 3074933, unit: 'CAG' },
    { chrom: '4', start: 3074876, stop: 3074933, unit: 'AGC' },
    { chrom: '4', start: 3074800, stop: 3075000, unit: 'CAG' },
  ])(
    'rejects overlap, shifted coordinates, and motif rotation: %o',
    ({ chrom, start, stop, unit }) => {
      expect(
        exactShortTandemRepeatCatalogMatches(
          [
            {
              id: 'near-HTT',
              main_reference_region: { chrom, start, stop },
              reference_repeat_unit: unit,
            },
          ],
          httComponents
        )
      ).toEqual([])
    }
  )

  test('fails closed when one component maps ambiguously', () => {
    const records = ['A', 'B'].map((id) => ({
      id,
      main_reference_region: { chrom: '4', start: 3074876, stop: 3074933 },
      reference_repeat_unit: 'CAG',
    }))
    expect(exactShortTandemRepeatCatalogMatches(records, httComponents)).toEqual([])
  })
})

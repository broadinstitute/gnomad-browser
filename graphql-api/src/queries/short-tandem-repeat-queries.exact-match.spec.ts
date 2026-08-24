jest.mock('../elasticsearch', () => ({ catchNotFound: (error: unknown) => error }))

// The Elasticsearch mock must be installed before this query module initializes.
// eslint-disable-next-line import/first
import {
  classifyExactShortTandemRepeatCatalogContext,
  exactShortTandemRepeatCatalogMatches,
  fetchBoundedShortTandemRepeatCatalog,
  SHORT_TANDEM_REPEAT_CATALOG_HARD_CEILING,
} from './short-tandem-repeat-queries'

const httComponents = [
  { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
  { chrom: '4', start0: 3074927, end0: 3074936, motif: 'CAA' },
  { chrom: '4', start0: 3074939, end0: 3074966, motif: 'CCG' },
  { chrom: '4', start0: 3074966, end0: 3074972, motif: 'CCT' },
  { chrom: '4', start0: 3074983, end0: 3074994, motif: 'GCC' },
  { chrom: '4', start0: 3075029, end0: 3075040, motif: 'CCG' },
]

const region = (overrides: Record<string, unknown> = {}) => ({
  reference_genome: 'GRCh38',
  chrom: '4',
  start: 3074876,
  stop: 3074933,
  ...overrides,
})

describe('exact LR/classic tandem-repeat catalog matching', () => {
  test('matches HTT only through the exact CAG component contract', () => {
    const matches = exactShortTandemRepeatCatalogMatches(
      [
        {
          id: 'HTT',
          gene: { symbol: 'HTT' },
          main_reference_region: region(),
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
    { region: region({ start: 3074877 }), unit: 'CAG' },
    { region: region(), unit: 'AGC' },
    { region: region({ start: 3074800, stop: 3075000 }), unit: 'CAG' },
    { region: region({ reference_genome: 'GRCh37' }), unit: 'CAG' },
    { region: region(), unit: 'cag' },
  ])('rejects non-exact assembly/coordinate/stored-motif identity: %o', ({ region: item, unit }) => {
    expect(
      exactShortTandemRepeatCatalogMatches(
        [{ id: 'near-HTT', main_reference_region: item, reference_repeat_unit: unit }],
        httComponents
      )
    ).toEqual([])
  })

  test('fails closed when one component maps to two catalog records', () => {
    const records = ['A', 'B'].map((id) => ({
      id,
      main_reference_region: region(),
      reference_repeat_unit: 'CAG',
    }))
    const context = classifyExactShortTandemRepeatCatalogContext(records, httComponents)
    expect(context.status).toBe('AMBIGUOUS_CATALOG')
    expect(context.candidates.map((candidate) => candidate.repeat.id)).toEqual(['A', 'B'])
    expect(exactShortTandemRepeatCatalogMatches(records, httComponents)).toEqual([])
  })

  test('uses one bounded catalog query rather than the generic 10,000-row fetch', async () => {
    const search = jest.fn().mockResolvedValue({ body: { hits: { hits: [] } } })
    await expect(fetchBoundedShortTandemRepeatCatalog({ search }, 'gnomad_r4')).resolves.toEqual([])
    expect(search).toHaveBeenCalledTimes(1)
    expect(search.mock.calls[0][0].size).toBe(SHORT_TANDEM_REPEAT_CATALOG_HARD_CEILING + 1)
  })

  test('preserves ordered duplicate components and fails closed', () => {
    const record = {
      id: 'synthetic',
      reference_regions: [region()],
      reference_repeat_unit: 'CAG',
    }
    const context = classifyExactShortTandemRepeatCatalogContext(
      [record],
      [httComponents[0], httComponents[0]]
    )
    expect(context.status).toBe('AMBIGUOUS_COMPONENT')
    expect(context.candidates.map((candidate) => candidate.component_index)).toEqual([0, 1])
  })
})

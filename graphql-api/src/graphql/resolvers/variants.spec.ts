import { describe, expect, jest, test } from '@jest/globals'

import resolvers from './variants'

jest.mock('../../cache', () => ({
  withCache: <QueryFunction>(query: QueryFunction) => query,
}))

jest.mock('../../queries/clinvar-variant-queries', () => ({
  fetchClinvarVariantByClinvarVariationId: jest.fn(),
}))

describe('Region.variants', () => {
  test('rejects a v3 region with too many variants before searching', async () => {
    const count = jest.fn((_request: unknown) => Promise.resolve({ body: { count: 30001 } }))
    const search = jest.fn()
    const scroll = jest.fn()
    const region = {
      chrom: '19',
      start: 10889851,
      stop: 11333431,
      reference_genome: 'GRCh38',
    }

    await expect(
      resolvers.Region.variants(
        region,
        { dataset: 'gnomad_r3' },
        { esClient: { count, search, scroll } }
      )
    ).rejects.toThrow(
      'This region has too many variants to display. Select a smaller region to view variants.'
    )

    expect(count).toHaveBeenCalledTimes(1)
    expect(count.mock.calls[0][0]).toHaveProperty(
      ['body', 'query', 'bool', 'filter', '0', 'term', 'locus.contig'],
      'chr19'
    )
    expect(search).not.toHaveBeenCalled()
    expect(scroll).not.toHaveBeenCalled()
  })
})

import { describe, expect, jest, test } from '@jest/globals'

import { UserVisibleError } from '../../errors'

import gnomadV4VariantQueries from './gnomad-v4-variant-queries'

const gene = { gene_id: 'ENSG00000139618', exons: [] }
const emptySearchResponse = {
  body: { _scroll_id: 'test-scroll', hits: { total: { value: 0 }, hits: [] } },
}

describe('gnomAD v4 variants by gene', () => {
  test.each(['Service overloaded', 'Request timed out'])(
    'preserves the user-visible error from the initial search: %s',
    async (message) => {
      const error = new UserVisibleError(message)
      const esClient = { search: jest.fn<() => Promise<never>>().mockRejectedValue(error) }

      await expect(gnomadV4VariantQueries.fetchVariantsByGene(esClient, gene, 'all')).rejects.toBe(
        error
      )
    }
  )

  test('keeps the existing wrapper for unexpected Elasticsearch errors', async () => {
    const error = new Error('search_phase_execution_exception')
    const esClient = { search: jest.fn<() => Promise<never>>().mockRejectedValue(error) }

    await expect(gnomadV4VariantQueries.fetchVariantsByGene(esClient, gene, 'all')).rejects.toThrow(
      "'Error fetching variants by gene:', Error: search_phase_execution_exception"
    )
  })

  test('preserves an overload error while fetching the next page', async () => {
    const error = new UserVisibleError('Service overloaded')
    const esClient = {
      search: jest.fn<() => Promise<typeof emptySearchResponse>>().mockResolvedValue({
        body: { _scroll_id: 'test-scroll', hits: { total: { value: 1 }, hits: [] } },
      }),
      scroll: jest.fn<() => Promise<never>>().mockRejectedValue(error),
    }

    await expect(gnomadV4VariantQueries.fetchVariantsByGene(esClient, gene, 'all')).rejects.toBe(
      error
    )
    expect(esClient.scroll).toHaveBeenCalledTimes(1)
  })

  test('preserves an overload error from the LoF-curation search', async () => {
    const error = new UserVisibleError('Service overloaded')
    const esClient = {
      search: jest
        .fn<() => Promise<typeof emptySearchResponse>>()
        .mockResolvedValueOnce(emptySearchResponse)
        .mockRejectedValueOnce(error),
      clearScroll: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }

    await expect(gnomadV4VariantQueries.fetchVariantsByGene(esClient, gene, 'all')).rejects.toBe(
      error
    )
    expect(esClient.search).toHaveBeenLastCalledWith(
      expect.objectContaining({ index: 'gnomad_v4_lof_curation_results' })
    )
  })
})

import { describe, expect, jest, test } from '@jest/globals'

import { UserVisibleError } from '../errors'

import { fetchExomeCoverageForRegion, fetchGenomeCoverageForRegion } from './coverage-queries'

jest.mock('../cache', () => ({
  withCache: <QueryFunction>(query: QueryFunction) => query,
}))

const region = { chrom: '1', start: 100, stop: 200, reference_genome: 'GRCh38' }

describe.each([
  { label: 'exome', fetchCoverageForRegion: fetchExomeCoverageForRegion },
  { label: 'genome', fetchCoverageForRegion: fetchGenomeCoverageForRegion },
])('$label coverage errors', ({ fetchCoverageForRegion }) => {
  test.each(['Service overloaded', 'Request timed out'])(
    'preserves the user-visible error: %s',
    async (message) => {
      const error = new UserVisibleError(message)
      const esClient = { search: jest.fn<() => Promise<never>>().mockRejectedValue(error) }

      await expect(fetchCoverageForRegion(esClient, 'gnomad_r4', region)).rejects.toBe(error)
      expect(error.extensions.isUserVisible).toBe(true)
    }
  )

  test('keeps the existing wrapper for unexpected Elasticsearch errors', async () => {
    const error = new Error('search_phase_execution_exception')
    const esClient = { search: jest.fn<() => Promise<never>>().mockRejectedValue(error) }

    await expect(fetchCoverageForRegion(esClient, 'gnomad_r4', region)).rejects.toThrow(
      "Couldn't fetch coverage, Error: search_phase_execution_exception"
    )
  })
})

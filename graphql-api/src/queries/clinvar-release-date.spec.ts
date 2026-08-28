import { describe, expect, test, jest } from '@jest/globals'

// Avoids throwing at import time; no real connection is made in this test.
process.env.ELASTICSEARCH_URL ||= 'http://localhost:9200'

const loadFetchClinvarReleaseDate = () => {
  let fetchClinvarReleaseDate: typeof import('./clinvar-variant-queries').fetchClinvarReleaseDate
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    ;({ fetchClinvarReleaseDate } = require('./clinvar-variant-queries'))
  })
  return fetchClinvarReleaseDate!
}

const mockClientReturning = (releaseDatesByIndex: Record<string, string>) => ({
  indices: {
    getMapping: jest.fn(({ index }: { index: string }) =>
      Promise.resolve({
        body: {
          [index]: {
            mappings: {
              _meta: {
                table_globals: { clinvar_release_date: releaseDatesByIndex[index] },
              },
            },
          },
        },
      })
    ),
  },
})

const mockClientRejecting = (error: Error) => ({
  indices: {
    getMapping: jest.fn(() => Promise.reject(error)),
  },
})

describe('fetchClinvarReleaseDate', () => {
  test('returns the release date when both reference genome indices agree', async () => {
    const fetchClinvarReleaseDate = loadFetchClinvarReleaseDate()
    const esClient = mockClientReturning({
      clinvar_grch37_variants: '2024-01-07',
      clinvar_grch38_variants: '2024-01-07',
    })

    expect(await fetchClinvarReleaseDate(esClient)).toBe('2024-01-07')
  })

  test('serves a second call from cache, without querying the indices again', async () => {
    const fetchClinvarReleaseDate = loadFetchClinvarReleaseDate()
    const esClient = mockClientReturning({
      clinvar_grch37_variants: '2024-01-07',
      clinvar_grch38_variants: '2024-01-07',
    })

    expect(await fetchClinvarReleaseDate(esClient)).toBe('2024-01-07')
    expect(esClient.indices.getMapping).toHaveBeenCalledTimes(2) // one per reference genome

    expect(await fetchClinvarReleaseDate(esClient)).toBe('2024-01-07')
    expect(esClient.indices.getMapping).toHaveBeenCalledTimes(2) // unchanged: served from cache
  })

  test('resolves to null, instead of rejecting, when the ClinVar indices are unreachable', async () => {
    const fetchClinvarReleaseDate = loadFetchClinvarReleaseDate()
    const esClient = mockClientRejecting(new Error('connect ECONNREFUSED 127.0.0.1:9200'))

    await expect(fetchClinvarReleaseDate(esClient)).resolves.toBeNull()
  })

  test('does not keep resolving to null after a transient failure, once the source recovers', async () => {
    const fetchClinvarReleaseDate = loadFetchClinvarReleaseDate()
    const failingClient = mockClientRejecting(new Error('connect ECONNREFUSED 127.0.0.1:9200'))
    const healthyClient = mockClientReturning({
      clinvar_grch37_variants: '2024-01-07',
      clinvar_grch38_variants: '2024-01-07',
    })

    expect(await fetchClinvarReleaseDate(failingClient)).toBeNull()
    expect(await fetchClinvarReleaseDate(healthyClient)).toBe('2024-01-07')
  })
})

jest.mock('../cache', () => ({ withCache: (fn: any) => fn }))
jest.mock('../elasticsearch', () => ({ catchNotFound: (error: any) => { throw error } }))
jest.mock('./variant-datasets/gnomad-v4-variant-queries', () => ({ getFilteredRegions: jest.fn() }))

import { fetchClinvarReleaseDate } from './clinvar-variant-queries'

const mapping = (date: string) => ({
  body: { clinvar: { mappings: { _meta: { table_globals: { clinvar_release_date: date } } } } },
})

describe('ClinVar release date request-owned refresh', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    fetchClinvarReleaseDate.cancel()
  })
  afterEach(() => {
    fetchClinvarReleaseDate.cancel()
    jest.useRealTimers()
  })

  it('shares the leading result without launching an unobserved trailing refresh', async () => {
    const getMapping = jest.fn().mockResolvedValue(mapping('2026-09-01'))
    const client = { indices: { getMapping } }
    const first = fetchClinvarReleaseDate(client)
    await expect(first).resolves.toBe('2026-09-01')
    jest.advanceTimersByTime(1000)
    expect(fetchClinvarReleaseDate(client)).toBe(first)
    jest.advanceTimersByTime(300000)
    // No request owns a trailing invocation's promise. It must not run.
    expect(getMapping).toHaveBeenCalledTimes(2)

    getMapping.mockResolvedValue(mapping('2026-09-02'))
    await expect(fetchClinvarReleaseDate(client)).resolves.toBe('2026-09-02')
    expect(getMapping).toHaveBeenCalledTimes(4)
  })

  it('propagates refresh failures to the caller and permits a later refresh', async () => {
    const getMapping = jest.fn().mockResolvedValue(mapping('2026-09-01'))
    const client = { indices: { getMapping } }
    await fetchClinvarReleaseDate(client)
    jest.advanceTimersByTime(300001)
    const error = new Error('Elasticsearch unavailable')
    getMapping.mockRejectedValue(error)
    await expect(fetchClinvarReleaseDate(client)).rejects.toBe(error)
    jest.advanceTimersByTime(300001)
    getMapping.mockResolvedValue(mapping('2026-09-02'))
    await expect(fetchClinvarReleaseDate(client)).resolves.toBe('2026-09-02')
  })
})

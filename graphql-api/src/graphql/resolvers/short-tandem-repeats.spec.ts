import { describe, expect, test, jest } from '@jest/globals'

jest.mock('../../queries/short-tandem-repeat-queries', () => ({
  fetchShortTandemRepeatsByGene: jest.fn(),
  fetchShortTandemRepeatsByRegion: jest.fn(),
}))

// eslint-disable-next-line import/first
import {
  fetchShortTandemRepeatsByGene,
  fetchShortTandemRepeatsByRegion,
} from '../../queries/short-tandem-repeat-queries'
// eslint-disable-next-line import/first
import resolvers from './short-tandem-repeats'
// eslint-disable-next-line import/first
import { UserVisibleError } from '../../errors'

const mockFetchShortTandemRepeatsByGene = fetchShortTandemRepeatsByGene as jest.MockedFunction<
  (esClient: any, dataset: any, geneId: any) => Promise<any>
>
const mockFetchShortTandemRepeatsByRegion = fetchShortTandemRepeatsByRegion as jest.MockedFunction<
  (esClient: any, dataset: any, region: any) => Promise<any>
>

const resolveShortTandemRepeatsInGene = (resolvers as any).Gene.short_tandem_repeats
const resolveShortTandemRepeatsInRegion = (resolvers as any).Region.short_tandem_repeats

const gene = { gene_id: 'ENSG00000102081' }
const region = { chrom: '1', start: 1, stop: 100 }
const args = { dataset: 'gnomad_r4' }
const ctx = { esClient: {} }

describe('Gene.short_tandem_repeats', () => {
  test('resolves to the fetched short tandem repeats', async () => {
    const shortTandemRepeats = [{ id: 'FMR1' }]
    mockFetchShortTandemRepeatsByGene.mockResolvedValueOnce(shortTandemRepeats)

    expect(await resolveShortTandemRepeatsInGene(gene, args, ctx)).toBe(shortTandemRepeats)
  })

  test('resolves to null, instead of rejecting, when Elasticsearch fails', async () => {
    mockFetchShortTandemRepeatsByGene.mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 127.0.0.1:9200')
    )

    await expect(resolveShortTandemRepeatsInGene(gene, args, ctx)).resolves.toBeNull()
  })

  test('still rejects with a UserVisibleError, e.g. for an unsupported dataset', async () => {
    mockFetchShortTandemRepeatsByGene.mockRejectedValueOnce(
      new UserVisibleError('Tandem repeat data is not available for this dataset')
    )

    await expect(resolveShortTandemRepeatsInGene(gene, args, ctx)).rejects.toThrow(UserVisibleError)
  })
})

describe('Region.short_tandem_repeats', () => {
  test('resolves to the fetched short tandem repeats', async () => {
    const shortTandemRepeats = [{ id: 'FMR1' }]
    mockFetchShortTandemRepeatsByRegion.mockResolvedValueOnce(shortTandemRepeats)

    expect(await resolveShortTandemRepeatsInRegion(region, args, ctx)).toBe(shortTandemRepeats)
  })

  test('resolves to null, instead of rejecting, when Elasticsearch fails', async () => {
    mockFetchShortTandemRepeatsByRegion.mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 127.0.0.1:9200')
    )

    await expect(resolveShortTandemRepeatsInRegion(region, args, ctx)).resolves.toBeNull()
  })

  test('still rejects with a UserVisibleError, e.g. for an unsupported dataset', async () => {
    mockFetchShortTandemRepeatsByRegion.mockRejectedValueOnce(
      new UserVisibleError('Tandem repeat data is not available for this dataset')
    )

    await expect(resolveShortTandemRepeatsInRegion(region, args, ctx)).rejects.toThrow(
      UserVisibleError
    )
  })
})

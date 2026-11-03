import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { GeneStore, RegionGene } from '@gnomad/data-store'

import type { GraphQLContext } from '../../app'
import { fetchGenesByRegion } from '../../queries/gene-queries'
import resolvers from './region-fields'

jest.mock('../../queries/gene-queries', () => ({ fetchGenesByRegion: jest.fn() }))
jest.mock('../../queries/genomic-constraint-queries', () => ({
  fetchNccConstraintsByRegion: jest.fn(),
}))

const esClient = { search: jest.fn() } as unknown as GraphQLContext['esClient']

const region = (referenceGenome: string) => ({
  reference_genome: referenceGenome,
  chrom: '22',
  start: 37010956,
  stop: 37018807,
  xstart: 22037010956,
  xstop: 22037018807,
})

const nativeGene: RegionGene = {
  gene_id: 'ENSG00000128311',
  symbol: 'TST',
  start: 37010859,
  stop: 37020183,
  exons: [],
  transcripts: [],
}

const createContext = (geneStore: GeneStore | null): GraphQLContext => ({
  esClient,
  parquetDataStore:
    geneStore === null
      ? null
      : ({ geneModelsGrch38: geneStore } as unknown as GraphQLContext['parquetDataStore']),
  requestId: null,
})

const createGeneStore = () => ({
  fetchGeneById: jest.fn<GeneStore['fetchGeneById']>(),
  fetchGenesInRegion: jest.fn<GeneStore['fetchGenesInRegion']>().mockResolvedValue([nativeGene]),
})

beforeEach(() => {
  jest.resetAllMocks()
})

describe('Region.genes', () => {
  test('serves GRCh38 regions from the native gene store without Elasticsearch', async () => {
    const geneStore = createGeneStore()
    const genes = await resolvers.Region.genes(region('GRCh38'), {}, createContext(geneStore))

    expect(genes).toEqual([nativeGene])
    expect(geneStore.fetchGenesInRegion).toHaveBeenCalledWith('22', 37010956, 37018807)
    expect(fetchGenesByRegion).not.toHaveBeenCalled()
  })

  test('keeps GRCh37 regions on Elasticsearch', async () => {
    const geneStore = createGeneStore()
    const elasticsearchGenes = [{ gene_id: 'ENSG_ES' }]
    jest.mocked(fetchGenesByRegion).mockResolvedValue(elasticsearchGenes)
    const grch37Region = region('GRCh37')

    const genes = await resolvers.Region.genes(grch37Region, {}, createContext(geneStore))

    expect(genes).toBe(elasticsearchGenes)
    expect(fetchGenesByRegion).toHaveBeenCalledWith(esClient, grch37Region)
    expect(geneStore.fetchGenesInRegion).not.toHaveBeenCalled()
  })

  test('uses Elasticsearch when the native data store is disabled', async () => {
    const elasticsearchGenes = [{ gene_id: 'ENSG_ES' }]
    jest.mocked(fetchGenesByRegion).mockResolvedValue(elasticsearchGenes)
    const grch38Region = region('GRCh38')

    const genes = await resolvers.Region.genes(grch38Region, {}, createContext(null))

    expect(genes).toBe(elasticsearchGenes)
    expect(fetchGenesByRegion).toHaveBeenCalledWith(esClient, grch38Region)
  })

  test('rejects native failures instead of falling back to Elasticsearch', async () => {
    const geneStore = createGeneStore()
    geneStore.fetchGenesInRegion.mockRejectedValue(new Error('native failure'))

    await expect(
      resolvers.Region.genes(region('GRCh38'), {}, createContext(geneStore))
    ).rejects.toThrow('native failure')
    expect(fetchGenesByRegion).not.toHaveBeenCalled()
  })
})

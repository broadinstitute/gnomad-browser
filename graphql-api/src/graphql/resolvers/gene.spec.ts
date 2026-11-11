import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { ClinvarStore, Gene, GeneSearchResult, GeneStore } from '@gnomad/data-store'

import type { GraphQLContext } from '../context'
import { client as esClient } from '../../elasticsearch'
import { fetchGeneById, fetchGenesMatchingText } from '../../queries/gene-queries'
import { UserVisibleError } from '../../errors'

import resolvers from './gene'

jest.mock('../../elasticsearch', () => ({ client: {} }))
jest.mock('../../queries/gene-queries', () => ({
  fetchGeneById: jest.fn(),
  fetchGeneBySymbol: jest.fn(),
  fetchGenesMatchingText: jest.fn(),
}))

const GENE_ID = 'ENSG00000169174'

// Only the fields the resolver itself reads or adds matter here.
const nativeGene = { gene_id: GENE_ID, symbol: 'PCSK9' } as Gene

const nativeSearchResults: GeneSearchResult[] = [
  { ensembl_id: GENE_ID, ensembl_version: '11', symbol: 'PCSK9' },
]

const createNativeGeneStore = () => ({
  fetchGeneById: jest.fn<GeneStore['fetchGeneById']>().mockResolvedValue(nativeGene),
  searchGenes: jest.fn<GeneStore['searchGenes']>().mockReturnValue(nativeSearchResults),
})

const unusedClinvarStore = {} as ClinvarStore

const createContext = (geneStore: GeneStore | null): GraphQLContext => ({
  esClient,
  parquetDataStore:
    geneStore === null ? null : { clinvarGrch38: unusedClinvarStore, geneModelsGrch38: geneStore },
  requestId: null,
})

const resolveGeneById = (referenceGenome: string, context: GraphQLContext) =>
  resolvers.Query.gene({}, { gene_id: GENE_ID, reference_genome: referenceGenome }, context)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Query.gene by gene_id', () => {
  test('serves GRCh38 genes from the native store', async () => {
    const store = createNativeGeneStore()

    const gene = await resolveGeneById('GRCh38', createContext(store))

    expect(store.fetchGeneById).toHaveBeenCalledWith(GENE_ID)
    expect(fetchGeneById).not.toHaveBeenCalled()
    expect(gene).toEqual({
      ...nativeGene,
      heterozygous_variant_cooccurrence_counts: [],
      homozygous_variant_cooccurrence_counts: [],
    })
  })

  test('reports a GRCh38 gene missing from the native store as not found', async () => {
    const store = createNativeGeneStore()
    store.fetchGeneById.mockResolvedValueOnce(null)

    await expect(resolveGeneById('GRCh38', createContext(store))).rejects.toThrow(UserVisibleError)
    expect(fetchGeneById).not.toHaveBeenCalled()
  })

  test('keeps GRCh37 genes on Elasticsearch', async () => {
    const store = createNativeGeneStore()
    jest.mocked(fetchGeneById).mockResolvedValueOnce(nativeGene)

    await resolveGeneById('GRCh37', createContext(store))

    expect(store.fetchGeneById).not.toHaveBeenCalled()
    expect(fetchGeneById).toHaveBeenCalledWith(esClient, GENE_ID, 'GRCh37')
  })

  test('uses Elasticsearch when the native data store is disabled', async () => {
    jest.mocked(fetchGeneById).mockResolvedValueOnce(nativeGene)

    await resolveGeneById('GRCh38', createContext(null))

    expect(fetchGeneById).toHaveBeenCalledWith(esClient, GENE_ID, 'GRCh38')
  })

  test('rejects native failures instead of falling back to Elasticsearch', async () => {
    const store = createNativeGeneStore()
    store.fetchGeneById.mockRejectedValueOnce(new Error('native failure'))

    await expect(resolveGeneById('GRCh38', createContext(store))).rejects.toThrow('native failure')
    expect(fetchGeneById).not.toHaveBeenCalled()
  })
})

describe('Query.gene_search', () => {
  const searchGenes = (referenceGenome: string, context: GraphQLContext) =>
    resolvers.Query.gene_search({}, { query: 'pcsk', reference_genome: referenceGenome }, context)

  test('serves GRCh38 searches from the native store, limited to five results', async () => {
    const store = createNativeGeneStore()

    expect(await searchGenes('GRCh38', createContext(store))).toBe(nativeSearchResults)
    expect(store.searchGenes).toHaveBeenCalledWith('pcsk', 5)
    expect(fetchGenesMatchingText).not.toHaveBeenCalled()
  })

  test('keeps GRCh37 searches on Elasticsearch', async () => {
    const store = createNativeGeneStore()

    await searchGenes('GRCh37', createContext(store))

    expect(store.searchGenes).not.toHaveBeenCalled()
    expect(fetchGenesMatchingText).toHaveBeenCalledWith(esClient, 'pcsk', 'GRCh37')
  })

  test('uses Elasticsearch when the native data store is disabled', async () => {
    await searchGenes('GRCh38', createContext(null))

    expect(fetchGenesMatchingText).toHaveBeenCalledWith(esClient, 'pcsk', 'GRCh38')
  })
})

import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type {
  ClinvarStore,
  CoverageBucket,
  CoverageStore,
  GeneStore,
  GnomadV4Store,
} from '@gnomad/data-store'

import config from '../../config'
import logger from '../../logger'
import type { GraphQLContext } from '../context'

import resolvers from './coverage'

jest.mock('../../config', () => ({ PARQUET_ONLY: false }))
jest.mock('../../logger', () => ({ warn: jest.fn() }))
jest.mock('../../cache', () => ({
  withCache: <QueryFunction>(query: QueryFunction) => query,
}))

const gene = {
  gene_id: 'ENSG00000011295',
  reference_genome: 'GRCh38',
  chrom: '17',
  exons: [
    {
      feature_type: 'CDS',
      start: 15999784,
      stop: 16000032,
      xstart: 17015999784,
      xstop: 17016000032,
    },
    {
      feature_type: 'UTR',
      start: 15999824,
      stop: 15999848,
      xstart: 17015999824,
      xstop: 17015999848,
    },
    {
      feature_type: 'exon',
      start: 16001915,
      stop: 16002025,
      xstart: 17016001915,
      xstop: 17016002025,
    },
  ],
}

const createBucket = (bucketStart: number, overrides: Partial<CoverageBucket> = {}) => ({
  bucket_start: bucketStart,
  mean: 30.5,
  median: 31,
  over_1: 1,
  over_5: 0.991,
  over_10: 0.95,
  over_15: 0.9,
  over_20: 0.8,
  over_25: 0.7,
  over_30: 0.6,
  over_50: 0.001,
  over_100: 0,
  ...overrides,
})

const zeroBin = (pos: number) => ({
  pos,
  mean: 0,
  median: 0,
  over_1: 0,
  over_5: 0,
  over_10: 0,
  over_15: 0,
  over_20: 0,
  over_25: 0,
  over_30: 0,
  over_50: 0,
  over_100: 0,
})

const createCoverageStore = (bucketSize: number, buckets: CoverageBucket[]) => ({
  fetchCoverageInGene: jest
    .fn<CoverageStore['fetchCoverageInGene']>()
    .mockResolvedValue({ bucket_size: bucketSize, buckets }),
})

const emptyElasticsearchCoverage = { body: { aggregations: { coverage: { buckets: [] } } } }

const createEsClient = () => ({
  search: jest.fn<(request: any) => Promise<any>>().mockResolvedValue(emptyElasticsearchCoverage),
})

const createContext = (
  esClient: ReturnType<typeof createEsClient>,
  coverageStore: CoverageStore | null
): GraphQLContext => ({
  esClient: esClient as unknown as GraphQLContext['esClient'],
  parquetDataStore:
    coverageStore === null
      ? null
      : {
          clinvarGrch38: {} as ClinvarStore,
          geneModelsGrch38: {} as GeneStore,
          gnomadV4ExomeCoverage: coverageStore,
          gnomadVariantsV4: {} as GnomadV4Store,
        },
  requestId: null,
})

const resolveGeneCoverage = (dataset: string, context: GraphQLContext): Promise<any> =>
  resolvers.Gene.coverage(gene, { dataset }, context)

beforeEach(() => {
  jest.clearAllMocks()
  config.PARQUET_ONLY = false
})

describe('Gene.coverage with the Parquet data store', () => {
  test('reads gnomad_r4 exome coverage from Parquet over every exon, unpadded', async () => {
    const store = createCoverageStore(14, [createBucket(15999784)])

    await resolveGeneCoverage('gnomad_r4', createContext(createEsClient(), store))

    expect(store.fetchCoverageInGene).toHaveBeenCalledWith('ENSG00000011295', '17', [
      { start: 15999784, stop: 16000032 },
      { start: 15999824, stop: 15999848 },
      { start: 16001915, stop: 16002025 },
    ])
  })

  test('fills the empty buckets between Parquet buckets with zeros, as Elasticsearch did', async () => {
    const store = createCoverageStore(14, [createBucket(14), createBucket(56)])

    const coverage = await resolveGeneCoverage('gnomad_r4', createContext(createEsClient(), store))

    expect(coverage.exome.map((bin: { pos: number }) => bin.pos)).toEqual([14, 28, 42, 56])
    expect(coverage.exome[1]).toEqual(zeroBin(28))
    expect(coverage.exome[2]).toEqual(zeroBin(42))
  })

  test('shapes Parquet buckets like Elasticsearch buckets', async () => {
    const store = createCoverageStore(1, [
      createBucket(100),
      createBucket(101, { mean: null, median: null, over_1: null }),
    ])

    const coverage = await resolveGeneCoverage('gnomad_r4', createContext(createEsClient(), store))

    expect(coverage.exome).toEqual([
      {
        pos: 100,
        mean: 30.5,
        median: 31,
        over_1: 1,
        over_5: 1,
        over_10: 0.95,
        over_15: 0.9,
        over_20: 0.8,
        over_25: 0.7,
        over_30: 0.6,
        over_50: 0.01,
        over_100: 0,
      },
      expect.objectContaining({ pos: 101, mean: 0, median: 0, over_1: 0, over_5: 1 }),
    ])
  })

  test('returns no exome bins when Parquet has no coverage', async () => {
    const store = createCoverageStore(14, [])

    const coverage = await resolveGeneCoverage('gnomad_r4', createContext(createEsClient(), store))

    expect(coverage.exome).toEqual([])
  })

  test('reads gnomad_r4 genome coverage from Elasticsearch outside PARQUET_ONLY mode', async () => {
    const esClient = createEsClient()
    const store = createCoverageStore(14, [])

    await resolveGeneCoverage('gnomad_r4', createContext(esClient, store))

    expect(esClient.search).toHaveBeenCalledTimes(1)
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'gnomad_v3_genome_coverage' })
    )
    const [request] = esClient.search.mock.calls[0]
    expect(request.body.query.bool.filter[0]).toEqual({ term: { 'locus.contig': 'chr17' } })
  })

  test('stubs gnomad_r4 genome coverage and warns in PARQUET_ONLY mode', async () => {
    config.PARQUET_ONLY = true
    const esClient = createEsClient()
    const store = createCoverageStore(14, [createBucket(14)])

    const coverage = await resolveGeneCoverage('gnomad_r4', createContext(esClient, store))

    expect(coverage.genome).toEqual([])
    expect(esClient.search).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'parquetOnlyStub', field: 'GeneCoverage.genome' })
    )
  })

  test('returns no genome coverage for gnomad_cnv_r4, which has none, without a stub', async () => {
    config.PARQUET_ONLY = true
    const esClient = createEsClient()
    const store = createCoverageStore(14, [createBucket(14)])

    const coverage = await resolveGeneCoverage('gnomad_cnv_r4', createContext(esClient, store))

    expect(store.fetchCoverageInGene).toHaveBeenCalled()
    expect(coverage.genome).toEqual([])
    expect(esClient.search).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('reads datasets without Parquet coverage from Elasticsearch', async () => {
    const esClient = createEsClient()
    const store = createCoverageStore(14, [])

    await resolveGeneCoverage('gnomad_r3', createContext(esClient, store))

    expect(store.fetchCoverageInGene).not.toHaveBeenCalled()
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'gnomad_v3_genome_coverage' })
    )
  })
})

describe('Gene.coverage without the Parquet data store', () => {
  test('reads gnomad_r4 exome and genome coverage from Elasticsearch', async () => {
    const esClient = createEsClient()

    await resolveGeneCoverage('gnomad_r4', createContext(esClient, null))

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'gnomad_v4_exome_coverage' })
    )
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'gnomad_v3_genome_coverage' })
    )
  })
})

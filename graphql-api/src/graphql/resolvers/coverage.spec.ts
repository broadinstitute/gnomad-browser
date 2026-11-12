import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type {
  ClinvarStore,
  CoverageBucket,
  CoverageStore,
  GeneStore,
  GnomadV4Store,
} from '@gnomad/data-store'

import type { GraphQLContext } from '../context'

import resolvers from './coverage'

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

type TestCoverageStore = ReturnType<typeof createCoverageStore>

const emptyElasticsearchCoverage = { body: { aggregations: { coverage: { buckets: [] } } } }

const createEsClient = () => ({
  search: jest.fn<(request: any) => Promise<any>>().mockResolvedValue(emptyElasticsearchCoverage),
})

const createContext = (
  esClient: ReturnType<typeof createEsClient>,
  coverageStores: { exome: TestCoverageStore; genome: TestCoverageStore } | null
): GraphQLContext => ({
  esClient: esClient as unknown as GraphQLContext['esClient'],
  parquetDataStore:
    coverageStores === null
      ? null
      : {
          clinvarGrch38: {} as ClinvarStore,
          geneModelsGrch38: {} as GeneStore,
          gnomadV3GenomeCoverage: coverageStores.genome,
          gnomadV4ExomeCoverage: coverageStores.exome,
          gnomadVariantsV4: {} as GnomadV4Store,
        },
  requestId: null,
})

const resolveGeneCoverage = (
  dataset: string,
  context: GraphQLContext,
  geneObj: object = gene
): Promise<any> => resolvers.Gene.coverage(geneObj, { dataset }, context)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Gene.coverage with the Parquet data store', () => {
  test('reads gnomad_r4 exome and genome coverage from Parquet over every exon, unpadded', async () => {
    const esClient = createEsClient()
    const exome = createCoverageStore(14, [createBucket(14)])
    const genome = createCoverageStore(14, [createBucket(28)])

    const coverage = await resolveGeneCoverage(
      'gnomad_r4',
      createContext(esClient, { exome, genome })
    )

    const unpaddedExons = [
      { start: 15999784, stop: 16000032 },
      { start: 15999824, stop: 15999848 },
      { start: 16001915, stop: 16002025 },
    ]
    expect(exome.fetchCoverageInGene).toHaveBeenCalledWith('ENSG00000011295', '17', unpaddedExons)
    expect(genome.fetchCoverageInGene).toHaveBeenCalledWith('ENSG00000011295', '17', unpaddedExons)
    expect(coverage.exome.map((bin: { pos: number }) => bin.pos)).toEqual([14])
    expect(coverage.genome.map((bin: { pos: number }) => bin.pos)).toEqual([28])
    expect(esClient.search).not.toHaveBeenCalled()
  })

  test('fills the empty buckets between Parquet buckets with zeros, as Elasticsearch did', async () => {
    const exome = createCoverageStore(14, [createBucket(14), createBucket(56)])
    const genome = createCoverageStore(14, [])

    const coverage = await resolveGeneCoverage(
      'gnomad_r4',
      createContext(createEsClient(), { exome, genome })
    )

    expect(coverage.exome.map((bin: { pos: number }) => bin.pos)).toEqual([14, 28, 42, 56])
    expect(coverage.exome[1]).toEqual(zeroBin(28))
    expect(coverage.exome[2]).toEqual(zeroBin(42))
  })

  test('shapes Parquet buckets like Elasticsearch buckets', async () => {
    const exome = createCoverageStore(1, [
      createBucket(100),
      createBucket(101, { mean: null, median: null, over_1: null }),
    ])
    const genome = createCoverageStore(1, [])

    const coverage = await resolveGeneCoverage(
      'gnomad_r4',
      createContext(createEsClient(), { exome, genome })
    )

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

  test('returns no bins when Parquet has no coverage', async () => {
    const exome = createCoverageStore(14, [])
    const genome = createCoverageStore(14, [])

    const coverage = await resolveGeneCoverage(
      'gnomad_r4',
      createContext(createEsClient(), { exome, genome })
    )

    expect(coverage).toEqual({ exome: [], genome: [] })
  })

  test('reads only exome coverage for gnomad_cnv_r4', async () => {
    const exome = createCoverageStore(14, [createBucket(14)])
    const genome = createCoverageStore(14, [createBucket(14)])

    const coverage = await resolveGeneCoverage(
      'gnomad_cnv_r4',
      createContext(createEsClient(), { exome, genome })
    )

    expect(coverage.exome).toHaveLength(1)
    expect(coverage.genome).toEqual([])
    expect(genome.fetchCoverageInGene).not.toHaveBeenCalled()
  })

  test('reads only genome coverage for gnomad_r3', async () => {
    const exome = createCoverageStore(14, [createBucket(14)])
    const genome = createCoverageStore(14, [createBucket(14)])

    const coverage = await resolveGeneCoverage(
      'gnomad_r3',
      createContext(createEsClient(), { exome, genome })
    )

    expect(coverage.exome).toEqual([])
    expect(coverage.genome).toHaveLength(1)
    expect(exome.fetchCoverageInGene).not.toHaveBeenCalled()
  })

  test('reads datasets without Parquet coverage from Elasticsearch', async () => {
    const esClient = createEsClient()
    const exome = createCoverageStore(14, [])
    const genome = createCoverageStore(14, [])

    await resolveGeneCoverage('exac', createContext(esClient, { exome, genome }), {
      ...gene,
      reference_genome: 'GRCh37',
    })

    expect(exome.fetchCoverageInGene).not.toHaveBeenCalled()
    expect(genome.fetchCoverageInGene).not.toHaveBeenCalled()
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'exac_exome_coverage' })
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

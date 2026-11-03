import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type {
  ClinvarStore,
  GeneStore,
  GnomadV4Store,
  GnomadV4VariantListEntry,
} from '@gnomad/data-store'

import type { GraphQLContext } from '../../app'
import config from '../../config'
import { client as esClient } from '../../elasticsearch'
import { UserVisibleError } from '../../errors'
import resolvers from './variants'

jest.mock('../../config', () => ({ PARQUET_ONLY: true }))
jest.mock('../../cache', () => ({
  withCache: <QueryFunction>(query: QueryFunction) => query,
}))
jest.mock('../../elasticsearch', () => ({
  client: {
    search: jest.fn(),
    scroll: jest.fn(),
    clearScroll: jest.fn(),
    count: jest.fn(),
  },
}))

const emptySearchResponse = {
  body: { _scroll_id: 'test-scroll', hits: { total: { value: 0 }, hits: [] } },
}

const createSourceVariant = (): GnomadV4VariantListEntry => {
  const frequency = {
    ac: 2,
    ac_raw: 3,
    an: 100,
    homozygote_count: 0,
    hemizygote_count: 0,
    ancestry_groups: [
      { id: 'nfe', ac: 2, an: 80 },
      { id: 'XX', ac: 1, an: 40 },
      { id: 'nfe_XX', ac: 1, an: 30 },
    ],
  }
  return {
    variant_id: '22-100-A-G',
    locus: { contig: 'chr22', position: 100 },
    alleles: ['A', 'G'],
    rsids: ['rs123'],
    flags: ['source-flag'],
    exome: {
      freq: { all: frequency, non_ukb: { ...frequency, ac: 1 } },
      filters: [],
      flags: ['segdup', 'exome-flag'],
      fafmax: { gnomad: { faf95_max: 0.01 }, non_ukb: { faf95_max: 0.02 } },
    },
    genome: { freq: { all: frequency }, filters: [], flags: ['genome-flag'] },
    joint: { freq: { all: frequency }, fafmax: { faf95_max: 0.03 } },
    transcript_consequences: [
      { gene_id: 'ENSG002', transcript_id: 'ENST002', major_consequence: 'missense_variant' },
      {
        gene_id: 'ENSG001',
        transcript_id: 'ENST001',
        major_consequence: 'stop_gained',
        hgvsc: 'c.10A>G',
        lof: 'LC',
      },
      { gene_id: 'ENSG001', transcript_id: 'ENST003', major_consequence: 'stop_gained', lof: 'HC' },
    ],
    in_silico_predictors: { cadd: { phred: 10 }, spliceai_ds_max: 0 },
  }
}

const createSources = (): GnomadV4VariantListEntry[] => {
  const zero = createSourceVariant()
  zero.variant_id = '22-101-C-T'
  zero.locus.position = 101
  zero.alleles = ['C', 'T']
  zero.exome.freq = { all: { ac_raw: 0 }, non_ukb: { ac_raw: 0 } }
  zero.genome.freq = { all: {} }
  return [createSourceVariant(), zero]
}

const createNativeStore = () => ({
  fetchSingleVariant: jest.fn<GnomadV4Store['fetchSingleVariant']>(),
  fetchVariantsInRegion: jest.fn<GnomadV4Store['fetchVariantsInRegion']>(),
  fetchVariantsInGene: jest
    .fn<GnomadV4Store['fetchVariantsInGene']>()
    .mockResolvedValue(createSources()),
  fetchVariantsInTranscript: jest
    .fn<GnomadV4Store['fetchVariantsInTranscript']>()
    .mockResolvedValue(createSources()),
})

const createContext = (store: GnomadV4Store | null): GraphQLContext => {
  const parquetDataStore =
    store === null
      ? null
      : {
          clinvarGrch38: {
            fetchSingleVariant: jest.fn<ClinvarStore['fetchSingleVariant']>(),
            fetchVariantsInRegion: jest.fn<ClinvarStore['fetchVariantsInRegion']>(),
            fetchVariantsInGene: jest.fn<ClinvarStore['fetchVariantsInGene']>(),
            fetchVariantsInTranscript: jest.fn<ClinvarStore['fetchVariantsInTranscript']>(),
          },
          geneModelsGrch38: { fetchGeneById: jest.fn<GeneStore['fetchGeneById']>() },
          gnomadVariantsV4: store,
        }
  return { esClient, parquetDataStore, requestId: null }
}

const gene = {
  gene_id: 'ENSG001',
  chrom: '22',
  reference_genome: 'GRCh38',
  exons: [
    { feature_type: 'exon', start: 80, stop: 300, xstart: 22000000080, xstop: 22000000300 },
    { feature_type: 'UTR', start: 80, stop: 99, xstart: 22000000080, xstop: 22000000099 },
    { feature_type: 'CDS', start: 200, stop: 210, xstart: 22000000200, xstop: 22000000210 },
    { feature_type: 'CDS', start: 100, stop: 110, xstart: 22000000100, xstop: 22000000110 },
  ],
}
const transcript = { ...gene, transcript_id: 'ENST001', gene: { symbol: 'TST' } }

beforeEach(() => {
  jest.resetAllMocks()
  config.PARQUET_ONLY = true
  jest.mocked(esClient.search).mockResolvedValue(emptySearchResponse)
})

describe('Parquet v4 gene/transcript variants', () => {
  test.each([
    ['gnomad_r4', 'all', 2],
    ['gnomad_r4_non_ukb', 'non_ukb', 1],
  ])('routes %s gene queries through shared filtering and shaping', async (dataset, subset, ac) => {
    const store = createNativeStore()
    const result = await resolvers.Gene.variants(gene, { dataset }, createContext(store))

    expect(store.fetchVariantsInGene).toHaveBeenCalledWith(
      'ENSG001',
      '22',
      [
        { start: 200, stop: 210 },
        { start: 100, stop: 110 },
      ],
      subset
    )
    expect(store.fetchVariantsInTranscript).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      variant_id: '22-100-A-G',
      reference_genome: 'GRCh38',
      chrom: '22',
      pos: 100,
      ref: 'A',
      alt: 'G',
      flags: ['source-flag', 'segdup'],
      exome: {
        ac,
        filters: [],
        flags: ['exome-flag'],
        populations: [{ id: 'nfe', ac: 2, an: 80 }],
      },
      transcript_consequence: { transcript_id: 'ENST001', hgvsc: 'c.10A>G' },
      in_silico_predictors: [
        { id: 'cadd', value: '10.0', flags: [] },
        { id: 'spliceai_ds_max', value: '0.00', flags: [] },
      ],
    })
    expect(result[0].exome).not.toHaveProperty('freq')
    expect(result[0]).not.toHaveProperty('transcript_consequences')
    expect(result[0].lof_curation).toBeUndefined()
    expect(esClient.search).not.toHaveBeenCalled()
  })

  test.each(['gnomad_r4', 'gnomad_r4_non_ukb'])(
    'routes %s transcript queries with transcript-specific flags',
    async (dataset) => {
      const store = createNativeStore()
      const result = await resolvers.Transcript.variants(
        transcript,
        { dataset },
        createContext(store)
      )
      expect(store.fetchVariantsInTranscript).toHaveBeenCalledWith(
        'ENST001',
        '22',
        [
          { start: 200, stop: 210 },
          { start: 100, stop: 110 },
        ],
        dataset === 'gnomad_r4' ? 'all' : 'non_ukb'
      )
      expect(result).toHaveLength(1)
      expect(result[0].flags).toEqual(['source-flag', 'lc_lof', 'segdup'])
      expect(result[0].transcript_consequence.transcript_id).toBe('ENST001')
      expect(esClient.search).not.toHaveBeenCalled()
    }
  )

  test('passes exon features for a noncoding gene without padding them in Node', async () => {
    const store = createNativeStore()
    await resolvers.Gene.variants(
      { ...gene, exons: gene.exons.slice(0, 2) },
      { dataset: 'gnomad_r4' },
      createContext(store)
    )
    expect(store.fetchVariantsInGene).toHaveBeenCalledWith(
      'ENSG001',
      '22',
      [{ start: 80, stop: 300 }],
      'all'
    )
  })

  test('does not fall back to ES after a native reader error', async () => {
    const store = createNativeStore()
    const error = new UserVisibleError('Native reader failed')
    store.fetchVariantsInGene.mockRejectedValue(error)
    store.fetchVariantsInTranscript.mockRejectedValue(error)
    await expect(
      resolvers.Gene.variants(gene, { dataset: 'gnomad_r4' }, createContext(store))
    ).rejects.toBe(error)
    await expect(
      resolvers.Transcript.variants(transcript, { dataset: 'gnomad_r4' }, createContext(store))
    ).rejects.toBe(error)
    expect(esClient.search).not.toHaveBeenCalled()
  })

  test('validates dataset/reference-genome compatibility before calling native methods', () => {
    const store = createNativeStore()
    expect(() =>
      resolvers.Gene.variants(
        { ...gene, reference_genome: 'GRCh37' },
        { dataset: 'gnomad_r4' },
        createContext(store)
      )
    ).toThrow('not available on reference genome GRCh37')
    expect(store.fetchVariantsInGene).not.toHaveBeenCalled()
    expect(esClient.search).not.toHaveBeenCalled()
  })

  test('keeps other datasets and disabled native stores on the existing ES path', async () => {
    config.PARQUET_ONLY = false
    const store = createNativeStore()
    expect(
      await resolvers.Gene.variants(gene, { dataset: 'gnomad_r3' }, createContext(store))
    ).toEqual([])
    expect(
      await resolvers.Transcript.variants(transcript, { dataset: 'gnomad_r4' }, createContext(null))
    ).toEqual([])
    expect(store.fetchVariantsInGene).not.toHaveBeenCalled()
    expect(store.fetchVariantsInTranscript).not.toHaveBeenCalled()
    expect(esClient.search).toHaveBeenCalled()
  })

  test('retains ES LoF curation enrichment in hybrid mode', async () => {
    config.PARQUET_ONLY = false
    const store = createNativeStore()
    const curation = { gene_id: 'ENSG001', verdict: 'LoF', project: 'test', flags: null }
    jest.mocked(esClient.search).mockResolvedValueOnce({
      body: {
        hits: {
          hits: [{ _source: { value: { variant_id: '22-100-A-G', lof_curations: [curation] } } }],
        },
      },
    })
    const result = await resolvers.Gene.variants(
      gene,
      { dataset: 'gnomad_r4' },
      createContext(store)
    )
    expect(result[0].lof_curation).toEqual(curation)
    expect(esClient.search).toHaveBeenCalledTimes(1)
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'gnomad_v4_lof_curation_results' })
    )
  })

  test.each(['gnomad_r4', 'gnomad_r4_non_ukb'])(
    'matches ES-shaped results for %s with the same source records',
    async (dataset) => {
      const store = createNativeStore()
      const parquetGene = await resolvers.Gene.variants(gene, { dataset }, createContext(store))
      const parquetTranscript = await resolvers.Transcript.variants(
        transcript,
        { dataset },
        createContext(store)
      )
      expect(esClient.search).not.toHaveBeenCalled()
      config.PARQUET_ONLY = false
      const searchResponse = () => ({
        body: {
          _scroll_id: 'test-scroll',
          hits: {
            total: { value: 2 },
            hits: createSources().map((value) => ({ _source: { value } })),
          },
        },
      })
      jest.mocked(esClient.search).mockResolvedValueOnce(searchResponse())
      const esGene = await resolvers.Gene.variants(gene, { dataset }, createContext(null))
      jest.mocked(esClient.search).mockResolvedValueOnce(searchResponse())
      const esTranscript = await resolvers.Transcript.variants(
        transcript,
        { dataset },
        createContext(null)
      )
      expect(parquetGene).toEqual(esGene)
      expect(parquetTranscript).toEqual(esTranscript)
    }
  )
})

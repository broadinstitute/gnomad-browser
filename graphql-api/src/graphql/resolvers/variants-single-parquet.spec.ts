import path from 'path'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { loadFilesSync } from '@graphql-tools/load-files'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { graphql } from 'graphql'
import type { ClinvarStore, GeneStore, GnomadV4Store, GnomadV4Variant } from '@gnomad/data-store'

import type { GraphQLContext } from '../../app'
import config from '../../config'
import { client as esClient } from '../../elasticsearch'
import { UserVisibleError } from '../../errors'
import variantFieldResolvers from './variant-fields'
import resolvers from './variants'

jest.mock('../../config', () => ({ PARQUET_ONLY: true }))
jest.mock('../../cache', () => ({
  withCache: <QueryFunction>(query: QueryFunction) => query,
}))
jest.mock('../../elasticsearch', () => ({
  client: { search: jest.fn(), get: jest.fn() },
}))

const VARIANT_ID = '22-100-A-G'
const VRS_ID = 'ga4gh:VA.source'
const emptySearchResponse = { body: { hits: { total: { value: 0 }, hits: [] } } }
const constraint = { id: 'constraint' }

const createSourceVariant = (): GnomadV4Variant => {
  const frequency = {
    ac: 2,
    ac_raw: 3,
    an: 100,
    homozygote_count: 0,
    ancestry_groups: [
      { id: 'nfe', ac: 2, an: 80 },
      { id: 'XX', ac: 1, an: 40 },
    ],
  }
  const adjustedHistogram = { bin_edges: [0, 1], bin_freq: [2], n_smaller: 0, n_larger: 0 }
  const rawHistogram = { ...adjustedHistogram, bin_freq: [9] }
  const histograms = {
    alt_adj: adjustedHistogram,
    all_adj: adjustedHistogram,
    alt_raw: rawHistogram,
    all_raw: rawHistogram,
  }
  const qualityMetrics = {
    allele_balance: histograms,
    genotype_depth: histograms,
    genotype_quality: histograms,
    site_quality_metrics: [
      { metric: 'zero', value: 0 },
      { metric: 'missing' },
      { metric: 'nan', value: NaN },
      { metric: 'infinity', value: Infinity },
    ],
  }
  return {
    variant_id: VARIANT_ID,
    locus: { contig: 'chr22', position: 100 },
    alleles: ['A', 'G'],
    rsids: ['rs123'],
    exome: {
      freq: { all: frequency, non_ukb: { ...frequency, ac: 1, ac_raw: 2 } },
      filters: [],
      flags: ['segdup', 'exome-flag'],
      fafmax: { gnomad: {}, non_ukb: {} },
      faf95: { grpmax: 0.01, grpmax_gen_anc: 'nfe' },
      age_distribution: { het: adjustedHistogram },
      quality_metrics: qualityMetrics,
    },
    genome: {
      freq: {
        all: { ...frequency, ac: 4, ac_raw: 5 },
        hgdp: { ac_raw: 2, ancestry_groups: [{ id: 'afr', ac: 1, an: 20 }] },
        tgp: { ac_raw: 2, ancestry_groups: [{ id: 'amr', ac: 1, an: 30 }] },
      },
      filters: [],
      flags: ['genome-flag'],
      fafmax: {},
      faf95: { grpmax: 0.02, grpmax_gen_anc: 'afr' },
      quality_metrics: qualityMetrics,
    },
    joint: {
      freq: { all: { ...frequency, ac: 6, ac_raw: 7 } },
      flags: ['joint-flag'],
      fafmax: { faf95_max: 0.03, faf95_max_gen_anc: 'nfe' },
      freq_comparison_stats: { contingency_table_test: [{ p_value: 0.5, odds_ratio: 2 }] },
    },
    transcript_consequences: [
      { gene_id: 'ENSG002', transcript_id: 'ENST002', is_canonical: false },
      { gene_id: 'ENSG001', transcript_id: 'ENST001', is_canonical: true },
      { gene_id: 'source-refseq', transcript_id: 'NM_001' },
      { transcript_id: 'missing-gene' },
    ],
    in_silico_predictors: { cadd: { phred: 10 }, spliceai_ds_max: 0 },
    colocated_variants: { all: ['22-100-A-T'], non_ukb: ['22-100-A-C'] },
    coverage: { exome: { mean: 25.5, total_DP: 1000 }, genome: { mean: 30 } },
    caid: 'CA123',
    vrs: {
      ref: { allele_id: 'ga4gh:VA.ref', state: 'A' },
      alt: { allele_id: VRS_ID, state: 'G', start: 99, end: 100, repeat_subunit_length: 3 },
    },
  }
}

const createNativeStore = () => ({
  fetchSingleVariant: jest
    .fn<GnomadV4Store['fetchSingleVariant']>()
    .mockResolvedValue(createSourceVariant()),
  fetchVariantsInRegion: jest.fn<GnomadV4Store['fetchVariantsInRegion']>(),
  fetchVariantsInGene: jest.fn<GnomadV4Store['fetchVariantsInGene']>(),
  fetchVariantsInTranscript: jest.fn<GnomadV4Store['fetchVariantsInTranscript']>(),
})

const createContext = (store: GnomadV4Store | null): GraphQLContext => ({
  esClient,
  requestId: null,
  parquetDataStore:
    store === null
      ? null
      : {
          gnomadVariantsV4: store,
          clinvarGrch38: {
            fetchSingleVariant: jest.fn<ClinvarStore['fetchSingleVariant']>(),
            fetchVariantsInGene: jest.fn<ClinvarStore['fetchVariantsInGene']>(),
            fetchVariantsInTranscript: jest.fn<ClinvarStore['fetchVariantsInTranscript']>(),
            fetchVariantsInRegion: jest.fn<ClinvarStore['fetchVariantsInRegion']>(),
          },
          geneModelsGrch38: {
            fetchGeneById: jest.fn<GeneStore['fetchGeneById']>(),
            fetchGenesInRegion: jest.fn<GeneStore['fetchGenesInRegion']>(),
          },
        },
})

const mockEsVariant = (variant = createSourceVariant()) => {
  jest.mocked(esClient.search).mockResolvedValueOnce({
    body: { hits: { total: { value: 1 }, hits: [{ _source: { value: variant } }] } },
  })
}

beforeEach(() => {
  jest.resetAllMocks()
  config.PARQUET_ONLY = true
  jest.mocked(esClient.search).mockResolvedValue(emptySearchResponse)
  jest.mocked(esClient.get).mockResolvedValue({ body: { _source: constraint } })
})

describe('Parquet v4 single variants', () => {
  test.each([
    ['gnomad_r4', 2, ['22-100-A-T']],
    ['gnomad_r4_non_ukb', 1, ['22-100-A-C']],
  ])('shapes %s through the native store without ES calls', async (dataset, ac, colocated) => {
    const store = createNativeStore()
    const result = await resolvers.Query.variant(
      null,
      { dataset, variantId: VARIANT_ID },
      createContext(store)
    )

    expect(store.fetchSingleVariant).toHaveBeenCalledWith(VARIANT_ID)
    expect(result).toMatchObject({
      variant_id: VARIANT_ID,
      reference_genome: 'GRCh38',
      chrom: '22',
      pos: 100,
      ref: 'A',
      alt: 'G',
      colocated_variants: colocated,
      flags: ['segdup'],
      exome: {
        ac,
        ac_raw: dataset === 'gnomad_r4' ? 3 : 2,
        flags: ['exome-flag'],
        filters: [],
        faf95: { popmax: 0.01, popmax_population: 'nfe' },
        age_distribution: { het: { bin_freq: [2] } },
        quality_metrics: {
          allele_balance: { alt: { bin_freq: [2] } },
          genotype_depth: { all: { bin_freq: [2] }, alt: { bin_freq: [2] } },
          genotype_quality: { all: { bin_freq: [2] }, alt: { bin_freq: [2] } },
          site_quality_metrics: [{ metric: 'zero', value: 0 }],
        },
      },
      genome: {
        ac: 4,
        flags: ['genome-flag'],
        local_ancestry_populations: null,
        populations: [
          { id: 'nfe', ac: 2, an: 80 },
          { id: 'XX', ac: 1, an: 40 },
          { id: 'hgdp:afr', ac: 1, an: 20 },
          { id: '1kg:amr', ac: 1, an: 30 },
        ],
      },
      coverage: { exome: { mean: 25.5, total_DP: 1000 } },
      caid: 'CA123',
      vrs: { alt: { repeat_subunit_length: 3 } },
      in_silico_predictors: [
        { id: 'cadd', value: '10.0', flags: [] },
        { id: 'spliceai_ds_max', value: '0.00', flags: [] },
      ],
      lof_curations: null,
      non_coding_constraint: null,
    })
    expect(
      result.transcript_consequences.map(
        (consequence: { transcript_id?: string }) => consequence.transcript_id
      )
    ).toEqual(['ENST002', 'ENST001'])
    if (dataset === 'gnomad_r4') {
      expect(result.joint).toMatchObject({
        ac: 6,
        filters: ['joint-flag'],
        faf95: { popmax: 0.03 },
      })
    } else {
      expect(result.joint).toBeNull()
    }
    expect(esClient.search).not.toHaveBeenCalled()
    expect(esClient.get).not.toHaveBeenCalled()
  })

  test.each([
    [{ variantId: 'chr22-100-a-g' }, VARIANT_ID],
    [{ rsid: 'rs123' }, 'rs123'],
    [{ vrsId: 'VA.source' }, VRS_ID],
    [{ vrsId: VRS_ID }, VRS_ID],
  ])('normalizes identifiers before calling the native store: %j', async (identifier, expected) => {
    const store = createNativeStore()
    await resolvers.Query.variant(
      null,
      { dataset: 'gnomad_r4', ...identifier },
      createContext(store)
    )
    expect(store.fetchSingleVariant).toHaveBeenCalledWith(expected)
    expect(esClient.search).not.toHaveBeenCalled()
  })

  test.each([
    [{}, 'Exactly one'],
    [{ variantId: VARIANT_ID, rsid: 'rs123' }, 'Exactly one'],
    [{ variantId: 'not-a-variant' }, 'Invalid variant ID'],
    [{ rsid: 'not-an-rsid' }, 'Invalid rsID'],
    [{ rsid: 'RS123' }, 'Invalid rsID'],
  ])('rejects invalid arguments before querying: %j', async (identifier, message) => {
    const store = createNativeStore()
    await expect(
      resolvers.Query.variant(null, { dataset: 'gnomad_r4', ...identifier }, createContext(store))
    ).rejects.toThrow(message)
    expect(store.fetchSingleVariant).not.toHaveBeenCalled()
    expect(esClient.search).not.toHaveBeenCalled()
  })

  test('reports missing native records without falling back to ES', async () => {
    const store = createNativeStore()
    store.fetchSingleVariant.mockResolvedValue(null)
    await expect(
      resolvers.Query.variant(
        null,
        { dataset: 'gnomad_r4', variantId: VARIANT_ID },
        createContext(store)
      )
    ).rejects.toThrow(new UserVisibleError('Variant not found'))
    expect(esClient.search).not.toHaveBeenCalled()
    expect(esClient.get).not.toHaveBeenCalled()
  })

  test('preserves the user-visible ambiguity message for native duplicate IDs', async () => {
    const store = createNativeStore()
    store.fetchSingleVariant.mockRejectedValue(
      new Error('Execution error: Multiple gnomAD v4 records found for variant ID: rs123')
    )
    await expect(
      resolvers.Query.variant(null, { dataset: 'gnomad_r4', rsid: 'rs123' }, createContext(store))
    ).rejects.toThrow(
      new UserVisibleError('Multiple variants found, query using variant ID to select one.')
    )
    expect(esClient.search).not.toHaveBeenCalled()
  })

  test('propagates unexpected native errors without falling back to ES', async () => {
    const store = createNativeStore()
    const error = new Error('Failed to decode source record')
    store.fetchSingleVariant.mockRejectedValue(error)
    await expect(
      resolvers.Query.variant(
        null,
        { dataset: 'gnomad_r4', variantId: VARIANT_ID },
        createContext(store)
      )
    ).rejects.toBe(error)
    expect(esClient.search).not.toHaveBeenCalled()
  })

  test('rejects variants absent from the selected subset before enrichment', async () => {
    const store = createNativeStore()
    const source = createSourceVariant()
    source.exome.freq.non_ukb = { ac_raw: 0 }
    source.genome.freq.all = {}
    store.fetchSingleVariant.mockResolvedValue(source)
    await expect(
      resolvers.Query.variant(
        null,
        { dataset: 'gnomad_r4_non_ukb', variantId: VARIANT_ID },
        createContext(store)
      )
    ).rejects.toThrow(new UserVisibleError('Variant not found in selected subset.'))
    expect(esClient.search).not.toHaveBeenCalled()
  })

  test('keeps genome-only records when the selected exome frequency is missing', async () => {
    const store = createNativeStore()
    const source = createSourceVariant()
    source.exome.freq.non_ukb = undefined
    store.fetchSingleVariant.mockResolvedValue(source)
    const result = await resolvers.Query.variant(
      null,
      { dataset: 'gnomad_r4_non_ukb', variantId: VARIANT_ID },
      createContext(store)
    )
    expect(result.exome).toBeNull()
    expect(result.genome.ac).toBe(4)
    expect(result.joint).toBeNull()
  })

  test('handles missing optional annotations without removing an exome-only record', async () => {
    const store = createNativeStore()
    const source = createSourceVariant()
    source.genome.freq = {}
    source.exome.quality_metrics = undefined
    source.exome.age_distribution = undefined
    source.transcript_consequences = undefined
    source.vrs = undefined
    store.fetchSingleVariant.mockResolvedValue(source)
    const result = await resolvers.Query.variant(
      null,
      { dataset: 'gnomad_r4', variantId: VARIANT_ID },
      createContext(store)
    )
    expect(result.exome.ac).toBe(2)
    expect(result.exome.quality_metrics.site_quality_metrics).toEqual([])
    expect(result.genome).toBeNull()
    expect(result.transcript_consequences).toEqual([])
    expect(result.vrs).toBeUndefined()
  })

  test('adds AC0 once without modifying native source filters', async () => {
    const store = createNativeStore()
    const source = createSourceVariant()
    source.exome.freq.all = { ac: 0, ac_raw: 2 }
    source.genome.freq.all = { ac: 0, ac_raw: 2 }
    source.genome.filters = ['AC0']
    store.fetchSingleVariant.mockResolvedValue(source)
    const result = await resolvers.Query.variant(
      null,
      { dataset: 'gnomad_r4', variantId: VARIANT_ID },
      createContext(store)
    )
    expect(result.exome.filters).toEqual(['AC0'])
    expect(result.genome.filters).toEqual(['AC0'])
    expect(source.exome.filters).toEqual([])
  })

  test('retains all separate ES enrichments in hybrid mode', async () => {
    config.PARQUET_ONLY = false
    const store = createNativeStore()
    const curation = { gene_id: 'ENSG001', verdict: 'LoF' }
    const localAncestry = [{ id: 'afr', ac: 1, an: 2 }]
    jest
      .mocked(esClient.search)
      .mockResolvedValueOnce({
        body: {
          hits: {
            total: { value: 1 },
            hits: [{ _source: { value: { lof_curations: [curation] } } }],
          },
        },
      })
      .mockResolvedValueOnce({
        body: {
          hits: {
            total: { value: 1 },
            hits: [{ _source: { value: { populations: { genome: localAncestry } } } }],
          },
        },
      })
    const result = await resolvers.Query.variant(
      null,
      { dataset: 'gnomad_r4', variantId: VARIANT_ID },
      createContext(store)
    )
    expect(result.lof_curations).toEqual([curation])
    expect(result.genome.local_ancestry_populations).toEqual(localAncestry)
    expect(result.non_coding_constraint).toEqual(constraint)
    expect(esClient.search).toHaveBeenCalledTimes(2)
    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ index: 'gnomad_v4_lof_curation_results' })
    )
    expect(esClient.search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ index: 'gnomad_v3_local_ancestry' })
    )
    expect(esClient.get).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'gnomad_v3_genomic_constraint_regions', id: 'chr22-0-1000' })
    )
  })

  test.each(['gnomad_r4', 'gnomad_r4_non_ukb'])(
    'matches ES-shaped results for %s with identical source records',
    async (dataset) => {
      config.PARQUET_ONLY = false
      const store = createNativeStore()
      const parquet = await resolvers.Query.variant(
        null,
        { dataset, variantId: VARIANT_ID },
        createContext(store)
      )
      mockEsVariant()
      const elasticsearch = await resolvers.Query.variant(
        null,
        { dataset, variantId: VARIANT_ID },
        createContext(null)
      )
      expect(parquet).toEqual(elasticsearch)
    }
  )

  test.each([
    [{ variantId: VARIANT_ID }, 'variant_id', VARIANT_ID],
    [{ rsid: 'rs123' }, 'rsids', 'rs123'],
    [{ vrsId: VRS_ID }, 'allele_id', VRS_ID],
  ])(
    'keeps the production ES source query and enrichments when native is disabled: %j',
    async (identifier, field, value) => {
      config.PARQUET_ONLY = false
      const source = {
        ...createSourceVariant(),
        flags: ['legacy-flag'],
        multi_nucleotide_variants: [],
      }
      mockEsVariant(source)
      const result = await resolvers.Query.variant(
        null,
        { dataset: 'gnomad_r4', ...identifier },
        createContext(null)
      )
      expect(esClient.search).toHaveBeenNthCalledWith(1, {
        index: 'gnomad_v4_variants',
        body: { query: { bool: { filter: { term: { [field]: value } } } } },
        size: 1,
      })
      expect(esClient.search).toHaveBeenCalledTimes(3)
      expect(esClient.get).toHaveBeenCalledTimes(1)
      expect(result.flags).toEqual(['legacy-flag', 'segdup'])
      expect(result.multi_nucleotide_variants).toEqual([])
      expect(result.exome.quality_metrics.site_quality_metrics).toEqual([
        { metric: 'zero', value: 0 },
      ])
    }
  )

  test.each([0, 2])('preserves ES missing/ambiguous-result errors for %s hits', async (count) => {
    config.PARQUET_ONLY = false
    jest
      .mocked(esClient.search)
      .mockResolvedValueOnce({ body: { hits: { total: { value: count }, hits: [] } } })
    const message =
      count === 0
        ? 'Variant not found'
        : 'Multiple variants found, query using variant ID to select one.'
    await expect(
      resolvers.Query.variant(
        null,
        { dataset: 'gnomad_r4', variantId: VARIANT_ID },
        createContext(null)
      )
    ).rejects.toThrow(new UserVisibleError(message))
    expect(esClient.search).toHaveBeenCalledTimes(1)
    expect(esClient.get).not.toHaveBeenCalled()
  })

  test.each(['gnomad_r3', 'gnomad_r2_1', 'exac'])(
    'leaves %s on ES even when a native v4 store exists',
    async (dataset) => {
      config.PARQUET_ONLY = false
      const store = createNativeStore()
      await expect(
        resolvers.Query.variant(null, { dataset, variantId: VARIANT_ID }, createContext(store))
      ).rejects.toThrow('Variant not found')
      expect(store.fetchSingleVariant).not.toHaveBeenCalled()
      expect(esClient.search).toHaveBeenCalledTimes(1)
    }
  )

  test('executes the variant query against the GraphQL types with VRS field resolution', async () => {
    const schema = makeExecutableSchema({
      typeDefs: [
        ...loadFilesSync(path.join(__dirname, '../types')),
        'directive @cost(value: Int!, multipliers: [String!]) on FIELD_DEFINITION',
      ],
      resolvers: { ...resolvers, ...variantFieldResolvers },
    })
    const store = createNativeStore()
    const result = await graphql({
      schema,
      source: `{
        variant(dataset: gnomad_r4, variantId: "22-100-A-G") {
          variant_id chrom pos ref alt
          exome { ac quality_metrics { allele_balance { alt { bin_freq } } } }
          joint { freq_comparison_stats { contingency_table_test { odds_ratio } } }
          coverage { exome { mean } }
          vrs { repeat_subunit_length }
          lof_curations { gene_id }
          non_coding_constraint { start }
        }
      }`,
      contextValue: createContext(store),
    })
    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      variant: {
        variant_id: VARIANT_ID,
        chrom: '22',
        pos: 100,
        ref: 'A',
        alt: 'G',
        exome: { ac: 2, quality_metrics: { allele_balance: { alt: { bin_freq: [2] } } } },
        joint: { freq_comparison_stats: { contingency_table_test: [{ odds_ratio: '2' }] } },
        coverage: { exome: { mean: 25.5 } },
        vrs: { repeat_subunit_length: 3 },
        lof_curations: null,
        non_coding_constraint: null,
      },
    })
    expect(esClient.search).not.toHaveBeenCalled()
    expect(esClient.get).not.toHaveBeenCalled()
  })
})

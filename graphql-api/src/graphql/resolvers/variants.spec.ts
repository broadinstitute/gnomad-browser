import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { ClinvarStore, CoverageStore, GeneStore, GnomadV4Store } from '@gnomad/data-store'

import config from '../../config'
import logger from '../../logger'
import { fetchLofCurationResultsByGene } from '../../queries/lof-curation-result-queries'
import { fetchVariantsByGene } from '../../queries/variant-queries'
import type { GraphQLContext } from '../context'
import resolvers from './variants'

jest.mock('../../cache', () => ({
  withCache: <QueryFunction>(query: QueryFunction) => query,
}))

jest.mock('../../queries/clinvar-variant-queries', () => ({
  fetchClinvarVariantByClinvarVariationId: jest.fn(),
}))

jest.mock('../../config', () => ({ PARQUET_ONLY: false }))

jest.mock('../../logger', () => ({ warn: jest.fn() }))

jest.mock('../../queries/lof-curation-result-queries', () => ({
  fetchLofCurationResultsByGene: jest.fn(),
}))

jest.mock('../../queries/variant-queries', () => ({
  ...jest.requireActual<object>('../../queries/variant-queries'),
  fetchVariantsByGene: jest.fn(),
}))

describe('Region.variants', () => {
  test.each([
    ['v3', 'gnomad_r3'],
    ['v4', 'gnomad_r4'],
  ])('rejects a %s region with too many variants before searching', async (_version, dataset) => {
    const count = jest.fn((_request: unknown) => Promise.resolve({ body: { count: 30001 } }))
    const search = jest.fn()
    const scroll = jest.fn()
    const region = {
      chrom: '19',
      start: 10889851,
      stop: 11333431,
      reference_genome: 'GRCh38',
    }

    await expect(
      resolvers.Region.variants(region, { dataset }, { esClient: { count, search, scroll } })
    ).rejects.toThrow(
      'This region has too many variants to display. Select a smaller region to view variants.'
    )

    expect(count).toHaveBeenCalledTimes(1)
    expect(count.mock.calls[0][0]).toHaveProperty(
      ['body', 'query', 'bool', 'filter', '0', 'term', 'locus.contig'],
      'chr19'
    )
    expect(search).not.toHaveBeenCalled()
    expect(scroll).not.toHaveBeenCalled()
  })
})

describe('Gene.variants', () => {
  const gene = {
    gene_id: 'ENSG00000011295',
    chrom: '17',
    reference_genome: 'GRCh38',
    exons: [
      { feature_type: 'UTR', start: 15999700, stop: 15999783 },
      { feature_type: 'CDS', start: 15999784, stop: 16000032 },
      { feature_type: 'exon', start: 15999700, stop: 16000032 },
      { feature_type: 'CDS', start: 16000118, stop: 16000382 },
    ],
  }

  const createFrequency = (acRaw: number) => ({
    ac: acRaw,
    ac_raw: acRaw,
    an: 1000,
    hemizygote_count: 0,
    homozygote_count: 0,
    ancestry_groups: [
      { id: 'afr', ac: acRaw, an: 500, hemizygote_count: 0, homozygote_count: 0 },
      { id: 'afr_XX', ac: acRaw, an: 250, hemizygote_count: 0, homozygote_count: 0 },
      { id: 'XY', ac: 0, an: 500, hemizygote_count: 0, homozygote_count: 0 },
    ],
  })

  const noFilteringAlleleFrequency = {
    faf95_max: null,
    faf95_max_gen_anc: null,
    faf99_max: null,
    faf99_max_gen_anc: null,
  }

  // A Record rather than a precise type, so a test can swap the exome subset key.
  const createSourceVariant = (position: number, acRaw: number): Record<string, any> => ({
    variant_id: `17-${position}-G-A`,
    locus: { contig: 'chr17', position },
    alleles: ['G', 'A'],
    rsids: null,
    flags: null,
    exome: {
      freq: { all: createFrequency(acRaw) },
      filters: [],
      flags: [],
      fafmax: { gnomad: noFilteringAlleleFrequency, non_ukb: noFilteringAlleleFrequency },
    },
    genome: {
      freq: { all: { ...createFrequency(0), ac_raw: null, ac: null } },
      filters: null,
      flags: null,
    },
    joint: {
      freq: { all: createFrequency(acRaw) },
      filters: null,
      fafmax: noFilteringAlleleFrequency,
    },
    transcript_consequences: [
      {
        gene_id: 'ENSG00000011295',
        gene_version: '16',
        gene_symbol: 'TTC19',
        transcript_id: 'ENST00000261647',
        transcript_version: '10',
        biotype: 'protein_coding',
        consequence_terms: ['missense_variant'],
        major_consequence: 'missense_variant',
        hgvsc: 'c.1G>A',
        hgvsp: 'p.Met1Ile',
        is_canonical: true,
        is_mane_select: true,
        is_mane_select_version: true,
        refseq_id: 'NM_017775',
        refseq_version: '4',
        domains: null,
        lof: null,
        lof_filter: null,
        lof_flags: null,
      },
    ],
    in_silico_predictors: {
      cadd: { phred: 12.5, raw_score: 1.25 },
      revel_max: null,
      spliceai_ds_max: null,
      pangolin_largest_ds: null,
      phylop: null,
      sift_max: null,
      polyphen_max: null,
    },
  })

  const createNativeStore = (variants: Record<string, any>[]) => ({
    fetchVariantsInGeneJson: jest
      .fn<GnomadV4Store['fetchVariantsInGeneJson']>()
      .mockResolvedValue(JSON.stringify(variants)),
    fetchVariantsInTranscriptJson: jest.fn<GnomadV4Store['fetchVariantsInTranscriptJson']>(),
  })

  const createContext = (store: GnomadV4Store | null): GraphQLContext => ({
    esClient: {} as GraphQLContext['esClient'],
    parquetDataStore:
      store === null
        ? null
        : {
            clinvarGrch38: {} as ClinvarStore,
            geneModelsGrch38: {} as GeneStore,
            gnomadV3GenomeCoverage: {} as CoverageStore,
            gnomadV4ExomeCoverage: {} as CoverageStore,
            gnomadVariantsV4: store,
          },
    requestId: null,
  })

  const resolveGeneVariants = (dataset: string, context: GraphQLContext, geneObj: object = gene) =>
    resolvers.Gene.variants(geneObj, { dataset }, context)

  beforeEach(() => {
    jest.clearAllMocks()
    config.PARQUET_ONLY = false
    jest.mocked(fetchLofCurationResultsByGene).mockResolvedValue([])
  })

  test('reads gnomad_r4 gene variants from Parquet with unpadded CDS intervals', async () => {
    const store = createNativeStore([createSourceVariant(15999800, 3)])

    const variants = await resolveGeneVariants('gnomad_r4', createContext(store))

    expect(store.fetchVariantsInGeneJson).toHaveBeenCalledWith(
      'ENSG00000011295',
      '17',
      [
        { start: 15999784, stop: 16000032 },
        { start: 16000118, stop: 16000382 },
      ],
      'all'
    )
    expect(fetchVariantsByGene).not.toHaveBeenCalled()
    expect(variants).toHaveLength(1)
    expect(variants[0]).toMatchObject({
      variant_id: '17-15999800-G-A',
      reference_genome: 'GRCh38',
      chrom: '17',
      pos: 15999800,
      ref: 'G',
      alt: 'A',
      genome: null,
      transcript_consequence: { transcript_id: 'ENST00000261647' },
    })
    expect(variants[0].exome.populations.map((population: any) => population.id)).toEqual(['afr'])
  })

  test('asks for the non_ukb exome subset for gnomad_r4_non_ukb', async () => {
    const sourceVariant = createSourceVariant(15999800, 3)
    sourceVariant.exome.freq = { non_ukb: createFrequency(2) }
    const store = createNativeStore([sourceVariant])

    const variants = await resolveGeneVariants('gnomad_r4_non_ukb', createContext(store))

    expect(store.fetchVariantsInGeneJson).toHaveBeenCalledWith(
      'ENSG00000011295',
      '17',
      expect.any(Array),
      'non_ukb'
    )
    expect(variants[0].exome.ac_raw).toBe(2)
  })

  test('drops variants without raw allele counts in the subset', async () => {
    const store = createNativeStore([
      createSourceVariant(15999800, 0),
      createSourceVariant(15999801, 1),
    ])

    const variants = await resolveGeneVariants('gnomad_r4', createContext(store))

    expect(variants.map((variant: any) => variant.variant_id)).toEqual(['17-15999801-G-A'])
  })

  test('joins LoF curations from Elasticsearch outside PARQUET_ONLY mode', async () => {
    const store = createNativeStore([createSourceVariant(15999800, 3)])
    const curation = { gene_id: 'ENSG00000011295', verdict: 'LoF', flags: [] }
    jest
      .mocked(fetchLofCurationResultsByGene)
      .mockResolvedValue([{ variant_id: '17-15999800-G-A', lof_curations: [curation] }] as any)

    const variants = await resolveGeneVariants('gnomad_r4', createContext(store))

    expect(variants[0].lof_curation).toBe(curation)
  })

  test('stubs LoF curations in PARQUET_ONLY mode without calling Elasticsearch', async () => {
    config.PARQUET_ONLY = true
    const store = createNativeStore([createSourceVariant(15999800, 3)])

    const variants = await resolveGeneVariants('gnomad_r4', createContext(store))

    expect(fetchLofCurationResultsByGene).not.toHaveBeenCalled()
    expect(variants[0].lof_curation).toBeNull()
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'parquetOnlyStub', field: 'Variant.lof_curation' })
    )
  })

  test('rejects a GRCh37 gene before reading Parquet', () => {
    const store = createNativeStore([])
    const grch37Gene = { ...gene, reference_genome: 'GRCh37' }

    expect(() => resolveGeneVariants('gnomad_r4', createContext(store), grch37Gene)).toThrow(
      'not available on reference genome GRCh37'
    )
    expect(store.fetchVariantsInGeneJson).not.toHaveBeenCalled()
  })

  test('uses Elasticsearch for datasets other than gnomAD v4', async () => {
    const store = createNativeStore([])

    await resolveGeneVariants('gnomad_r3', createContext(store))

    expect(fetchVariantsByGene).toHaveBeenCalledWith(expect.anything(), 'gnomad_r3', gene)
    expect(store.fetchVariantsInGeneJson).not.toHaveBeenCalled()
  })

  test('uses Elasticsearch when the native data store is disabled', async () => {
    await resolveGeneVariants('gnomad_r4', createContext(null))

    expect(fetchVariantsByGene).toHaveBeenCalledWith(expect.anything(), 'gnomad_r4', gene)
  })
})

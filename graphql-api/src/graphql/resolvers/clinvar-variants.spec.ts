import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type {
  ClinvarStore,
  ClinvarVariant,
  ClinvarVariantListEntry,
  GeneStore,
} from '@gnomad/data-store'

import type { GraphQLContext } from '../context'
import config from '../../config'
import { client as esClient } from '../../elasticsearch'
import logger from '../../logger'
import { PARQUET_ONLY_STUBS } from '../../parquet-only-stubs'
import {
  countClinvarVariantsInRegion,
  fetchClinvarReleaseDate,
  fetchClinvarVariantById,
  fetchClinvarVariantsByGene,
  fetchClinvarVariantsByRegion,
  fetchClinvarVariantsByTranscript,
} from '../../queries/clinvar-variant-queries'
import { UserVisibleError } from '../../errors'

import resolvers from './clinvar-variants'

jest.mock('../../config', () => ({ PARQUET_ONLY: false }))
jest.mock('../../elasticsearch', () => ({ client: {} }))
jest.mock('../../logger', () => ({ warn: jest.fn() }))
jest.mock('../../queries/clinvar-variant-queries', () => ({
  fetchClinvarReleaseDate: jest.fn(),
  countClinvarVariantsInRegion: jest.fn(),
  fetchClinvarVariantById: jest.fn(),
  fetchClinvarVariantsByGene: jest.fn(),
  fetchClinvarVariantsByRegion: jest.fn(),
  fetchClinvarVariantsByTranscript: jest.fn(),
}))

const nativeVariant: ClinvarVariant = {
  variant_id: '1-100-A-G',
  chrom: '1',
  pos: 100,
  ref: 'A',
  alt: 'G',
  reference_genome: 'GRCh38',
  clinvar_variation_id: '123',
  clinical_significance: 'Uncertain significance',
  review_status: 'criteria provided, single submitter',
  gold_stars: 1,
  in_gnomad: false,
  last_evaluated: null,
  rsid: null,
  submissions: [],
  gnomad: { exome: null, genome: null },
}

const listEntry: ClinvarVariantListEntry = {
  variant_id: '1-100-A-G',
  reference_genome: 'GRCh38',
  chrom: '1',
  pos: 100,
  ref: 'A',
  alt: 'G',
  clinvar_variation_id: '123',
  clinical_significance: 'Uncertain significance',
  review_status: 'criteria provided, single submitter',
  gold_stars: 1,
  in_gnomad: false,
  gnomad: { exome: null, genome: null },
  transcript_consequence: null,
}

const createNativeStore = () => ({
  fetchSingleVariant: jest
    .fn<ClinvarStore['fetchSingleVariant']>()
    .mockResolvedValue(nativeVariant),
  countVariantsInRegion: jest.fn<ClinvarStore['countVariantsInRegion']>().mockResolvedValue(1),
  fetchVariantsInRegion: jest
    .fn<ClinvarStore['fetchVariantsInRegion']>()
    .mockResolvedValue([listEntry]),
  fetchVariantsInGene: jest
    .fn<ClinvarStore['fetchVariantsInGene']>()
    .mockResolvedValue([listEntry]),
  fetchVariantsInTranscript: jest
    .fn<ClinvarStore['fetchVariantsInTranscript']>()
    .mockResolvedValue([listEntry]),
})

const unusedGeneStore: GeneStore = {
  fetchGeneById: jest.fn<GeneStore['fetchGeneById']>(),
}

const createContext = (store: ClinvarStore | null): GraphQLContext => ({
  esClient,
  parquetDataStore:
    store === null ? null : { clinvarGrch38: store, geneModelsGrch38: unusedGeneStore },
  requestId: null,
})

const resolveClinvarVariant = (referenceGenome: string, context: GraphQLContext) =>
  resolvers.Query.clinvar_variant(
    {},
    { variant_id: '1-100-a-g', reference_genome: referenceGenome },
    context
  )

beforeEach(() => {
  jest.clearAllMocks()
  config.PARQUET_ONLY = false
})

describe('BrowserMetadata.clinvar_release_date', () => {
  const resolveReleaseDate = () =>
    resolvers.BrowserMetadata.clinvar_release_date({}, {}, createContext(null))

  test('reads the release date from Elasticsearch', async () => {
    jest.mocked(fetchClinvarReleaseDate).mockResolvedValueOnce('2026-11-05')

    expect(await resolveReleaseDate()).toBe('2026-11-05')
    expect(fetchClinvarReleaseDate).toHaveBeenCalledWith(esClient)
  })

  test('returns a visible placeholder and warns in PARQUET_ONLY mode', async () => {
    config.PARQUET_ONLY = true

    expect(await resolveReleaseDate()).toBe(
      PARQUET_ONLY_STUBS['BrowserMetadata.clinvar_release_date']
    )
    expect(fetchClinvarReleaseDate).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'parquetOnlyStub',
        field: 'BrowserMetadata.clinvar_release_date',
      })
    )
  })
})

describe('Query.clinvar_variant', () => {
  test('serves GRCh38 variants from the native store with a normalized ID', async () => {
    const store = createNativeStore()

    const variant = await resolveClinvarVariant('GRCh38', createContext(store))

    expect(variant).toBe(nativeVariant)
    expect(store.fetchSingleVariant).toHaveBeenCalledWith('1-100-A-G')
    expect(fetchClinvarVariantById).not.toHaveBeenCalled()
  })

  test('returns null for a GRCh38 variant missing from the native store without asking ES', async () => {
    const store = createNativeStore()
    store.fetchSingleVariant.mockResolvedValueOnce(null)

    expect(await resolveClinvarVariant('GRCh38', createContext(store))).toBeNull()
    expect(fetchClinvarVariantById).not.toHaveBeenCalled()
  })

  test('keeps GRCh37 variants on Elasticsearch', async () => {
    const store = createNativeStore()

    await resolveClinvarVariant('GRCh37', createContext(store))

    expect(store.fetchSingleVariant).not.toHaveBeenCalled()
    expect(fetchClinvarVariantById).toHaveBeenCalledWith(esClient, 'GRCh37', '1-100-A-G')
  })

  test('uses Elasticsearch when the native data store is disabled', async () => {
    await resolveClinvarVariant('GRCh38', createContext(null))

    expect(fetchClinvarVariantById).toHaveBeenCalledWith(esClient, 'GRCh38', '1-100-A-G')
  })

  test('rejects native failures instead of falling back to Elasticsearch', async () => {
    const store = createNativeStore()
    store.fetchSingleVariant.mockRejectedValueOnce(new Error('native failure'))

    await expect(resolveClinvarVariant('GRCh38', createContext(store))).rejects.toThrow(
      'native failure'
    )
    expect(fetchClinvarVariantById).not.toHaveBeenCalled()
  })
})

describe('Region.clinvar_variants', () => {
  const region = (referenceGenome: string) => ({
    reference_genome: referenceGenome,
    chrom: '1',
    start: 100,
    stop: 200,
  })

  const resolveRegionVariants = (referenceGenome: string, context: GraphQLContext) =>
    resolvers.Region.clinvar_variants(region(referenceGenome), {}, context)

  test('serves GRCh38 regions from the native store after counting them', async () => {
    const store = createNativeStore()

    const variants = await resolveRegionVariants('GRCh38', createContext(store))

    expect(variants).toEqual([listEntry])
    expect(store.countVariantsInRegion).toHaveBeenCalledWith('1', 100, 200)
    expect(store.fetchVariantsInRegion).toHaveBeenCalledWith('1', 100, 200, 30_000)
    expect(countClinvarVariantsInRegion).not.toHaveBeenCalled()
    expect(fetchClinvarVariantsByRegion).not.toHaveBeenCalled()
  })

  test('fetches regions with exactly the limit of native variants', async () => {
    const store = createNativeStore()
    store.countVariantsInRegion.mockResolvedValueOnce(30_000)

    await resolveRegionVariants('GRCh38', createContext(store))

    expect(store.fetchVariantsInRegion).toHaveBeenCalled()
  })

  test('rejects regions with more native variants than the limit without fetching them', async () => {
    const store = createNativeStore()
    store.countVariantsInRegion.mockResolvedValueOnce(30_001)

    await expect(resolveRegionVariants('GRCh38', createContext(store))).rejects.toThrow(
      UserVisibleError
    )
    expect(store.fetchVariantsInRegion).not.toHaveBeenCalled()
  })

  test('keeps GRCh37 regions on Elasticsearch', async () => {
    const store = createNativeStore()
    jest.mocked(countClinvarVariantsInRegion).mockResolvedValueOnce(1)

    await resolveRegionVariants('GRCh37', createContext(store))

    expect(store.fetchVariantsInRegion).not.toHaveBeenCalled()
    expect(fetchClinvarVariantsByRegion).toHaveBeenCalledWith(esClient, 'GRCh37', region('GRCh37'))
  })

  test('rejects native failures instead of falling back to Elasticsearch', async () => {
    const store = createNativeStore()
    store.countVariantsInRegion.mockRejectedValueOnce(new Error('native failure'))

    await expect(resolveRegionVariants('GRCh38', createContext(store))).rejects.toThrow(
      'native failure'
    )
    expect(countClinvarVariantsInRegion).not.toHaveBeenCalled()
  })
})

describe('Gene.clinvar_variants', () => {
  const gene = {
    gene_id: 'ENSG001',
    chrom: '1',
    reference_genome: 'GRCh38',
    exons: [
      { feature_type: 'exon', start: 100, stop: 400 },
      { feature_type: 'UTR', start: 80, stop: 99 },
      { feature_type: 'CDS', start: 300, stop: 310 },
      { feature_type: 'CDS', start: 130, stop: 140 },
    ],
  }

  test('routes GRCh38 to the native store with only unpadded CDS intervals', async () => {
    const store = createNativeStore()

    const variants = await resolvers.Gene.clinvar_variants(gene, {}, createContext(store))

    expect(variants).toEqual([listEntry])
    expect(store.fetchVariantsInGene).toHaveBeenCalledWith('ENSG001', '1', [
      { start: 300, stop: 310 },
      { start: 130, stop: 140 },
    ])
    expect(fetchClinvarVariantsByGene).not.toHaveBeenCalled()
  })

  test('uses Elasticsearch when the native data store is disabled', async () => {
    await resolvers.Gene.clinvar_variants(gene, {}, createContext(null))

    expect(fetchClinvarVariantsByGene).toHaveBeenCalledWith(esClient, 'GRCh38', gene)
  })

  test('keeps GRCh37 genes on Elasticsearch', async () => {
    const store = createNativeStore()
    const grch37Gene = { ...gene, reference_genome: 'GRCh37' }

    await resolvers.Gene.clinvar_variants(grch37Gene, {}, createContext(store))

    expect(store.fetchVariantsInGene).not.toHaveBeenCalled()
    expect(fetchClinvarVariantsByGene).toHaveBeenCalledWith(esClient, 'GRCh37', grch37Gene)
  })

  test('rejects native failures instead of falling back to Elasticsearch', async () => {
    const store = createNativeStore()
    store.fetchVariantsInGene.mockRejectedValueOnce(new Error('native failure'))

    await expect(resolvers.Gene.clinvar_variants(gene, {}, createContext(store))).rejects.toThrow(
      'native failure'
    )
    expect(fetchClinvarVariantsByGene).not.toHaveBeenCalled()
  })
})

describe('Transcript.clinvar_variants', () => {
  const transcript = {
    transcript_id: 'ENST001',
    chrom: '1',
    reference_genome: 'GRCh38',
    exons: [
      { feature_type: 'UTR', start: 1, stop: 99 },
      { feature_type: 'exon', start: 100, stop: 200 },
      { feature_type: 'exon', start: 300, stop: 400 },
    ],
  }

  test('routes GRCh38 to the native store with unpadded exons when CDS is absent', async () => {
    const store = createNativeStore()

    const variants = await resolvers.Transcript.clinvar_variants(
      transcript,
      {},
      createContext(store)
    )

    expect(variants).toEqual([listEntry])
    expect(store.fetchVariantsInTranscript).toHaveBeenCalledWith('ENST001', '1', [
      { start: 100, stop: 200 },
      { start: 300, stop: 400 },
    ])
    expect(fetchClinvarVariantsByTranscript).not.toHaveBeenCalled()
  })

  test('keeps GRCh37 transcripts on Elasticsearch', async () => {
    const store = createNativeStore()
    const grch37Transcript = { ...transcript, reference_genome: 'GRCh37' }

    await resolvers.Transcript.clinvar_variants(grch37Transcript, {}, createContext(store))

    expect(store.fetchVariantsInTranscript).not.toHaveBeenCalled()
    expect(fetchClinvarVariantsByTranscript).toHaveBeenCalledWith(
      esClient,
      'GRCh37',
      grch37Transcript
    )
  })

  test('returns an empty native result without asking Elasticsearch', async () => {
    const store = createNativeStore()
    store.fetchVariantsInTranscript.mockResolvedValueOnce([])

    const variants = await resolvers.Transcript.clinvar_variants(
      transcript,
      {},
      createContext(store)
    )

    expect(variants).toEqual([])
    expect(fetchClinvarVariantsByTranscript).not.toHaveBeenCalled()
  })
})

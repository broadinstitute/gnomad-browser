import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type {
  ClinvarStore,
  ClinvarVariantListEntry,
  GeneStore,
  GnomadV4Store,
} from '@gnomad/data-store'

import type { GraphQLContext } from '../../app'
import { client as esClient } from '../../elasticsearch'
import {
  fetchClinvarVariantsByGene,
  fetchClinvarVariantsByTranscript,
} from '../../queries/clinvar-variant-queries'

import resolvers from './clinvar-variants'

jest.mock('../../config', () => ({ PARQUET_ONLY: false }))
jest.mock('../../elasticsearch', () => ({ client: {} }))
jest.mock('../../queries/clinvar-variant-queries', () => ({
  fetchClinvarReleaseDate: jest.fn(),
  countClinvarVariantsInRegion: jest.fn(),
  fetchClinvarVariantById: jest.fn(),
  fetchClinvarVariantsByGene: jest.fn(),
  fetchClinvarVariantsByRegion: jest.fn(),
  fetchClinvarVariantsByTranscript: jest.fn(),
}))

const variant: ClinvarVariantListEntry = {
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
  fetchSingleVariant: jest.fn<ClinvarStore['fetchSingleVariant']>().mockResolvedValue(null),
  fetchVariantsInRegion: jest
    .fn<ClinvarStore['fetchVariantsInRegion']>()
    .mockResolvedValue([variant]),
  fetchVariantsInGene: jest.fn<ClinvarStore['fetchVariantsInGene']>().mockResolvedValue([variant]),
  fetchVariantsInTranscript: jest
    .fn<ClinvarStore['fetchVariantsInTranscript']>()
    .mockResolvedValue([variant]),
})

const createContext = (store: ClinvarStore | null): GraphQLContext => ({
  esClient,
  parquetDataStore:
    store === null
      ? null
      : {
          clinvarGrch38: store,
          geneModelsGrch38: {
            fetchGeneById: jest.fn<GeneStore['fetchGeneById']>().mockResolvedValue(null),
          },
          gnomadVariantsV4: {
            fetchSingleVariant: jest.fn<GnomadV4Store['fetchSingleVariant']>(),
            fetchVariantsInGene: jest.fn<GnomadV4Store['fetchVariantsInGene']>(),
            fetchVariantsInTranscript: jest.fn<GnomadV4Store['fetchVariantsInTranscript']>(),
          },
        },
  requestId: null,
})

beforeEach(() => {
  jest.resetAllMocks()
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

  test('routes GRCh38 to the native reader with only unpadded CDS intervals', async () => {
    const store = createNativeStore()

    const variants = await resolvers.Gene.clinvar_variants(gene, {}, createContext(store))

    expect(variants).toEqual([variant])
    expect(store.fetchVariantsInGene).toHaveBeenCalledTimes(1)
    expect(store.fetchVariantsInGene).toHaveBeenCalledWith('ENSG001', '1', [
      { start: 300, stop: 310 },
      { start: 130, stop: 140 },
    ])
    expect(store.fetchVariantsInTranscript).not.toHaveBeenCalled()
    expect(fetchClinvarVariantsByGene).not.toHaveBeenCalled()
  })

  test('uses ES when the native store is disabled', async () => {
    jest.mocked(fetchClinvarVariantsByGene).mockResolvedValue([variant])

    const variants = await resolvers.Gene.clinvar_variants(gene, {}, createContext(null))

    expect(variants).toEqual([variant])
    expect(fetchClinvarVariantsByGene).toHaveBeenCalledWith(esClient, 'GRCh38', gene)
  })

  test('keeps GRCh37 on ES even when the native store is enabled', async () => {
    const store = createNativeStore()
    const grch37Gene = { ...gene, reference_genome: 'GRCh37' }
    jest.mocked(fetchClinvarVariantsByGene).mockResolvedValue([variant])

    await resolvers.Gene.clinvar_variants(grch37Gene, {}, createContext(store))

    expect(fetchClinvarVariantsByGene).toHaveBeenCalledWith(esClient, 'GRCh37', grch37Gene)
    expect(store.fetchVariantsInGene).not.toHaveBeenCalled()
  })

  test('propagates native errors without retrying ES', async () => {
    const store = createNativeStore()
    const error = new Error('native query failed')
    store.fetchVariantsInGene.mockRejectedValue(error)

    await expect(resolvers.Gene.clinvar_variants(gene, {}, createContext(store))).rejects.toBe(
      error
    )

    expect(fetchClinvarVariantsByGene).not.toHaveBeenCalled()
  })

  test('rejects missing numeric exon coordinates before calling the native reader', () => {
    const store = createNativeStore()
    const invalidGene = { ...gene, exons: [{ feature_type: 'CDS', start: 'invalid', stop: 200 }] }

    expect(() => resolvers.Gene.clinvar_variants(invalidGene, {}, createContext(store))).toThrow(
      'ClinVar exon intervals require numeric start and stop coordinates'
    )
    expect(store.fetchVariantsInGene).not.toHaveBeenCalled()
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

  test('routes GRCh38 to the native reader with unpadded exons when CDS is absent', async () => {
    const store = createNativeStore()

    const variants = await resolvers.Transcript.clinvar_variants(
      transcript,
      {},
      createContext(store)
    )

    expect(variants).toEqual([variant])
    expect(store.fetchVariantsInTranscript).toHaveBeenCalledTimes(1)
    expect(store.fetchVariantsInTranscript).toHaveBeenCalledWith('ENST001', '1', [
      { start: 100, stop: 200 },
      { start: 300, stop: 400 },
    ])
    expect(store.fetchVariantsInGene).not.toHaveBeenCalled()
    expect(fetchClinvarVariantsByTranscript).not.toHaveBeenCalled()
  })

  test('uses ES when the native store is disabled', async () => {
    jest.mocked(fetchClinvarVariantsByTranscript).mockResolvedValue([variant])

    const variants = await resolvers.Transcript.clinvar_variants(
      transcript,
      {},
      createContext(null)
    )

    expect(variants).toEqual([variant])
    expect(fetchClinvarVariantsByTranscript).toHaveBeenCalledWith(esClient, 'GRCh38', transcript)
  })

  test('keeps GRCh37 on ES even when the native store is enabled', async () => {
    const store = createNativeStore()
    const grch37Transcript = { ...transcript, reference_genome: 'GRCh37' }
    jest.mocked(fetchClinvarVariantsByTranscript).mockResolvedValue([variant])

    await resolvers.Transcript.clinvar_variants(grch37Transcript, {}, createContext(store))

    expect(fetchClinvarVariantsByTranscript).toHaveBeenCalledWith(
      esClient,
      'GRCh37',
      grch37Transcript
    )
    expect(store.fetchVariantsInTranscript).not.toHaveBeenCalled()
  })

  test('returns an empty native result without retrying ES', async () => {
    const store = createNativeStore()
    store.fetchVariantsInTranscript.mockResolvedValue([])

    const variants = await resolvers.Transcript.clinvar_variants(
      transcript,
      {},
      createContext(store)
    )

    expect(variants).toEqual([])
    expect(fetchClinvarVariantsByTranscript).not.toHaveBeenCalled()
  })
})

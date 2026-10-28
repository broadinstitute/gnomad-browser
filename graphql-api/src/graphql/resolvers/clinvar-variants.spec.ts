import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { ClinvarStore, ClinvarVariant } from '@gnomad/data-store'

import type { GraphQLContext } from '../context'
import { client as esClient } from '../../elasticsearch'
import { fetchClinvarVariantById } from '../../queries/clinvar-variant-queries'

import resolvers from './clinvar-variants'

jest.mock('../../elasticsearch', () => ({ client: {} }))
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

const createNativeStore = () => ({
  fetchSingleVariant: jest
    .fn<ClinvarStore['fetchSingleVariant']>()
    .mockResolvedValue(nativeVariant),
})

const createContext = (store: ClinvarStore | null): GraphQLContext => ({
  esClient,
  parquetDataStore: store === null ? null : { clinvarGrch38: store },
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

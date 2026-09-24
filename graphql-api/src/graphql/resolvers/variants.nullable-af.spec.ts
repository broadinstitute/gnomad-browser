import path from 'path'
import { graphql } from 'graphql'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import resolvers from './variants'
import { mapY1RowToGraphQL } from '../../queries/long_read_y1_variants'
import { fetchVariantById as fetchLongReadVariantById } from '../../queries/long_read_variants'
import { fetchVariantById } from '../../queries/variant-queries'

jest.mock('../../clickhouse', () => ({ y1ClickhouseClient: { query: jest.fn() } }))
jest.mock('../../queries/long_read_variants', () => ({ fetchVariantById: jest.fn() }))
jest.mock('../../queries/variant-queries', () => ({ fetchVariantById: jest.fn() }))
jest.mock('../../queries/clinvar-variant-queries', () => ({}))
jest.mock('../../queries/genomic-constraint-queries', () => ({
  fetchNccConstraintRegionById: jest.fn(async () => null),
}))

// The actual shared variant route, resolver, Y1 mapper and full on-disk SDL.
// Only query I/O is mocked; neither production mapper is replaced.
const schema = makeExecutableSchema({
  typeDefs: mergeTypeDefs([
    ...loadFilesSync(path.join(__dirname, '../types')),
    'directive @cost(value: Int!, multipliers: [String!]) on FIELD_DEFINITION',
  ]),
  resolvers: { Query: { variant: resolvers.Query.variant } },
})
const sourceVariantId = 'chr1-100-TRV-3'
const query = `query ($id: String!) {
  variant(variantId: $id, dataset: gnomad_r4_lr, lr_cohort: aou) {
    variant_id
    long_read { ac an af populations { id ac an af } }
  }
}`

beforeEach(() => jest.clearAllMocks())

test.each([null, 0, 0.125])('shared variant-detail route preserves source AF=%p and known counts', async (af) => {
  const mapped = mapY1RowToGraphQL({
    source_variant_id: sourceVariantId, alt_index: 1, alt_count: 1,
    chrom: 'chr1', position: 100, reference_end: 103, ref_allele: 'ACAG',
    alt: 'ACAGCAG', allele_type: 'trv', filters: [], ac: 7, an: 2054, af,
  }, 'aou', [{ id: 'afr', ac: 2, an: 100, af }], 'selected-r2')
  ;(fetchLongReadVariantById as jest.Mock).mockResolvedValue(mapped)
  const result = await graphql({ schema, source: query,
    variableValues: { id: `${sourceVariantId}~1` }, contextValue: { esClient: null } })
  expect(result.errors).toBeUndefined()
  expect(result.data?.variant).toEqual({ variant_id: `${sourceVariantId}~1`, long_read: {
    ac: 7, an: 2054, af, populations: [{ id: 'afr', ac: 2, an: 100, af }],
  } })
  expect(fetchLongReadVariantById).toHaveBeenCalledWith(`${sourceVariantId}~1`, 'aou')
  expect(fetchVariantById).not.toHaveBeenCalled()
})

test('complete legacy v1 numeric LR records remain unchanged', async () => {
  const freq = { all: { ac: 2, an: 10, af: 0.2 }, populations: [{ id: 'afr', ac: 1, an: 5, af: 0.2 }] }
  ;(fetchLongReadVariantById as jest.Mock).mockResolvedValue({
    variant_id: 'chr1-100-A-G', chrom: '1', pos: 100, ref: 'A', alt: 'G',
    reference_genome: 'GRCh38', freq,
  })
  const result = await graphql({ schema, source: query,
    variableValues: { id: 'chr1-100-A-G' }, contextValue: { esClient: null } })
  expect(result.errors).toBeUndefined()
  expect((result.data?.variant as any).long_read).toEqual({ ...freq.all, populations: freq.populations })
})

test('LR counts remain required and shared short-read field contracts are unchanged', () => {
  const lr = (schema.getType('LongReadSequencingTypeData') as any).getFields()
  expect(String(lr.af.type)).toBe('Float')
  expect(String(lr.ac.type)).toBe('Int!')
  expect(String(lr.an.type)).toBe('Int!')
  for (const name of ['VariantSequencingTypeData', 'VariantDetailsSequencingTypeData']) {
    const fields = (schema.getType(name) as any).getFields()
    expect(String(fields.af.type)).toBe('Float')
    expect(String(fields.ac.type)).toBe('Int')
    expect(String(fields.an.type)).toBe('Int')
  }
})

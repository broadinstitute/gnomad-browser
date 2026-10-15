import { jest } from '@jest/globals'
import fs from 'fs'
import path from 'path'
import { buildASTSchema, graphql, Kind, parse } from 'graphql'

const mockQuery = jest.fn()
jest.mock('../clickhouse', () => ({
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))

// eslint-disable-next-line import/first
import {
  fetchY1VariantById,
  fetchY1VariantsByRegion,
  fetchY1VariantsByRegions,
  mapY1RowToGraphQL,
} from './long_read_y1_variants'

// Synthetic multiallelic record: null AF must remain unavailable despite known counts.
const sourceVariantId = 'chr1-100-TRV-3'
const row = (altIndex: number, af: unknown, ac = 2) => ({
  source_variant_id: sourceVariantId, alt_index: altIndex, alt_count: 3,
  chrom: 'chr1', position: 100, reference_end: 103, xpos: 1000000100,
  ref_allele: 'ACAG', alt: 'ACAGCAG', allele_type: 'trv',
  filters: [], ac, an: 100, af, allele_length: 3,
})
const alleleRows = [row(1, null), row(2, 0, 0), row(3, '0.07', 7)]
const populationRows = [
  { alt_index: 1, id: 'afr', ac: '2', an: '50', af: null, values_available: 0 },
  { alt_index: 1, id: 'XX', ac: 0, an: 0, af: null, values_available: 0 },
  { alt_index: 2, id: 'afr', ac: 0, an: 50, af: 0, values_available: 1 },
  { alt_index: 3, id: 'afr', ac: 3, an: 50, af: '0.06', values_available: 1 },
].map((population) => ({ source_variant_id: sourceVariantId, ...population }))

// Compile the actual frequency SDL, not a duplicate hand-written nullable contract.
const frequencyNames = new Set([
  'LongReadVariantAllFrequencies',
  'LongReadVariantPopulationFrequencies',
  'LongReadVariantFrequencies',
])
const frequencyDefinitions = parse(fs.readFileSync(
  path.join(__dirname, '../graphql/types/long-read-variant.graphql'), 'utf8'
)).definitions.filter((definition) =>
  definition.kind === Kind.OBJECT_TYPE_DEFINITION && frequencyNames.has(definition.name.value)
)
const schema = buildASTSchema({
  kind: Kind.DOCUMENT,
  definitions: [
    ...frequencyDefinitions,
    ...parse('type Query { frequencies: [LongReadVariantFrequencies!]! }').definitions,
  ],
})

const assertPopulationQuery = () => {
  const requests = (mockQuery.mock.calls as any[]).map(([request]) => request)
  const frequencyQuery = requests.find((request) => request.query.includes('FROM lr_y1_frequencies'))
  // Explicit SQL regression: mocks alone would conceal the old availability filter.
  expect(frequencyQuery.query).toContain(
    '(values_available = 1 OR (ac IS NOT NULL AND an IS NOT NULL))'
  )
  expect(frequencyQuery.query).toContain("division != 'all'")
  for (const request of requests) {
    expect(request.query_params).toMatchObject({ runId: 'selected-r2', cohort: 'aou', chrom: 'chr1' })
    expect(request.query).not.toMatch(/coalesce\s*\(|ifNull\s*\(|af\s*(?:>|!=|IS NOT NULL)/i)
    expect(request.query).not.toContain('lr_y1_carriers')
  }
}

beforeEach(() => mockQuery.mockReset())

describe('Y1 source AF missingness', () => {
  it.each([
    { input: null, expected: null, ac: 2, an: 100 },
    { input: undefined, expected: null, ac: 2, an: 100 },
    { input: null, expected: null, ac: 0, an: 0 },
    { input: 0, expected: 0, ac: 0, an: 100 },
    { input: '0', expected: 0, ac: 0, an: 100 },
    { input: 0.02, expected: 0.02, ac: 2, an: 100 },
    { input: '0.02', expected: 0.02, ac: 2, an: 100 },
  ])('preserves $input AF and counts $ac/$an without derivation', ({ input, expected, ac, an }) => {
    const variant = mapY1RowToGraphQL({ ...row(1, input), ac, an }, 'aou', [], 'selected-r2')
    expect(variant.freq.all).toEqual({ ac, an, af: expected })
    expect(variant.variant_id).toBe(`${sourceVariantId}~1`)
  })

  it.each(['region', 'regions'])('retains all ALT rows in a %s list, including absent AF', async (route) => {
    mockQuery.mockImplementation((request: any) => Promise.resolve({ json: async () => {
      if (request.query.includes('FROM lr_y1_frequencies')) return populationRows
      if (request.query.includes('FROM lr_y1_summaries')) return [{
        source_variant_id: sourceVariantId, tr_locus_id: '1-100-103-CAG', tr_motifs: 'CAG',
      }]
      return alleleRows
    } }))
    const variants = route === 'region'
      ? await fetchY1VariantsByRegion({ chrom: '1', start: 90, stop: 110 }, 'aou', 'selected-r2')
      : await fetchY1VariantsByRegions('1', [{ start: 90, stop: 110 }, { start: 200, stop: 210 }], 'aou', 'selected-r2')

    expect(variants.map((variant) => variant.alt_index)).toEqual([1, 2, 3])
    expect(variants.map((variant) => variant.freq)).toEqual([
      { all: { ac: 2, an: 100, af: null }, populations: [
        { id: 'afr', ac: 2, an: 50, af: null }, { id: 'XX', ac: 0, an: 0, af: null },
      ] },
      { all: { ac: 0, an: 100, af: 0 }, populations: [{ id: 'afr', ac: 0, an: 50, af: 0 }] },
      { all: { ac: 7, an: 100, af: 0.07 }, populations: [{ id: 'afr', ac: 3, an: 50, af: 0.06 }] },
    ])
    expect(variants.every((variant) => variant.alt_count === 3)).toBe(true)
    expect(variants[0].tr_locus_id).toBe('1-100-103-CAG')
    assertPopulationQuery()

    const result = await graphql({ schema,
      source: '{ frequencies { all { ac an af } populations { id ac an af } } }',
      rootValue: { frequencies: variants.map((variant) => variant.freq) },
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.frequencies).toEqual(variants.map((variant) => variant.freq))
  })

  it.each(alleleRows)('keeps exact ALT $alt_index detail and its population AF', async (allele) => {
    mockQuery
      .mockImplementationOnce(() => Promise.resolve({ json: async () => [allele] }))
      .mockImplementationOnce(() => Promise.resolve({ json: async () =>
        populationRows.filter((population) => population.alt_index === allele.alt_index),
      }))
    const variant = await fetchY1VariantById(`${sourceVariantId}~${allele.alt_index}`, 'aou', 'selected-r2', 'chr1')
    expect(variant).not.toBeNull()
    expect(variant!.freq.all).toEqual({ ac: allele.ac, an: 100, af: [null, 0, 0.07][allele.alt_index - 1] })
    expect(variant!.freq.populations[0].af).toBe([null, 0, 0.06][allele.alt_index - 1])
    expect(variant!.freq.populations[0]).toMatchObject({ ac: [2, 0, 3][allele.alt_index - 1], an: 50 })
    assertPopulationQuery()
    const [request] = mockQuery.mock.calls[1] as any[]
    expect(request.query_params).toMatchObject({ sourceVariantId, altIndex: allele.alt_index })
  })

  it('retains the variant without inventing entirely absent subdivisions', async () => {
    mockQuery
      .mockImplementationOnce(() => Promise.resolve({ json: async () => [row(1, null)] }))
      // Entirely absent subdivisions (AC/AN/AF all null, values_available=0)
      // do not satisfy the SQL count-bearing predicate and are not returned.
      .mockImplementationOnce(() => Promise.resolve({ json: async () => [] }))
    const variant = await fetchY1VariantById(`${sourceVariantId}~1`, 'aou', 'selected-r2', 'chr1')
    expect(variant!.freq).toEqual({ all: { ac: 2, an: 100, af: null }, populations: [] })
    assertPopulationQuery()
  })

  it('keeps counts required in GraphQL while making only AF nullable', () => {
    for (const name of ['LongReadVariantAllFrequencies', 'LongReadVariantPopulationFrequencies']) {
      const fields = (schema.getType(name) as any).getFields()
      expect(String(fields.af.type)).toBe('Float')
      expect(String(fields.ac.type)).toBe('Int!')
      expect(String(fields.an.type)).toBe('Int!')
    }
  })
})

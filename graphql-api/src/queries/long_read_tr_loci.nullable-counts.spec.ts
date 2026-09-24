import {
  buildCanonicalAlleleStratifiedView,
  buildWholeRecordAlleleLandscape,
} from './long_read_tr_loci'

jest.mock('../clickhouse', () => ({ y1ClickhouseClient: { query: jest.fn() } }))
jest.mock('../cache', () => ({ withCache: (fn: any) => fn }))

const allele = { source_variant_id: 'source1', alt_index: 1, ac: 2, an: 10, af: null, allele_length: 1 }
const row = (overrides: any = {}) => ({ ...allele, division: 'afr', ...overrides })
const views = (frequencyRows: any[], alleles = [allele]) => ({
  canonical: buildCanonicalAlleleStratifiedView({ alleles, frequencyRows,
    frequencyProductAvailable: true, ancestryFilterId: 'frequency:afr' }),
  landscape: buildWholeRecordAlleleLandscape({ alleles, frequencyRows,
    sourceRecordCount: 1, purityByAllele: new Map() }) as any,
})

test.each([null, 0.2, 0.2000049, 0.1999951])('count-only views retain validated counts with source AF %p', (af) => {
  const rows = [row({ af }), row({ division: 'all', af: null })]
  const original = JSON.stringify(rows)
  const { canonical, landscape } = views(rows)
  expect(canonical).toMatchObject({ status: 'AVAILABLE', filtered_called_alleles: 2,
    allele_counts: [{ allele_id: 'source1~1', called_alleles: 2 }] })
  expect(landscape).toMatchObject({ status: 'AVAILABLE', stratified_available: true,
    bins: [{ called_alleles: 2, stacks: expect.arrayContaining([
      { ancestry_group: 'afr', sex: null, called_alleles: 2 },
    ]) }] })
  expect(JSON.stringify(rows)).toBe(original)
  expect(allele.af).toBeNull()
})

test.each([NaN, Infinity, -Infinity, -0.1, 1.1, '', ' ', 'bad', true, [], 0.2000051, 0.1999949].map(af => ({ af })))(
  'supplied AF $af fails finite/range/mismatch checks in both count builders', ({ af }) => {
    const { canonical, landscape } = views([row({ af })])
    expect(canonical.status).toBe('UNAVAILABLE')
    expect(landscape).toMatchObject({ status: 'AVAILABLE', stratified_available: false,
      stratified_unavailable_reason: 'MALFORMED_STRATIFIED_FREQUENCIES', bins: [{ stacks: [] }] })
  }
)

test('rounded source AF uses the explicit backend 5e-6 tolerance, not the old 1e-9', () => {
  const rounded = { ...allele, ac: 1, an: 3 }
  const rows = [row({ ac: 1, an: 3, af: 0.333333 })]
  expect(Math.abs(rows[0].af - 1 / 3)).toBeGreaterThan(1e-9)
  const { canonical, landscape } = views(rows, [rounded])
  expect(canonical).toMatchObject({ status: 'AVAILABLE', filtered_called_alleles: 1 })
  expect(landscape.stratified_available).toBe(true)
  expect(rows[0]).toMatchObject({ ac: 1, an: 3, af: 0.333333 })
})

test.each([null, 0])('AN0 count view retains explicit source AF=%p without division', (af) => {
  const rows = [row({ ac: 0, an: 0, af })]
  const { canonical, landscape } = views(rows, [{ ...allele, ac: 0, an: 0 }])
  expect(canonical).toMatchObject({ status: 'AVAILABLE', filtered_called_alleles: 0 })
  expect(landscape.stratified_available).toBe(true)
  expect(rows[0]).toMatchObject({ ac: 0, an: 0, af })
})

test.each([0.000001, 0.2])('AN0 rejects any supplied nonzero AF=%p, even inside rounding tolerance', (af) => {
  const { canonical, landscape } = views([row({ ac: 0, an: 0, af })], [{ ...allele, ac: 0, an: 0 }])
  expect(canonical.status).toBe('UNAVAILABLE')
  expect(landscape.stratified_available).toBe(false)
})

test.each([
  { ac: null, an: null, af: null }, { ac: null }, { an: null },
  { ac: '' }, { an: '' }, { ac: -1 }, { ac: 11 }, { an: -1 }, { ac: 1.5 }, { an: 10.5 },
])('absent or invalid counts stay unavailable and unmodified: %p', (overrides) => {
  const rows = [row(overrides)]
  const original = JSON.stringify(rows)
  const { canonical, landscape } = views(rows)
  expect(canonical.status).toBe('UNAVAILABLE')
  expect(landscape.stratified_available).toBe(false)
  expect(JSON.stringify(rows)).toBe(original)
})

test.each(['duplicate', 'missing ALT', 'inconsistent AN', 'cross-ALT sum'])('%s count evidence still fails closed with null AF', (kind) => {
  const alleles = [allele, { ...allele, alt_index: 2 }]
  let rows = [row(), row({ alt_index: 2 })]
  if (kind === 'duplicate') rows.push(row())
  if (kind === 'missing ALT') rows = [row()]
  if (kind === 'inconsistent AN') rows[1].an = 11
  if (kind === 'cross-ALT sum') rows = rows.map(r => ({ ...r, ac: 6 }))
  expect(views(rows, alleles).canonical.status).toBe('UNAVAILABLE')
})

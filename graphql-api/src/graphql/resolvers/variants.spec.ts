import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import logger from '../../logger'
import complexRegions, { ComplexRegionRule } from '../../queries/helpers/complex-regions'
import { countVariantsInRegion, fetchVariantsByRegion } from '../../queries/variant-queries'
import { requestStore } from '../../request-context'
import resolvers from './variants'

jest.mock('../../cache', () => ({
  withCache: <QueryFunction>(query: QueryFunction) => query,
}))

jest.mock('../../queries/clinvar-variant-queries', () => ({
  fetchClinvarVariantByClinvarVariationId: jest.fn(),
}))

jest.mock('../../queries/variant-queries', () => {
  const actual = jest.requireActual<typeof import('../../queries/variant-queries')>(
    '../../queries/variant-queries'
  )
  return {
    ...actual,
    countVariantsInRegion: jest.fn<typeof actual.countVariantsInRegion>(),
    fetchVariantsByRegion: jest.fn<typeof actual.fetchVariantsByRegion>(),
  }
})

jest.mock('../../queries/helpers/complex-regions', () => ({
  __esModule: true,
  default: [
    ...jest.requireActual<typeof import('../../queries/helpers/complex-regions')>(
      '../../queries/helpers/complex-regions'
    ).default,
  ],
}))

const setComplexRegionRules = (rules: readonly ComplexRegionRule[]) => {
  const mockedRules = jest.requireMock<{ default: ComplexRegionRule[] }>(
    '../../queries/helpers/complex-regions'
  ).default
  mockedRules.splice(0, mockedRules.length, ...rules)
}

beforeEach(() => {
  const actual = jest.requireActual<typeof import('../../queries/variant-queries')>(
    '../../queries/variant-queries'
  )
  jest.mocked(countVariantsInRegion).mockReset().mockImplementation(actual.countVariantsInRegion)
  jest.mocked(fetchVariantsByRegion).mockReset().mockImplementation(actual.fetchVariantsByRegion)
})

afterEach(() => {
  jest.restoreAllMocks()
  setComplexRegionRules(
    jest.requireActual<typeof import('../../queries/helpers/complex-regions')>(
      '../../queries/helpers/complex-regions'
    ).default
  )
})

const mockRegionQueries = (numVariants: number) => {
  const variants = [{ variant_id: '4-86100001-A-G' }, { variant_id: '4-86100002-C-T' }]
  const count = jest.mocked(countVariantsInRegion).mockReturnValue(Promise.resolve(numVariants))
  const fetch = jest.mocked(fetchVariantsByRegion).mockReturnValue(Promise.resolve(variants))
  const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
  return { count, fetch, warn, variants }
}

const mapk10Region = {
  chrom: '4',
  start: 86100001,
  stop: 86125000,
  reference_genome: 'GRCh38',
}

const resolveRegionVariants = (region = mapk10Region, dataset = 'gnomad_r4') => {
  return resolvers.Region.variants(region, { dataset }, { esClient: {} })
}

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

describe.each(complexRegions)('$geneSymbol complex-region guard', (rule) => {
  test.each(rule.datasets)(
    'rejects more than 10000 variants for %s before fetching',
    async (dataset) => {
      const { count, fetch, warn } = mockRegionQueries(10001)
      const region = {
        chrom: rule.chrom,
        start: rule.start,
        stop: rule.stop,
        reference_genome: rule.referenceGenome,
      }

      await expect(resolveRegionVariants(region, dataset)).rejects.toThrow('annotation-heavy locus')

      expect(count).toHaveBeenCalledTimes(1)
      expect(count).toHaveBeenCalledWith({}, dataset, region)
      expect(fetch).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'complexRegionQueryRejected',
          dataset,
          referenceGenome: 'GRCh38',
          chrom: rule.chrom,
          start: rule.start,
          stop: rule.stop,
          ruleIds: [rule.id],
          geneSymbols: [rule.geneSymbol],
          numVariants: 10001,
          maxVariants: 10000,
        })
      )
    }
  )

  test.each([
    ['left boundary', rule.start - 10, rule.start],
    ['right boundary', rule.stop, rule.stop + 10],
    ['enclosing interval', rule.start - 10, rule.stop + 10],
    ['single position inside', rule.start + 1, rule.start + 1],
  ])('guards %s overlap and counts the entire request', async (_label, start, stop) => {
    const { count, fetch } = mockRegionQueries(10001)
    const region = { ...mapk10Region, chrom: rule.chrom, start, stop }

    await expect(resolveRegionVariants(region)).rejects.toThrow('annotation-heavy locus')

    expect(count).toHaveBeenCalledWith({}, 'gnomad_r4', region)
    expect(fetch).not.toHaveBeenCalled()
  })

  test.each([
    ['immediately before', rule.start - 10, rule.start - 1],
    ['immediately after', rule.stop + 1, rule.stop + 10],
  ])('retains the default maximum %s the span', async (_label, start, stop) => {
    const { fetch, warn, variants } = mockRegionQueries(30000)
    const region = { ...mapk10Region, chrom: rule.chrom, start, stop }

    await expect(resolveRegionVariants(region)).resolves.toBe(variants)

    expect(fetch).toHaveBeenCalledWith({}, 'gnomad_r4', region)
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('Complex-region admission behavior', () => {
  test.each([9999, 10000])(
    'returns the complete fetched result at count %s',
    async (numVariants) => {
      const { count, fetch, warn, variants } = mockRegionQueries(numVariants)

      await expect(resolveRegionVariants()).resolves.toBe(variants)

      expect(count).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith({}, 'gnomad_r4', mapk10Region)
      expect(warn).not.toHaveBeenCalled()
    }
  )

  test.each([
    ['another chromosome', { ...mapk10Region, chrom: '1' }, 'gnomad_r4'],
    ['GRCh37', { ...mapk10Region, reference_genome: 'GRCh37' }, 'gnomad_r2_1'],
  ])('retains the default maximum for %s', async (_label, region, dataset) => {
    const { warn, variants } = mockRegionQueries(30000)

    await expect(resolveRegionVariants(region, dataset)).resolves.toBe(variants)

    expect(warn).not.toHaveBeenCalled()
  })

  test('does not apply a rule to an unlisted dataset', async () => {
    const rule = complexRegions[0]
    setComplexRegionRules([{ ...rule, datasets: ['gnomad_r3'] }])
    const { warn, variants } = mockRegionQueries(30000)

    await expect(resolveRegionVariants()).resolves.toBe(variants)

    expect(warn).not.toHaveBeenCalled()
  })

  test('uses the strictest maximum when rules overlap', async () => {
    const rule = complexRegions[0]
    setComplexRegionRules([rule, { ...rule, id: 'stricter-overlap', maxVariants: 5000 }])
    const { fetch, warn } = mockRegionQueries(5001)

    await expect(resolveRegionVariants()).rejects.toThrow('annotation-heavy locus')

    expect(fetch).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ ruleIds: [rule.id, 'stricter-overlap'], maxVariants: 5000 })
    )
  })

  test('never raises the default maximum through configuration', async () => {
    const rule = complexRegions[0]
    setComplexRegionRules([{ ...rule, maxVariants: 40000 }])
    const { fetch, warn } = mockRegionQueries(30001)

    await expect(resolveRegionVariants()).rejects.toThrow(
      'This region has too many variants to display. Select a smaller region to view variants.'
    )

    expect(fetch).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  test('includes the request ID in the rejection warning', async () => {
    const { warn } = mockRegionQueries(10001)
    const context = {
      requestId: 'complex-region-request',
      startAt: 0,
      startCpu: { user: 0, system: 0 },
      startHeapUsed: 0,
      trace: null,
    }

    await expect(requestStore.run(context, () => resolveRegionVariants())).rejects.toThrow(
      'annotation-heavy locus'
    )

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'complex-region-request' })
    )
  })

  test('retains the existing span check before counting', async () => {
    const { count, fetch } = mockRegionQueries(0)

    await expect(
      resolveRegionVariants({ ...mapk10Region, stop: mapk10Region.start + 2500000 })
    ).rejects.toThrow('Select a smaller region to view variants')

    expect(count).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('does not fetch variants when the count fails', async () => {
    const { count, fetch, warn } = mockRegionQueries(0)
    count.mockReturnValue(Promise.reject(new Error('Count failed')))

    await expect(resolveRegionVariants()).rejects.toThrow('Count failed')

    expect(fetch).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })
})

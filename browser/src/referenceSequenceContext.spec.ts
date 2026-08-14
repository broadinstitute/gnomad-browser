import {
  EXPECTED_DEFAULT_COUNT,
  EXPECTED_REGION_COUNT,
  assertContextAsset,
  contextLoadResult,
  defaultContextFilters,
  filterContextRegions,
  longReadSummaryUrl,
  queryProblem,
  sourceIntervalLabel,
} from './referenceSequenceContext'

describe('reference sequence-context data and filtering', () => {
  const asset = contextLoadResult.asset!

  test('loads the pinned asset and preserves expected component counts', () => {
    expect(contextLoadResult.error).toBeUndefined()
    expect(asset.regions).toHaveLength(EXPECTED_REGION_COUNT)
    expect(
      filterContextRegions(
        asset.regions,
        defaultContextFilters(asset.categories.map((category) => category.id))
      )
    ).toHaveLength(EXPECTED_DEFAULT_COUNT)
  })

  test('supports any/all category matching and the explicit show-all mode', () => {
    const categoryIds = asset.categories.map((category) => category.id)
    const allRegions = filterContextRegions(asset.regions, {
      ...defaultContextFilters(categoryIds),
      multipleOnly: false,
    })
    expect(allRegions).toHaveLength(EXPECTED_REGION_COUNT)

    const both = filterContextRegions(asset.regions, {
      ...defaultContextFilters(categoryIds),
      multipleOnly: false,
      categoryIds: ['low-mappability', 'segmental-duplications'],
      matchMode: 'all',
    })
    expect(both.length).toBeGreaterThan(0)
    expect(
      both.every(
        (region) =>
          region.categories.includes('low-mappability') &&
          region.categories.includes('segmental-duplications')
      )
    ).toBe(true)
  })

  test('finds only exact component coordinates and reviewed labels', () => {
    const defaults = defaultContextFilters(asset.categories.map((category) => category.id))
    const byCoordinate = filterContextRegions(asset.regions, {
      ...defaults,
      query: '22:18,709,565-18,947,752',
    })
    expect(byCoordinate).toHaveLength(1)
    expect(byCoordinate[0].categories).toContain('false-duplication-correct-copy')

    const byLabel = filterContextRegions(asset.regions, { ...defaults, query: 'IGL' })
    expect(byLabel).toHaveLength(1)
    expect(byLabel[0]).toMatchObject({ start: 22026076, stop: 22922912, curatedLabel: 'IGL' })
    expect(queryProblem('chr21:1-10')?.kind).toBe('unsupported')
    expect(queryProblem('22:not-a-coordinate')?.kind).toBe('invalid')
  })

  test('preserves exact BED bounds and converts them without changing span', () => {
    const region = asset.regions.find((candidate) =>
      candidate.categories.includes('false-duplication-correct-copy')
    )!
    const evidence = region.evidence.find(
      (candidate) => candidate.sourceId === 'false-duplication-correct-copy'
    )!
    expect(evidence).toEqual({
      sourceId: 'false-duplication-correct-copy',
      start0: 18774319,
      end0: 18939751,
    })
    expect(sourceIntervalLabel(evidence)).toBe('22:18,774,320–18,939,751')
    expect(evidence.end0 - evidence.start0).toBe(evidence.end0 - (evidence.start0 + 1) + 1)
  })

  test('generates full-component long-read summary URLs for every row', () => {
    asset.regions.forEach((region) => {
      const lrUrl = longReadSummaryUrl(region)
      expect(lrUrl).toContain(`/region/22-${region.start}-${region.stop}?`)
      expect(lrUrl).toContain('dataset=gnomad_r4_lr')
      expect(lrUrl).toContain('lr_cohort=hgsvc_hprc')
      expect(lrUrl).not.toContain('show_haplotypes')
      expect(lrUrl).not.toContain('dataset=gnomad_r4&')
    })
  })

  test('fails closed on an invalid asset', () => {
    expect(() => assertContextAsset({ ...asset, regions: asset.regions.slice(1) })).toThrow(
      /header or expected counts/
    )
  })
})

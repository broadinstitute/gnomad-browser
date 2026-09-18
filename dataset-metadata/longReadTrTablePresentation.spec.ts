import { parseTrLocusId, trLocusUrl } from './longReadTrLocusId'
import { getTrLocusRowDisplay } from './longReadTrLocusPresentation'
import { getTrLocusTableDisplay } from './longReadTrTablePresentation'

describe('TR table-only presentation', () => {
  test('uses the one-based component envelope, not source REF span', () => {
    const locus = parseTrLocusId('chr22-100-130-CAG')!
    const fullDisplay = getTrLocusRowDisplay({ locus })
    expect(getTrLocusTableDisplay(locus)).toMatchObject({
      canonicalId: '22-100-130-CAG',
      fullLabel: '22-101-130-TR',
      compactLabel: '22-101-130-TR',
      orderedComponentCount: 1,
      storedMotifs: { label: 'Stored: CAG', motifs: ['CAG'] },
    })
    expect(getTrLocusRowDisplay({ locus })).toEqual(fullDisplay)
    // The retained compact helper is one-based; active descriptive rows use
    // upstream's zero-based interval and explicit reference-region width.
    expect(fullDisplay.label).toBe('22:100–130 TR locus (30bp): 10 x CAG')
  })

  test('retains unsorted tuples, duplicate components, gaps, overlaps, and exact route', () => {
    const locus = parseTrLocusId(
      '4-200-230-CCG+4-100-140-CAG+4-120-150-CCG+4-300-310-AGC+4-320-350-CTG'
    )!
    const original = JSON.stringify(locus)
    const route = trLocusUrl(locus, 'aou', 'source~2')
    const display = getTrLocusTableDisplay(locus)
    expect(display.compactLabel).toBe('4-101-350-TR')
    expect(display.storedMotifs.motifs).toEqual(['CCG', 'CAG', 'AGC', 'CTG'])
    expect(display.orderedComponentCount).toBe(5)
    expect(display.canonicalId).toBe(locus.canonicalId)
    expect(JSON.stringify(locus)).toBe(original)
    expect(trLocusUrl(locus, 'aou', 'source~2')).toBe(route)
    expect(route).toContain(
      `/${locus.canonicalId}?dataset=gnomad_r4_lr&lr_cohort=aou&allele=source%7E2`
    )
    expect(getTrLocusRowDisplay({ locus }).kind).toBe('variation-cluster')
  })

  test('bounds a long safe-integer envelope while retaining its full copy', () => {
    const locus = parseTrLocusId('22-9007199254740900-9007199254740991-CAG')!
    const display = getTrLocusTableDisplay(locus)
    expect(display.fullLabel).toBe('22-9007199254740901-9007199254740991-TR')
    expect(display.compactLabel.length).toBeLessThanOrEqual(40)
  })

  test('HTT has six components but only five stored distinct strings', () => {
    const locus = parseTrLocusId(
      '4-100-110-CAG+4-110-120-CAA+4-120-130-CCG+4-130-140-CCT+4-140-150-CCG+4-150-160-GCC'
    )!
    const display = getTrLocusTableDisplay(locus)
    expect(display.storedMotifs.label).toBe('Stored: CAG, CAA, CCG, CCT, GCC')
    expect(display.storedMotifs.omittedCount).toBe(0)
    expect(display.orderedComponentCount).toBe(6)
    expect(locus.components).toHaveLength(6)
  })
})

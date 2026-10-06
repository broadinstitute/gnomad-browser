import { parseTrLocusId } from './longReadTrLocusId'
import { getTrLocusRowDisplay, TrLocusBoundsContract } from './longReadTrLocusPresentation'

const contractsFor = (id: string) => {
  const locus = parseTrLocusId(id)!
  const start0 = Math.min(...locus.components.map((component) => component.start0))
  const end0 = Math.max(...locus.components.map((component) => component.end0))
  return {
    locus,
    bounds: {
      component_envelope_start0: start0,
      component_envelope_end0: end0,
      component_envelope_length_bp: end0 - start0,
      component_envelope_basis: 'EXACT_ORDERED_COMPONENTS',
      source_ref_span_start0: null,
      source_ref_span_end0: null,
      source_ref_span_status: 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT',
    } as TrLocusBoundsContract,
  }
}

const multiComponentId = (count: number, motifCount: number) =>
  Array.from({ length: count }, (_, index) => {
    const motifs = ['A', 'C', 'G', 'T', 'AC', 'GT', 'CAG']
    const start = 100 + index * 3
    return `3-${start}-${start + 2}-${motifs[index % motifCount]}`
  }).join('+')

describe('bounded tandem-repeat locus row presentation', () => {
  test('labels a simple repeat with its reference width and exact interval', () => {
    const input = contractsFor('1-143278475-143278486-T')
    expect(getTrLocusRowDisplay(input)).toEqual({
      kind: 'simple',
      label: '1:143278475–143278486 TR locus (11bp): T x 11',
      intervalLabel: 'GRCh38 exact component interval 1:[143,278,475, 143,278,486) · 11 bp',
      summaryLabel: '1 component / 1 distinct stored motif',
      detailsAccessibleLabel:
        'Details for 1:143278475–143278486 TR locus (11bp): T x 11. GRCh38 exact component interval 1:[143,278,475, 143,278,486) · 11 bp. 1 component / 1 distinct stored motif.',
    })
  })

  test.each([
    [24, 7],
    [103, 7],
    [180, 7],
  ])('describes %i components as a bounded variation cluster', (componentCount, motifCount) => {
    const id = multiComponentId(componentCount, motifCount)
    const display = getTrLocusRowDisplay(contractsFor(id))
    expect(display.kind).toBe('variation-cluster')
    expect(display.label).toMatch(
      new RegExp(
        `^3:\\d+–\\d+ TR variation cluster \\(\\d+bp\\): spans ${componentCount} TRs with `
      )
    )
    expect(display.label).not.toContain(id)
    expect(display.detailsAccessibleLabel).not.toContain(id)
    expect(display.label.length).toBeLessThan(130)
  })

  test('treats a record that varies beyond its repeat as a variation cluster', () => {
    // chr4-3094523-TRV-164: a 9 bp GGC repeat inside a record varying over 3094523-3094687.
    const display = getTrLocusRowDisplay({
      ...contractsFor('4-3094523-3094532-GGC'),
      sourceRecordSpan: { start0: 3094523, end0: 3094687 },
    })
    expect(display.kind).toBe('variation-cluster')
    expect(display.label).toBe(
      '4:3094523–3094687 TR variation cluster (164bp): spans 1 TR with a GGC motif'
    )
  })

  test('names a long cluster motif by size without repeating the word motif', () => {
    const longMotif = 'CCACGCCCCCGCATCGCCACGCCCCCGCATCGCC'
    const display = getTrLocusRowDisplay({
      ...contractsFor(`4-3227300-3227334-${longMotif}`),
      sourceRecordSpan: { start0: 3227238, end0: 3227843 },
    })
    expect(display.label).toBe(
      '4:3227238–3227843 TR variation cluster (605bp): spans 1 TR with a 34bp motif'
    )
    expect(getTrLocusRowDisplay(contractsFor(`3-100-102-AC+3-102-136-${longMotif}`)).label).toMatch(
      /spans 2 TRs with AC and 34bp motifs$/
    )
  })

  test('prefers the bounds contract reference span over the derived one', () => {
    const input = contractsFor('4-3094523-3094532-GGC')
    const display = getTrLocusRowDisplay({
      ...input,
      bounds: {
        ...input.bounds,
        source_ref_span_start0: 3094523,
        source_ref_span_end0: 3094600,
        source_ref_span_status: 'AVAILABLE_EXACT',
      },
      sourceRecordSpan: { start0: 3094523, end0: 3094687 },
    })
    expect(display.label).toContain('4:3094523–3094600 TR variation cluster (77bp)')
  })

  test('leaves a record that varies only over its repeat as a plain locus', () => {
    // chr4-3068956-TRV-9: the record's post-anchor span equals the repeat envelope.
    const display = getTrLocusRowDisplay({
      ...contractsFor('4-3068956-3068965-TG'),
      sourceRecordSpan: { start0: 3068956, end0: 3068965 },
    })
    expect(display.kind).toBe('simple')
    expect(display.label).toBe('4:3068956–3068965 TR locus (9bp): TG x 4.5')
  })

  test('names a long motif by size rather than printing the stored sequence', () => {
    const motif = 'A'.repeat(500)
    const input = contractsFor(`1-100-600-${motif}`)
    const display = getTrLocusRowDisplay(input)
    expect(input.locus.components[0].motif).toBe(motif)
    expect(input.locus.canonicalId).toContain(motif)
    expect(display.label).toBe('1:100–600 TR locus (500bp): long motif (500bp motif) x 1')
    expect(display.label).not.toContain(motif)
    expect(display.detailsAccessibleLabel).not.toContain(motif)
    expect(display.label.length).toBeLessThan(130)
    expect(display.detailsAccessibleLabel.length).toBeLessThan(300)
  })

  test('omits the motif size for motifs shorter than 7 bp', () => {
    expect(getTrLocusRowDisplay(contractsFor('4-3208719-3208734-A')).label).toBe(
      '4:3208719–3208734 TR locus (15bp): A x 15'
    )
    expect(getTrLocusRowDisplay(contractsFor('4-3074307-3074341-CCACGCCCCCGCATCG')).label).toBe(
      '4:3074307–3074341 TR locus (34bp): CCACGCCCCCGCATCG (16bp motif) x 2.1'
    )
  })
})

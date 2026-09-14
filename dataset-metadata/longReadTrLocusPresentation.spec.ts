import { parseTrLocusId } from './longReadTrLocusId'
import {
  getTrLocusRowDisplay,
  TrLocusBoundsContract,
  TrLocusComponentSummaryContract,
  TrLocusPresentationContract,
} from './longReadTrLocusPresentation'

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
      variation_cluster_status: 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION',
    } as TrLocusBoundsContract,
    componentSummary: {
      ordered_component_count: locus.components.length,
      distinct_stored_motif_count: new Set(locus.components.map((component) => component.motif))
        .size,
    } as TrLocusComponentSummaryContract,
  }
}

const multiComponentId = (count: number, motifCount: number) =>
  Array.from({ length: count }, (_, index) => {
    const motifs = ['A', 'C', 'G', 'T', 'AC', 'GT', 'CAG']
    const start = 100 + index * 3
    return `3-${start}-${start + 2}-${motifs[index % motifCount]}`
  }).join('+')

const canonicalDigest = 'a'.repeat(64)

const fallbackPresentation: TrLocusPresentationContract = {
  source_representation_kind: 'UNKNOWN',
  presentation_layout: 'CLUSTER_FOCUSED',
  presentation_reason: 'MULTI_COMPONENT_FALLBACK',
  classification_source: null,
  classification_release: null,
  classification_digest: null,
  reviewed_override_digest: null,
}

describe('bounded tandem-repeat locus row presentation', () => {
  test('labels a simple repeat and states its exact zero-based half-open interval', () => {
    const input = contractsFor('1-143278475-143278486-T')
    expect(getTrLocusRowDisplay(input)).toEqual({
      kind: 'simple',
      label: '1:143278475–143278486 TR locus (11bp): 11 x T',
      intervalLabel: 'GRCh38 exact component interval 1:[143,278,475, 143,278,486) · 11 bp',
      summaryLabel: '1 component / 1 distinct stored motif',
      detailsAccessibleLabel:
        'Details for 1:143278475–143278486 TR locus (11bp): 11 x T. GRCh38 exact component interval 1:[143,278,475, 143,278,486) · 11 bp. 1 component / 1 distinct stored motif.',
    })
  })

  test.each([
    [24, 7],
    [103, 7],
    [180, 7],
  ])('uses a concise neutral fallback for %i components', (componentCount, motifCount) => {
    const id = multiComponentId(componentCount, motifCount)
    const display = getTrLocusRowDisplay({
      ...contractsFor(id),
      presentation: fallbackPresentation,
    })
    expect(display.kind).toBe('multi-component')
    expect(display.label).toMatch(
      new RegExp(
        `^3:\\d+–\\d+ TR variation cluster \\(\\d+bp\\): spans ${componentCount} TRs with `
      )
    )
    expect(display.label).not.toContain(id)
    expect(display.detailsAccessibleLabel).not.toContain(id)
    expect(display.label.length).toBeLessThan(130)
  })

  test('admits reviewed-primary wording only with a matching contract and override receipt', () => {
    const input = contractsFor(multiComponentId(24, 7))
    const display = getTrLocusRowDisplay({
      ...input,
      reviewedPrimaryLabel: 'HTT CAG',
      presentation: {
        ...fallbackPresentation,
        presentation_layout: 'REPEAT_FOCUSED',
        presentation_reason: 'REVIEWED_PRIMARY_REPEAT',
        reviewed_override_digest: canonicalDigest,
      },
    })
    expect(display.kind).toBe('reviewed-primary')
    expect(display.label).toBe('HTT CAG tandem repeat · 24 source components')
  })

  test('fails reviewed-primary wording closed without an explicit source-backed label', () => {
    const input = contractsFor(multiComponentId(24, 7))
    const display = getTrLocusRowDisplay({
      ...input,
      presentation: {
        ...fallbackPresentation,
        presentation_layout: 'REPEAT_FOCUSED',
        presentation_reason: 'REVIEWED_PRIMARY_REPEAT',
        reviewed_override_digest: canonicalDigest,
      },
    })
    expect(display.kind).toBe('multi-component')
    expect(display.label).toMatch(/^3:\d+–\d+ TR variation cluster \(\d+bp\): spans 24 TRs with /)
    expect(display.label).not.toContain('HTT CAG')
  })

  test('uses source variation-cluster bounds only with classification provenance', () => {
    const input = contractsFor(multiComponentId(24, 7))
    const display = getTrLocusRowDisplay({
      ...input,
      bounds: {
        ...input.bounds,
        variation_cluster_start0: 90,
        variation_cluster_end0: 180,
        variation_cluster_length_bp: 90,
        variation_cluster_status: 'AVAILABLE_EXACT',
        bounds_source: 'source catalog',
        bounds_release: 'v1',
        bounds_digest: 'b'.repeat(64),
      },
      presentation: {
        ...fallbackPresentation,
        source_representation_kind: 'VARIATION_CLUSTER',
        presentation_reason: 'SOURCE_VARIATION_CLUSTER',
        classification_source: 'source catalog',
        classification_release: 'v1',
        classification_digest: canonicalDigest,
      },
    })
    expect(display.kind).toBe('variation-cluster')
    expect(display.label).toContain(
      '3:90–180 TR variation cluster (90bp): spans 24 TRs with A, C, and other motifs'
    )
    expect(display.intervalLabel).toBe(
      'GRCh38 source variation-cluster interval 3:[90, 180) · 90 bp'
    )
  })

  test('treats a record that varies beyond its repeat as a variation cluster', () => {
    // chr4-3094523-TRV-164: a 9 bp GGC repeat inside a record varying over 3094523-3094687.
    const input = contractsFor('4-3094523-3094532-GGC')
    const display = getTrLocusRowDisplay({
      ...input,
      sourceRecordSpan: { start0: 3094523, end0: 3094687 },
    })
    expect(display.kind).toBe('variation-cluster')
    expect(display.label).toBe(
      '4:3094523–3094687 TR variation cluster (164bp): spans 1 TR with a GGC motif'
    )
  })

  test('leaves a record that varies only over its repeat as a plain locus', () => {
    // chr4-3068956-TRV-9: the record's post-anchor span equals the repeat envelope.
    const input = contractsFor('4-3068956-3068965-TG')
    const display = getTrLocusRowDisplay({
      ...input,
      sourceRecordSpan: { start0: 3068956, end0: 3068965 },
    })
    expect(display.kind).toBe('simple')
    expect(display.label).toBe('4:3068956–3068965 TR locus (9bp): 4.5 x TG')
  })

  test('uses a bounded semantic label for a long motif while preserving exact identity', () => {
    const motif = 'A'.repeat(500)
    const input = contractsFor(`1-100-600-${motif}`)
    const display = getTrLocusRowDisplay(input)
    expect(input.locus.components[0].motif).toBe(motif)
    expect(input.locus.canonicalId).toContain(motif)
    expect(display.label).toBe('1:100–600 TR locus (500bp): 1 x long motif (500bp motif)')
    expect(display.label).not.toContain(motif)
    expect(display.detailsAccessibleLabel).toContain('1 x long motif (500bp motif)')
    expect(display.detailsAccessibleLabel).not.toContain(motif)
    expect(display.detailsAccessibleLabel).not.toMatch(/\b(?:null|undefined)\b/i)
    expect(display.label.length).toBeLessThan(130)
    expect(display.detailsAccessibleLabel.length).toBeLessThan(300)
  })

  test.each([
    ['prefixed', `sha256:${canonicalDigest}`],
    ['uppercase', 'A'.repeat(64)],
    ['truncated', 'a'.repeat(63)],
    ['non-hex', 'g'.repeat(64)],
    ['whitespace-only', '   '],
    ['leading whitespace', ` ${canonicalDigest}`],
    ['trailing whitespace', `${canonicalDigest} `],
  ])('fails positive wording closed for a %s digest', (_case, invalidDigest) => {
    const input = contractsFor(multiComponentId(24, 7))
    const classificationDisplay = getTrLocusRowDisplay({
      ...input,
      presentation: {
        ...fallbackPresentation,
        source_representation_kind: 'VARIATION_CLUSTER',
        presentation_reason: 'SOURCE_VARIATION_CLUSTER',
        classification_source: 'source catalog',
        classification_release: 'v1',
        classification_digest: invalidDigest,
      },
    })
    const reviewedDisplay = getTrLocusRowDisplay({
      ...input,
      reviewedPrimaryLabel: 'HTT CAG',
      presentation: {
        ...fallbackPresentation,
        presentation_layout: 'REPEAT_FOCUSED',
        presentation_reason: 'REVIEWED_PRIMARY_REPEAT',
        reviewed_override_digest: invalidDigest,
      },
    })

    expect(classificationDisplay.kind).toBe('multi-component')
    expect(classificationDisplay.label).toContain('3:100–171')
    expect(classificationDisplay.label).not.toContain('3:90–180')
    expect(reviewedDisplay.kind).toBe('multi-component')
    expect(reviewedDisplay.label).not.toContain('HTT CAG')
  })

  test('fails positive scientific wording closed when summary does not match canonical identity', () => {
    const input = contractsFor(multiComponentId(24, 7))
    const display = getTrLocusRowDisplay({
      ...input,
      componentSummary: { ...input.componentSummary, ordered_component_count: 23 },
      presentation: {
        ...fallbackPresentation,
        source_representation_kind: 'VARIATION_CLUSTER',
        presentation_reason: 'SOURCE_VARIATION_CLUSTER',
        classification_source: 'source catalog',
        classification_release: 'v1',
        classification_digest: canonicalDigest,
      },
    })
    expect(display.kind).toBe('multi-component')
    expect(display.label).toMatch(/^3:\d+–\d+ TR variation cluster \(\d+bp\): spans /)
  })
})

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
      label: 'T tandem repeat · 1:143,278,476–143,278,486',
      intervalLabel: 'GRCh38 exact component interval 1:[143,278,475, 143,278,486) · 11 bp',
      summaryLabel: '1 component / 1 distinct stored motif',
      detailsAccessibleLabel:
        'Details for T tandem repeat · 1:143,278,476–143,278,486. GRCh38 exact component interval 1:[143,278,475, 143,278,486) · 11 bp. 1 component / 1 distinct stored motif.',
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
        `^Multi-component TR locus · ${componentCount} components / ${motifCount} motifs · 3:`
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
        reviewed_override_digest: 'sha256:reviewed',
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
        reviewed_override_digest: 'sha256:reviewed',
      },
    })
    expect(display.kind).toBe('multi-component')
    expect(display.label).toMatch(/^Multi-component TR locus/)
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
        bounds_digest: 'sha256:bounds',
      },
      presentation: {
        ...fallbackPresentation,
        source_representation_kind: 'VARIATION_CLUSTER',
        presentation_reason: 'SOURCE_VARIATION_CLUSTER',
        classification_source: 'source catalog',
        classification_release: 'v1',
        classification_digest: 'sha256:classification',
      },
    })
    expect(display.kind).toBe('variation-cluster')
    expect(display.label).toContain('Variation cluster · 24 components / 7 motifs · 3:91–180')
    expect(display.intervalLabel).toBe(
      'GRCh38 source variation-cluster interval 3:[90, 180) · 90 bp'
    )
  })

  test('bounds the routine accessible name while retaining a long stored motif visibly', () => {
    const motif = 'A'.repeat(500)
    const display = getTrLocusRowDisplay(contractsFor(`1-100-600-${motif}`))
    expect(display.label).toContain(motif)
    expect(display.detailsAccessibleLabel).not.toContain(motif)
    expect(display.detailsAccessibleLabel.length).toBeLessThan(300)
  })

  test('treats whitespace-only provenance as missing', () => {
    const input = contractsFor(multiComponentId(24, 7))
    const display = getTrLocusRowDisplay({
      ...input,
      presentation: {
        ...fallbackPresentation,
        source_representation_kind: 'VARIATION_CLUSTER',
        presentation_reason: 'SOURCE_VARIATION_CLUSTER',
        classification_source: 'source catalog',
        classification_release: 'v1',
        classification_digest: '   ',
      },
    })
    expect(display.kind).toBe('multi-component')
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
        classification_digest: 'sha256:classification',
      },
    })
    expect(display.kind).toBe('multi-component')
    expect(display.label).toMatch(/^Multi-component TR locus/)
  })
})

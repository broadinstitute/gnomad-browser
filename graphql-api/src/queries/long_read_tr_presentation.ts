type TrLocusComponent = { chrom: string; start0: number; end0: number; motif: string }

export const buildLongReadTrComponentContract = (components: TrLocusComponent[]) => {
  if (!components.length) throw new Error('TR_LOCUS_INVARIANT')
  let envelopeStart0 = components[0].start0
  let envelopeEnd0 = components[0].end0
  const motifs = new Set<string>()
  components.forEach((component) => {
    if (
      !Number.isInteger(component.start0) ||
      !Number.isInteger(component.end0) ||
      component.end0 < component.start0 ||
      component.chrom !== components[0].chrom
    ) {
      throw new Error('TR_LOCUS_INVARIANT')
    }
    envelopeStart0 = Math.min(envelopeStart0, component.start0)
    envelopeEnd0 = Math.max(envelopeEnd0, component.end0)
    motifs.add(component.motif)
  })
  return {
    bounds: {
      component_envelope_start0: envelopeStart0,
      component_envelope_end0: envelopeEnd0,
      component_envelope_length_bp: envelopeEnd0 - envelopeStart0,
      component_envelope_basis: 'EXACT_ORDERED_COMPONENTS',
      source_ref_span_start0: null,
      source_ref_span_end0: null,
      source_ref_span_status: 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT',
      variation_cluster_start0: null,
      variation_cluster_end0: null,
      variation_cluster_length_bp: null,
      variation_cluster_status: 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION',
      bounds_source: null,
      bounds_release: null,
      bounds_digest: null,
    },
    component_summary: {
      ordered_component_count: components.length,
      distinct_stored_motif_count: motifs.size,
    },
  }
}

export const buildLongReadTrPresentation = (orderedComponentCount: number) => {
  if (!Number.isInteger(orderedComponentCount) || orderedComponentCount < 1) {
    throw new Error('TR_LOCUS_INVARIANT')
  }
  return orderedComponentCount === 1
    ? {
        source_representation_kind: 'UNKNOWN',
        presentation_layout: 'REPEAT_FOCUSED',
        presentation_reason: 'SOLE_EXACT_COMPONENT',
        classification_source: null,
        classification_release: null,
        classification_digest: null,
        reviewed_override_digest: null,
      }
    : {
        source_representation_kind: 'UNKNOWN',
        presentation_layout: 'CLUSTER_FOCUSED',
        presentation_reason: 'MULTI_COMPONENT_FALLBACK',
        classification_source: null,
        classification_release: null,
        classification_digest: null,
        reviewed_override_digest: null,
      }
}

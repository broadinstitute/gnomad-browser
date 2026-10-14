type TrLocusComponent = { chrom: string; start0: number; end0: number; motif: string }
type SourceRefSpan = { start0: number; end0: number }

/**
 * Zero-based half-open interval of a locus's single source VCF record, excluding its padding
 * base. POS is the one-based padding base, so the first base after it is POS in zero-based
 * coordinates, and the REF covers REF length - 1 bases from there. This is the same span the
 * gene table derives from each record's pos and end. A locus with several source records has no
 * single span.
 */
export const sourceRefSpanOfSingleRecord = (
  records: { position: number; refAlleleLength: number }[]
): SourceRefSpan | null => {
  if (records.length !== 1) return null
  const { position, refAlleleLength } = records[0]
  if (!Number.isSafeInteger(position) || !Number.isSafeInteger(refAlleleLength)) return null
  if (refAlleleLength < 1) return null
  return { start0: position, end0: position + refAlleleLength - 1 }
}

export const buildLongReadTrComponentContract = (
  components: TrLocusComponent[],
  sourceRefSpan: SourceRefSpan | null = null
) => {
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
      source_ref_span_start0: sourceRefSpan ? sourceRefSpan.start0 : null,
      source_ref_span_end0: sourceRefSpan ? sourceRefSpan.end0 : null,
      source_ref_span_status: sourceRefSpan
        ? 'AVAILABLE_EXACT'
        : 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT',
    },
    component_summary: {
      ordered_component_count: components.length,
      distinct_stored_motif_count: motifs.size,
    },
  }
}

/**
 * A locus is a variation cluster when it has more than one component, or when its source
 * record's REF reaches beyond its components. The catalog genotyped some clusters under the id
 * of their main repeat, so their single component is only part of what the record measures.
 * This is the gene table's rule in getTrLocusRowDisplay, so both name a locus the same way.
 */
export const buildLongReadTrPresentation = (
  orderedComponentCount: number,
  bounds: ReturnType<typeof buildLongReadTrComponentContract>['bounds'] | null = null
) => {
  if (!Number.isInteger(orderedComponentCount) || orderedComponentCount < 1) {
    throw new Error('TR_LOCUS_INVARIANT')
  }
  const sourceRefSpanReachesBeyondComponents =
    bounds != null &&
    bounds.source_ref_span_start0 != null &&
    bounds.source_ref_span_end0 != null &&
    bounds.source_ref_span_end0 - bounds.source_ref_span_start0 >
      bounds.component_envelope_length_bp
  return orderedComponentCount === 1 && !sourceRefSpanReachesBeyondComponents
    ? { locus_type: 'ISOLATED_REPEAT' }
    : { locus_type: 'VARIATION_CLUSTER' }
}

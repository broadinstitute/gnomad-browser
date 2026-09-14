import { TrLocusId, trLocusDisplayEnvelope } from './longReadTrLocusId'

export type TrLocusPresentationContract = {
  locus_type: 'ISOLATED_REPEAT' | 'VARIATION_CLUSTER'
}

export type TrLocusBoundsContract = {
  component_envelope_start0: number
  component_envelope_end0: number
  component_envelope_length_bp: number
  component_envelope_basis?: 'EXACT_ORDERED_COMPONENTS' | null
  source_ref_span_start0?: number | null
  source_ref_span_end0?: number | null
  source_ref_span_status?: 'AVAILABLE_EXACT' | 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT' | null
}

export type TrLocusComponentSummaryContract = {
  ordered_component_count: number
  distinct_stored_motif_count: number
}

export type TrLocusRowKind = 'simple' | 'variation-cluster'

export type TrLocusRowDisplay = {
  kind: TrLocusRowKind
  label: string
  intervalLabel: string
  summaryLabel: string
  detailsAccessibleLabel: string
}

const simpleMotifContext = (motif: string) => (motif.length <= 80 ? motif : 'long motif')

// Motifs named inline stay short so a row cannot grow with the stored sequence.
const boundedMotif = (motif: string) => (motif.length <= 20 ? motif : `${motif.length}bp motif`)

// Distinct stored motifs, shortest first and alphabetical within a length. At most two are
// named; the rest are summarized so the row stays bounded no matter how many components a
// cluster spans.
const motifPhrase = (motifs: string[]) => {
  const distinct = Array.from(new Set(motifs)).sort((a, b) =>
    a.length === b.length ? a.localeCompare(b) : a.length - b.length
  )
  if (distinct.length === 0) return 'no stored motifs'
  if (distinct.length === 1) return `a ${boundedMotif(distinct[0])} motif`
  if (distinct.length === 2) {
    return `${boundedMotif(distinct[0])} and ${boundedMotif(distinct[1])} motifs`
  }
  return `${boundedMotif(distinct[0])}, ${boundedMotif(distinct[1])}, and other motifs`
}

// Repeat copies implied by the exact component envelope. Envelopes that are not a whole
// multiple of the motif keep one decimal rather than rounding to a count the coordinates
// do not support.
const repeatCopyText = (lengthBp: number, motifLength: number) => {
  if (motifLength <= 0) return null
  const copies = lengthBp / motifLength
  return Number.isInteger(copies) ? String(copies) : copies.toFixed(1)
}

// Zero-based half-open bounds, matching the canonical locus id rather than 1-based display.
const formatPlainInterval = (chrom: string, start0: number, end0: number) =>
  `${chrom}:${start0}–${end0}`

const exactComponentFacts = (locus: TrLocusId) => {
  const envelope = trLocusDisplayEnvelope(locus)
  const start0 = envelope.start1 - 1
  const end0 = envelope.end1
  return {
    start0,
    end0,
    length: end0 - start0,
    componentCount: locus.components.length,
    motifCount: new Set(locus.components.map((component) => component.motif)).size,
  }
}

/**
 * Build bounded row copy without changing locus identity. A locus reads as a variation cluster
 * when its source record varies beyond the repeat, or when it holds more than one component.
 */
export const getTrLocusRowDisplay = ({
  locus,
  bounds,
  sourceRecordSpan,
}: {
  locus: TrLocusId
  bounds?: TrLocusBoundsContract | null
  /** Zero-based half-open span of the source VCF record, excluding its anchor base. */
  sourceRecordSpan?: { start0: number; end0: number } | null
}): TrLocusRowDisplay => {
  const facts = exactComponentFacts(locus)

  // A source record that varies beyond its repeat is a variation cluster: the repeat is only
  // part of what the record changes, so the record's span is the interval worth showing.
  // The bounds contract carries this span, but is currently unpopulated, so fall back to the
  // span derived from the source records themselves.
  const contractRefSpan =
    bounds?.source_ref_span_status === 'AVAILABLE_EXACT' &&
    Number.isSafeInteger(bounds.source_ref_span_start0) &&
    Number.isSafeInteger(bounds.source_ref_span_end0)
      ? { start0: bounds.source_ref_span_start0!, end0: bounds.source_ref_span_end0! }
      : null
  const refSpan =
    contractRefSpan ||
    (sourceRecordSpan &&
    Number.isSafeInteger(sourceRecordSpan.start0) &&
    Number.isSafeInteger(sourceRecordSpan.end0)
      ? sourceRecordSpan
      : null)
  const recordSpansBeyondRepeat = Boolean(refSpan && refSpan.end0 - refSpan.start0 > facts.length)

  const kind: TrLocusRowKind =
    !recordSpansBeyondRepeat && facts.componentCount === 1 ? 'simple' : 'variation-cluster'

  const componentSummaryText = `${facts.componentCount.toLocaleString('en-US')} component${
    facts.componentCount === 1 ? '' : 's'
  } / ${facts.motifCount.toLocaleString('en-US')} distinct stored motif${
    facts.motifCount === 1 ? '' : 's'
  }`

  let label: string
  if (kind === 'simple') {
    const motif = locus.components[0].motif
    const copyText = repeatCopyText(facts.length, motif.length)
    const plainEnvelope = formatPlainInterval(locus.components[0].chrom, facts.start0, facts.end0)
    const motifSize = motif.length >= 7 ? ` (${motif.length}bp motif)` : ''
    label = `${plainEnvelope} TR locus (${facts.length}bp): ${
      copyText ? `${copyText} x ` : ''
    }${simpleMotifContext(motif)}${motifSize}`
  } else {
    const recordSpan = recordSpansBeyondRepeat ? refSpan : null
    const clusterStart0 = recordSpan?.start0
    const clusterEnd0 = recordSpan?.end0
    const clusterEnvelope = formatPlainInterval(
      locus.components[0].chrom,
      clusterStart0 ?? facts.start0,
      clusterEnd0 ?? facts.end0
    )
    const clusterLength = (clusterEnd0 ?? facts.end0) - (clusterStart0 ?? facts.start0)
    label = `${clusterEnvelope} TR variation cluster (${clusterLength}bp): spans ${facts.componentCount.toLocaleString(
      'en-US'
    )} TR${facts.componentCount === 1 ? '' : 's'} with ${motifPhrase(
      locus.components.map((component) => component.motif)
    )}`
  }

  const accessibleLabel = label

  const interval = facts
  const intervalKind = facts.componentCount === 1 ? 'exact component interval' : 'component envelope'
  const intervalLabel = `GRCh38 ${intervalKind} ${
    locus.components[0].chrom
  }:[${interval.start0.toLocaleString('en-US')}, ${interval.end0.toLocaleString(
    'en-US'
  )}) · ${interval.length.toLocaleString('en-US')} bp`

  return {
    kind,
    label,
    intervalLabel,
    summaryLabel: componentSummaryText,
    detailsAccessibleLabel: `Details for ${accessibleLabel}. ${intervalLabel}. ${componentSummaryText}.`,
  }
}

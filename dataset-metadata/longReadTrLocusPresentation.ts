import { TrLocusId, trLocusDisplayEnvelope } from './longReadTrLocusId'

export type TrLocusPresentationContract = {
  source_representation_kind: 'STANDALONE_TR' | 'VARIATION_CLUSTER' | 'UNKNOWN'
  presentation_layout: 'REPEAT_FOCUSED' | 'CLUSTER_FOCUSED'
  presentation_reason:
    | 'SOLE_EXACT_COMPONENT'
    | 'REVIEWED_PRIMARY_REPEAT'
    | 'SOURCE_VARIATION_CLUSTER'
    | 'MULTI_COMPONENT_FALLBACK'
  classification_source?: string | null
  classification_release?: string | null
  classification_digest?: string | null
  reviewed_override_digest?: string | null
}

export type TrLocusBoundsContract = {
  component_envelope_start0: number
  component_envelope_end0: number
  component_envelope_length_bp: number
  component_envelope_basis?: 'EXACT_ORDERED_COMPONENTS' | null
  variation_cluster_start0?: number | null
  variation_cluster_end0?: number | null
  variation_cluster_length_bp?: number | null
  variation_cluster_status?: 'AVAILABLE_EXACT' | 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION' | null
  bounds_source?: string | null
  bounds_release?: string | null
  bounds_digest?: string | null
}

export type TrLocusComponentSummaryContract = {
  ordered_component_count: number
  distinct_stored_motif_count: number
}

export type TrLocusRowKind = 'simple' | 'reviewed-primary' | 'variation-cluster' | 'multi-component'

export type TrLocusRowDisplay = {
  kind: TrLocusRowKind
  label: string
  intervalLabel: string
  summaryLabel: string
  detailsAccessibleLabel: string
}

const boundedContext = (value?: string | null) => {
  const normalized = value?.trim().replace(/\s+/g, ' ')
  if (!normalized) return null
  return normalized.length <= 80 ? normalized : `${normalized.slice(0, 79)}…`
}

const hasText = (value?: string | null): value is string =>
  typeof value === 'string' && value.trim().length > 0

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

const contractMatchesIdentity = (
  facts: ReturnType<typeof exactComponentFacts>,
  bounds?: TrLocusBoundsContract | null,
  summary?: TrLocusComponentSummaryContract | null
) =>
  Boolean(
    bounds &&
      summary &&
      bounds.component_envelope_basis === 'EXACT_ORDERED_COMPONENTS' &&
      bounds.component_envelope_start0 === facts.start0 &&
      bounds.component_envelope_end0 === facts.end0 &&
      bounds.component_envelope_length_bp === facts.length &&
      summary.ordered_component_count === facts.componentCount &&
      summary.distinct_stored_motif_count === facts.motifCount
  )

const hasReviewedPrimaryReceipt = (presentation?: TrLocusPresentationContract | null) =>
  Boolean(
    presentation?.presentation_layout === 'REPEAT_FOCUSED' &&
      presentation.presentation_reason === 'REVIEWED_PRIMARY_REPEAT' &&
      hasText(presentation.reviewed_override_digest)
  )

const hasSourceVariationClusterReceipt = (presentation?: TrLocusPresentationContract | null) =>
  Boolean(
    presentation?.source_representation_kind === 'VARIATION_CLUSTER' &&
      presentation.presentation_layout === 'CLUSTER_FOCUSED' &&
      presentation.presentation_reason === 'SOURCE_VARIATION_CLUSTER' &&
      hasText(presentation.classification_source) &&
      hasText(presentation.classification_release) &&
      hasText(presentation.classification_digest)
  )

const exactVariationClusterBounds = (bounds?: TrLocusBoundsContract | null) => {
  if (
    bounds?.variation_cluster_status !== 'AVAILABLE_EXACT' ||
    !hasText(bounds.bounds_source) ||
    !hasText(bounds.bounds_release) ||
    !hasText(bounds.bounds_digest) ||
    !Number.isSafeInteger(bounds.variation_cluster_start0) ||
    !Number.isSafeInteger(bounds.variation_cluster_end0) ||
    !Number.isSafeInteger(bounds.variation_cluster_length_bp) ||
    bounds.variation_cluster_start0! < 0 ||
    bounds.variation_cluster_end0! <= bounds.variation_cluster_start0! ||
    bounds.variation_cluster_length_bp !==
      bounds.variation_cluster_end0! - bounds.variation_cluster_start0!
  ) {
    return null
  }
  return {
    start0: bounds.variation_cluster_start0!,
    end0: bounds.variation_cluster_end0!,
    length: bounds.variation_cluster_length_bp!,
  }
}

const formatDisplayInterval = (chrom: string, start0: number, end0: number) =>
  `${chrom}:${(start0 + 1).toLocaleString('en-US')}–${end0.toLocaleString('en-US')}`

/**
 * Build bounded row copy from the presentation contract without changing locus identity.
 * Positive variation-cluster and reviewed-primary language requires its corresponding
 * receipt. Component count can select only the neutral fallback, never scientific kind.
 */
export const getTrLocusRowDisplay = ({
  locus,
  presentation,
  bounds,
  componentSummary,
  reviewedPrimaryLabel,
}: {
  locus: TrLocusId
  presentation?: TrLocusPresentationContract | null
  bounds?: TrLocusBoundsContract | null
  componentSummary?: TrLocusComponentSummaryContract | null
  reviewedPrimaryLabel?: string | null
}): TrLocusRowDisplay => {
  const facts = exactComponentFacts(locus)
  const contractsMatch = contractMatchesIdentity(facts, bounds, componentSummary)
  const sourceLabel = boundedContext(reviewedPrimaryLabel)
  const reviewedPrimary =
    contractsMatch && hasReviewedPrimaryReceipt(presentation) && sourceLabel !== null
  const sourceVariationCluster = contractsMatch && hasSourceVariationClusterReceipt(presentation)
  const variationBounds = sourceVariationCluster ? exactVariationClusterBounds(bounds) : null

  let kind: TrLocusRowKind
  if (reviewedPrimary) kind = 'reviewed-primary'
  else if (sourceVariationCluster) kind = 'variation-cluster'
  else if (facts.componentCount === 1) kind = 'simple'
  else kind = 'multi-component'

  const componentSummaryText = `${facts.componentCount.toLocaleString('en-US')} component${
    facts.componentCount === 1 ? '' : 's'
  } / ${facts.motifCount.toLocaleString('en-US')} distinct stored motif${
    facts.motifCount === 1 ? '' : 's'
  }`
  const envelopeDisplay = formatDisplayInterval(locus.components[0].chrom, facts.start0, facts.end0)

  let label: string
  if (kind === 'simple') {
    label = `${locus.components[0].motif} tandem repeat · ${envelopeDisplay}`
  } else if (kind === 'reviewed-primary') {
    label = `${
      sourceLabel ? `${sourceLabel} ` : ''
    }tandem repeat · ${facts.componentCount.toLocaleString('en-US')} source components`
  } else if (kind === 'variation-cluster') {
    label = `Variation cluster · ${facts.componentCount.toLocaleString(
      'en-US'
    )} components / ${facts.motifCount.toLocaleString('en-US')} motifs · ${formatDisplayInterval(
      locus.components[0].chrom,
      variationBounds?.start0 ?? facts.start0,
      variationBounds?.end0 ?? facts.end0
    )}`
  } else {
    label = `Multi-component TR locus · ${facts.componentCount.toLocaleString(
      'en-US'
    )} components / ${facts.motifCount.toLocaleString('en-US')} motifs · ${envelopeDisplay}`
  }

  const accessibleLabel =
    kind === 'simple'
      ? `${boundedContext(locus.components[0].motif)} tandem repeat · ${envelopeDisplay}`
      : label

  const interval = variationBounds || facts
  let intervalKind = 'component envelope'
  if (variationBounds) intervalKind = 'source variation-cluster interval'
  else if (facts.componentCount === 1) intervalKind = 'exact component interval'
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

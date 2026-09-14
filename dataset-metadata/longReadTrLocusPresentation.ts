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

const isCanonicalSha256Digest = (value?: string | null): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)

const simpleMotifContext = (motif: string) => (motif.length <= 80 ? motif : 'long motif')

// Motifs named inline stay short so a row cannot grow with the stored sequence.
const boundedMotif = (motif: string) => (motif.length <= 20 ? motif : `${motif.length}bp motif`)

// Distinct stored motifs in first-appearance order. At most two are named; the rest are
// summarized so the row stays bounded no matter how many components a cluster spans.
const motifPhrase = (motifs: string[]) => {
  const distinct: string[] = []
  motifs.forEach((motif) => {
    if (!distinct.includes(motif)) distinct.push(motif)
  })
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
      isCanonicalSha256Digest(presentation.reviewed_override_digest)
  )

const hasSourceVariationClusterReceipt = (presentation?: TrLocusPresentationContract | null) =>
  Boolean(
    presentation?.source_representation_kind === 'VARIATION_CLUSTER' &&
      presentation.presentation_layout === 'CLUSTER_FOCUSED' &&
      presentation.presentation_reason === 'SOURCE_VARIATION_CLUSTER' &&
      hasText(presentation.classification_source) &&
      hasText(presentation.classification_release) &&
      isCanonicalSha256Digest(presentation.classification_digest)
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

const formatPlainInterval = (chrom: string, start0: number, end0: number) =>
  `${chrom}:${start0 + 1}–${end0}`

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

  let label: string
  if (kind === 'simple') {
    const motif = locus.components[0].motif
    const copyText = repeatCopyText(facts.length, motif.length)
    const plainEnvelope = formatPlainInterval(locus.components[0].chrom, facts.start0, facts.end0)
    label = `${plainEnvelope} TR locus: ${copyText ? `${copyText} x ` : ''}${simpleMotifContext(
      motif
    )} (${motif.length}bp motif)`
  } else if (kind === 'reviewed-primary') {
    label = `${
      sourceLabel ? `${sourceLabel} ` : ''
    }tandem repeat · ${facts.componentCount.toLocaleString('en-US')} source components`
  } else {
    const clusterStart0 = kind === 'variation-cluster' ? variationBounds?.start0 : undefined
    const clusterEnd0 = kind === 'variation-cluster' ? variationBounds?.end0 : undefined
    const clusterEnvelope = formatPlainInterval(
      locus.components[0].chrom,
      clusterStart0 ?? facts.start0,
      clusterEnd0 ?? facts.end0
    )
    label = `${clusterEnvelope} TR variation cluster: spans ${facts.componentCount.toLocaleString(
      'en-US'
    )} TR${facts.componentCount === 1 ? '' : 's'} with ${motifPhrase(
      locus.components.map((component) => component.motif)
    )}`
  }

  const accessibleLabel = label

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

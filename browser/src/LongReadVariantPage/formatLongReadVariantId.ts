export type LongReadAlleleIdentity = {
  variant_id?: string | null
  source_variant_id?: string | null
  alt_index?: number | null
  alt_count?: number | null
  chrom?: string | null
  pos?: number | null
  ref?: string | null
  alt?: string | null
  allele_type?: string | null
  allele_length?: number | null
  length?: number | null
}

export type LongReadAlleleDisplay = {
  /** Friendly biological/locus label. Never use this value as a query key. */
  primaryLabel: string
  /** Single-line table label; richer sequence/event text belongs in the tooltip. */
  compactLabel: string
  /** Explicit ALT-record designation when the source record is multiallelic. */
  alleleLabel: string | null
  /** Complete visible text, suitable for tables, titles, and copied display text. */
  label: string
  /** Screen-reader/tooltip text that explains the canonical link target. */
  accessibleLabel: string
  canonicalId: string
}

const SHORT_ALLELE_MAX_BASES = 50
const ABBREVIATED_SEQUENCE_BASES = 8

const withoutChr = (value: string) => value.replace(/^chr/i, '')

const parseAltSpecificId = (variantId: string) => {
  const match = variantId.match(/^(.*)~([1-9][0-9]*)$/)
  return match
    ? { sourceId: match[1], altIndex: Number(match[2]) }
    : { sourceId: variantId, altIndex: null }
}

const isLiteralSequence = (allele: string) => /^[ACGTN]+$/i.test(allele)

const stableSequenceDigest = (sequence: string) => {
  // A small modular polynomial hash is sufficient here: this is a display
  // disambiguator, not a biological identifier or cryptographic checksum.
  const modulus = 4294967291
  let hash = 5381
  Array.from(sequence).forEach((base) => {
    hash = (hash * 33 + base.charCodeAt(0)) % modulus
  })
  return Math.floor(hash).toString(16).padStart(8, '0')
}

const abbreviatedSequence = (sequence: string) => {
  if (sequence.length <= ABBREVIATED_SEQUENCE_BASES * 2 + 1) return sequence
  return `${sequence.slice(0, ABBREVIATED_SEQUENCE_BASES)}…${sequence.slice(
    -ABBREVIATED_SEQUENCE_BASES
  )}#${stableSequenceDigest(sequence)}`
}

const alleleTypeLabel = (alleleType: string | null | undefined) => {
  const normalized = (alleleType || 'variant').toLowerCase()
  const labels: Record<string, string> = {
    snv: 'SNV',
    ins: 'insertion',
    del: 'deletion',
    dup: 'duplication',
    inv: 'inversion',
    trv: 'tandem-repeat allele',
    alu_ins: 'Alu insertion',
    line1_ins: 'LINE-1 insertion',
    line_ins: 'LINE insertion',
    sva_ins: 'SVA insertion',
    numt: 'NUMT insertion',
    bnd: 'breakend',
    ctx: 'translocation',
    cpx: 'complex variant',
    complex_dup: 'complex duplication',
  }
  return labels[normalized] || normalized.replace(/_/g, ' ')
}

const signedLength = (allele: LongReadAlleleIdentity) => {
  const supplied = allele.allele_length ?? allele.length
  if (typeof supplied === 'number' && Number.isFinite(supplied)) return supplied
  if (allele.ref && allele.alt && isLiteralSequence(allele.ref) && isLiteralSequence(allele.alt)) {
    return allele.alt.length - allele.ref.length
  }
  return null
}

const formatSignedLength = (length: number | null) => {
  if (length == null) return 'length unavailable'
  return `${length > 0 ? '+' : ''}${length.toLocaleString()} bp`
}

/**
 * Formats the canonical ID alone when allele fields have not been loaded yet.
 * The opaque `~N` transport suffix is never shown. A non-default ALT retains a
 * human `Allele N` marker so legacy payloads do not collapse visible options.
 */
export const formatLongReadVariantId = (variantId: string): string => {
  const { sourceId, altIndex } = parseAltSpecificId(variantId)
  const sourceLabel = withoutChr(sourceId)
  return altIndex != null && altIndex > 1 ? `${sourceLabel} (Allele ${altIndex})` : sourceLabel
}

/**
 * Separates the immutable Y1 query identity from a human-facing allele label.
 * It relies only on explicit allele fields; source-ID text is never parsed to
 * manufacture biological event identity.
 */
export const formatLongReadAlleleDisplay = (
  allele: LongReadAlleleIdentity
): LongReadAlleleDisplay => {
  const canonicalId = allele.variant_id || allele.source_variant_id || ''
  const parsedCanonical = parseAltSpecificId(canonicalId)
  const altIndex = allele.alt_index ?? parsedCanonical.altIndex
  const sourceId = allele.source_variant_id || parsedCanonical.sourceId
  const chrom = allele.chrom ? withoutChr(String(allele.chrom)) : null
  const ref = allele.ref || null
  const alt = allele.alt || null
  const canUseConventionalId =
    chrom != null &&
    allele.pos != null &&
    ref != null &&
    alt != null &&
    isLiteralSequence(ref) &&
    isLiteralSequence(alt) &&
    ref.length <= SHORT_ALLELE_MAX_BASES &&
    alt.length <= SHORT_ALLELE_MAX_BASES

  let primaryLabel: string
  if (canUseConventionalId) {
    primaryLabel = `${chrom}-${allele.pos}-${ref}-${alt}`
  } else if (chrom != null && allele.pos != null) {
    let altDescription = 'ALT unavailable'
    if (alt && /^<[^>]+>$/.test(alt)) altDescription = `ALT ${alt}`
    else if (alt) altDescription = `ALT ${abbreviatedSequence(alt)}`
    primaryLabel = `${chrom}:${allele.pos} ${alleleTypeLabel(
      allele.allele_type
    )} (${formatSignedLength(signedLength(allele))}; ${altDescription})`
  } else {
    primaryLabel = withoutChr(sourceId || canonicalId || 'Long-read allele')
  }

  const altCount =
    typeof allele.alt_count === 'number' && Number.isFinite(allele.alt_count)
      ? allele.alt_count
      : null
  let alleleLabel: string | null = null
  if (altIndex != null && altCount != null && altCount > 1) {
    alleleLabel = `Allele ${altIndex} of ${altCount}`
  } else if (altIndex != null && (altIndex > 1 || (altCount != null && altCount > 1))) {
    alleleLabel = `Allele ${altIndex}`
  }
  let compactLabel = primaryLabel
  if (!canUseConventionalId && chrom != null && allele.pos != null) {
    compactLabel = `${chrom}:${allele.pos} ${alleleTypeLabel(
      allele.allele_type
    )} ${formatSignedLength(signedLength(allele))}`
  }
  const label = alleleLabel ? `${primaryLabel} — ${alleleLabel}` : primaryLabel
  const accessibleLabel = canonicalId ? `${label}. Canonical long-read ID: ${canonicalId}` : label

  return { primaryLabel, compactLabel, alleleLabel, label, accessibleLabel, canonicalId }
}

export default formatLongReadVariantId

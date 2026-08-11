export const LONG_READ_VARIANT_SEARCH_LIMITS = Object.freeze({
  maxInputLength: 512,
  maxTerms: 20,
  minSequenceLength: 3,
  maxSequenceLength: 64,
  maxIdentifierLength: 128,
})

export type LongReadVariantSearchRegion = {
  chrom: string
  start: number
  stop: number
}

export type LongReadVariantSearchTermKind =
  | 'position'
  | 'position_prefix'
  | 'locus'
  | 'range'
  | 'allele_change'
  | 'position_allele_change'
  | 'vcf'
  | 'identifier'
  | 'sequence'
  | 'unknown'

export type LongReadVariantSearchTermStatus = 'valid' | 'malformed' | 'out_of_region'

export type LongReadVariantSearchTermCode =
  | 'invalid_coordinate'
  | 'invalid_range'
  | 'invalid_allele_change'
  | 'invalid_term'
  | 'sequence_too_short'
  | 'sequence_too_long'
  | 'identifier_too_long'
  | 'chromosome_out_of_region'
  | 'coordinate_out_of_region'

export type LongReadVariantSearchTerm = {
  raw: string
  normalized: string
  kind: LongReadVariantSearchTermKind
  status: LongReadVariantSearchTermStatus
  code?: LongReadVariantSearchTermCode
  message?: string
  chrom?: string
  start?: number
  end?: number
  ref?: string
  alt?: string
  value?: string
}

export type LongReadVariantSearchIssue = {
  code: 'input_too_long' | 'too_many_terms'
  message: string
}

export type LongReadVariantSearchResult = {
  input: string
  status: 'empty' | 'ready' | 'partial' | 'invalid' | 'limit_exceeded'
  terms: LongReadVariantSearchTerm[]
  validTerms: LongReadVariantSearchTerm[]
  issues: LongReadVariantSearchIssue[]
}

/**
 * The fields available on a long-read variant in region responses. Optional aliases
 * allow the matcher to be reused with the slightly different LR response shapes.
 */
export type LongReadSearchableVariant = {
  variant_id?: string | null
  source_variant_id?: string | null
  chrom?: string | null
  pos?: number | null
  end?: number | null
  ref?: string | null
  alt?: string | null
  rsids?: string[] | null
  rsid?: string | string[] | null
  short_read_match_id?: string | null
  allele_type?: string | null
  gnomad_str?: string | null
  motifs?: string[] | null
  motif?: string | null
  tr_id?: string | null
  tr_ids?: string[] | null
  tandem_repeat_id?: string | null
  tandem_repeat_ids?: string[] | null
  enveloping_tr_id?: string | null
  enveloped_ids?: string[] | null
  sv_id?: string | null
  search_identifiers?: string[] | null
}

const normalizeChrom = (chrom: string) => {
  const normalized = chrom.trim().replace(/^chr\s*/i, '').toUpperCase()
  return normalized === 'M' ? 'MT' : normalized
}

const normalizeIdentifier = (identifier: string) =>
  identifier.trim().replace(/^chr(?=[0-9XYM])/i, '').toLowerCase()

const normalizeRawTerm = (term: string) =>
  term
    .normalize('NFKC')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[→⟶]/g, '>')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^chr\s+(?=[0-9XYM])/i, 'chr')
    .replace(/\s*([:>+])\s*/g, '$1')
    .replace(/\s*-\s*/g, '-')
    .toLowerCase()

const positiveCoordinate = (value: string) => {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

const malformed = (
  raw: string,
  normalized: string,
  code: LongReadVariantSearchTermCode,
  message: string
): LongReadVariantSearchTerm => ({
  raw,
  normalized,
  kind: 'unknown',
  status: 'malformed',
  code,
  message,
})

const positionPrefixTerm = (
  raw: string,
  normalized: string
): LongReadVariantSearchTerm => ({
  raw,
  normalized,
  kind: 'position_prefix',
  status: 'valid',
  value: normalized,
})

const isPositionPrefix = (
  value: string,
  region: LongReadVariantSearchRegion | undefined
) => {
  if (!region) return false
  const regionCoordinateDigits = Math.min(
    String(Math.trunc(region.start)).length,
    String(Math.trunc(region.stop)).length
  )
  return value.length < regionCoordinateDigits
}

const withRegionStatus = (
  term: LongReadVariantSearchTerm,
  region?: LongReadVariantSearchRegion
): LongReadVariantSearchTerm => {
  if (!region || term.start == null || term.end == null) return term

  if (term.chrom && normalizeChrom(term.chrom) !== normalizeChrom(region.chrom)) {
    return {
      ...term,
      status: 'out_of_region',
      code: 'chromosome_out_of_region',
      message: `${term.chrom} is outside the displayed ${region.chrom} region`,
    }
  }

  if (term.end < region.start || term.start > region.stop) {
    return {
      ...term,
      status: 'out_of_region',
      code: 'coordinate_out_of_region',
      message: `${term.start}${term.end === term.start ? '' : `-${term.end}`} is outside the displayed region`,
    }
  }

  return term
}

const coordinateTerm = (
  raw: string,
  normalized: string,
  kind: LongReadVariantSearchTermKind,
  startText: string,
  endText: string,
  region: LongReadVariantSearchRegion | undefined,
  extras: Partial<LongReadVariantSearchTerm> = {}
): LongReadVariantSearchTerm => {
  const start = positiveCoordinate(startText)
  const end = positiveCoordinate(endText)
  if (start == null || end == null) {
    return malformed(raw, normalized, 'invalid_coordinate', 'Coordinates must be positive integers')
  }
  if (end < start) {
    return malformed(raw, normalized, 'invalid_range', 'Range end must not precede its start')
  }
  return withRegionStatus(
    { raw, normalized, kind, status: 'valid', start, end, ...extras },
    region
  )
}

const validAllele = (allele: string) =>
  allele.length > 0 &&
  allele.length <= LONG_READ_VARIANT_SEARCH_LIMITS.maxSequenceLength &&
  /^[acgtn]+$/i.test(allele)

const parseTerm = (
  raw: string,
  region?: LongReadVariantSearchRegion
): LongReadVariantSearchTerm => {
  const normalized = normalizeRawTerm(raw)
  let match: RegExpMatchArray | null

  match = normalized.match(/^(?:chr)?([0-9]+|x|y|m|mt):(\d+)-(\d+)$/i)
  if (match) {
    return coordinateTerm(raw, normalized, 'range', match[2], match[3], region, {
      chrom: normalizeChrom(match[1]),
    })
  }

  match = normalized.match(/^(?:chr)?([0-9]+|x|y|m|mt):(\d+)$/i)
  if (match) {
    return coordinateTerm(raw, normalized, 'locus', match[2], match[2], region, {
      chrom: normalizeChrom(match[1]),
    })
  }

  // Common browser-style chromosome-position form. Requiring the chromosome-like
  // first token keeps a bare `100-200` available for explicit range validation.
  match = normalized.match(/^(?:chr)?([0-9]+|x|y|m|mt)[- ](\d+)$/i)
  if (match) {
    return coordinateTerm(raw, normalized, 'locus', match[2], match[2], region, {
      chrom: normalizeChrom(match[1]),
    })
  }

  match = normalized.match(/^(?:chr)?([0-9]+|x|y|m|mt)[: -](\d+)[ +:]([acgtn]+)>([acgtn]+)$/i)
  if (match) {
    if (!validAllele(match[3]) || !validAllele(match[4])) {
      return malformed(raw, normalized, 'invalid_allele_change', 'REF and ALT must be bounded DNA sequences')
    }
    return coordinateTerm(raw, normalized, 'vcf', match[2], match[2], region, {
      chrom: normalizeChrom(match[1]),
      ref: match[3].toUpperCase(),
      alt: match[4].toUpperCase(),
    })
  }

  // VCF columns may be separated by spaces or tabs (collapsed above).
  match = normalized.match(/^(?:chr)?([0-9]+|x|y|m|mt) (\d+) ([acgtn]+) ([acgtn]+)$/i)
  if (match) {
    if (!validAllele(match[3]) || !validAllele(match[4])) {
      return malformed(raw, normalized, 'invalid_allele_change', 'REF and ALT must be bounded DNA sequences')
    }
    return coordinateTerm(raw, normalized, 'vcf', match[2], match[2], region, {
      chrom: normalizeChrom(match[1]),
      ref: match[3].toUpperCase(),
      alt: match[4].toUpperCase(),
    })
  }

  // Canonical small-variant IDs, accepting the common colon, dash, or underscore separators.
  match = normalized.match(
    /^(?:chr)?([0-9]+|x|y|m|mt)([-:_])(\d+)\2([acgtn]+)\2([acgtn]+)$/i
  )
  if (match) {
    if (!validAllele(match[4]) || !validAllele(match[5])) {
      return malformed(raw, normalized, 'invalid_allele_change', 'REF and ALT must be bounded DNA sequences')
    }
    return coordinateTerm(raw, normalized, 'vcf', match[3], match[3], region, {
      chrom: normalizeChrom(match[1]),
      ref: match[4].toUpperCase(),
      alt: match[5].toUpperCase(),
      value: normalizeIdentifier(normalized),
    })
  }

  match = normalized.match(/^(\d+)(?:\+|:| )([acgtn]+)>([acgtn]+)$/i)
  if (match) {
    if (!validAllele(match[2]) || !validAllele(match[3])) {
      return malformed(raw, normalized, 'invalid_allele_change', 'REF and ALT must be bounded DNA sequences')
    }
    return coordinateTerm(
      raw,
      normalized,
      'position_allele_change',
      match[1],
      match[1],
      region,
      { ref: match[2].toUpperCase(), alt: match[3].toUpperCase() }
    )
  }

  match = normalized.match(/^([acgtn]+)>([acgtn]+)$/i)
  if (match) {
    if (!validAllele(match[1]) || !validAllele(match[2])) {
      return malformed(raw, normalized, 'invalid_allele_change', 'REF and ALT must be bounded DNA sequences')
    }
    return {
      raw,
      normalized,
      kind: 'allele_change',
      status: 'valid',
      ref: match[1].toUpperCase(),
      alt: match[2].toUpperCase(),
    }
  }

  if (/^\d+$/.test(normalized)) {
    if (isPositionPrefix(normalized, region)) {
      return positionPrefixTerm(raw, normalized)
    }
    return coordinateTerm(raw, normalized, 'position', normalized, normalized, region)
  }

  if (/^[acgtn]+$/i.test(normalized)) {
    if (normalized.length < LONG_READ_VARIANT_SEARCH_LIMITS.minSequenceLength) {
      return malformed(
        raw,
        normalized,
        'sequence_too_short',
        `Sequence fragments must contain at least ${LONG_READ_VARIANT_SEARCH_LIMITS.minSequenceLength} bases`
      )
    }
    if (normalized.length > LONG_READ_VARIANT_SEARCH_LIMITS.maxSequenceLength) {
      return malformed(
        raw,
        normalized,
        'sequence_too_long',
        `Sequence fragments may contain at most ${LONG_READ_VARIANT_SEARCH_LIMITS.maxSequenceLength} bases`
      )
    }
    return {
      raw,
      normalized,
      kind: 'sequence',
      status: 'valid',
      value: normalized.toUpperCase(),
    }
  }

  // IDs are intentionally exact-match tokens. This supports canonical, rs, source,
  // SV, and TR identifiers without turning local search into a speculative lookup.
  if (/^[a-z0-9][a-z0-9._~:/+-]*$/i.test(normalized)) {
    if (normalized.length > LONG_READ_VARIANT_SEARCH_LIMITS.maxIdentifierLength) {
      return malformed(
        raw,
        normalized,
        'identifier_too_long',
        `Identifiers may contain at most ${LONG_READ_VARIANT_SEARCH_LIMITS.maxIdentifierLength} characters`
      )
    }
    if (/^(?:chr)?(?:\d+|x|y|m|mt):/i.test(normalized)) {
      return malformed(raw, normalized, 'invalid_coordinate', 'Malformed chromosome coordinate')
    }
    return {
      raw,
      normalized,
      kind: 'identifier',
      status: 'valid',
      value: normalizeIdentifier(normalized),
    }
  }

  if (normalized.includes('>')) {
    return malformed(raw, normalized, 'invalid_allele_change', 'Malformed REF>ALT allele change')
  }
  if (/^(?:chr)?(?:\d+|x|y|m|mt)\s*[: -]/i.test(normalized)) {
    return malformed(raw, normalized, 'invalid_coordinate', 'Malformed chromosome coordinate')
  }
  return malformed(raw, normalized, 'invalid_term', 'Unrecognized search term')
}

/** Parse comma- or newline-separated OR terms without performing any remote lookup. */
export const parseLongReadVariantSearch = (
  input: string,
  region?: LongReadVariantSearchRegion
): LongReadVariantSearchResult => {
  if (input.length > LONG_READ_VARIANT_SEARCH_LIMITS.maxInputLength) {
    return {
      input,
      status: 'limit_exceeded',
      terms: [],
      validTerms: [],
      issues: [
        {
          code: 'input_too_long',
          message: `Searches may contain at most ${LONG_READ_VARIANT_SEARCH_LIMITS.maxInputLength} characters`,
        },
      ],
    }
  }

  const rawTerms = input
    .split(/[\n,]/)
    .map((term) => term.trim())
    .filter(Boolean)

  if (rawTerms.length > LONG_READ_VARIANT_SEARCH_LIMITS.maxTerms) {
    return {
      input,
      status: 'limit_exceeded',
      terms: [],
      validTerms: [],
      issues: [
        {
          code: 'too_many_terms',
          message: `Searches may contain at most ${LONG_READ_VARIANT_SEARCH_LIMITS.maxTerms} OR terms`,
        },
      ],
    }
  }

  const terms = rawTerms.map((term) => parseTerm(term, region))
  const validTerms = terms.filter((term) => term.status === 'valid')
  let status: LongReadVariantSearchResult['status']
  if (terms.length === 0) status = 'empty'
  else if (validTerms.length === terms.length) status = 'ready'
  else if (validTerms.length > 0) status = 'partial'
  else status = 'invalid'

  return { input, status, terms, validTerms, issues: [] }
}

const variantInterval = (variant: LongReadSearchableVariant) => {
  if (variant.pos == null || !Number.isFinite(variant.pos)) return null
  const end = variant.end != null && Number.isFinite(variant.end) ? variant.end : variant.pos
  return { start: Math.min(variant.pos, end), end: Math.max(variant.pos, end) }
}

const stringValues = (value: string | string[] | null | undefined): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return typeof value === 'string' ? [value] : []
}

const identifierValues = (variant: LongReadSearchableVariant) => [
  ...stringValues(variant.variant_id),
  ...stringValues(variant.source_variant_id),
  ...stringValues(variant.rsids),
  ...stringValues(variant.rsid),
  ...stringValues(variant.short_read_match_id),
  ...stringValues(variant.allele_type),
  ...stringValues(variant.gnomad_str),
  ...stringValues(variant.tr_id),
  ...stringValues(variant.tr_ids),
  ...stringValues(variant.tandem_repeat_id),
  ...stringValues(variant.tandem_repeat_ids),
  ...stringValues(variant.enveloping_tr_id),
  ...stringValues(variant.enveloped_ids),
  ...stringValues(variant.sv_id),
  ...stringValues(variant.search_identifiers),
]

export const matchesLongReadVariantSearchTerm = (
  variant: LongReadSearchableVariant,
  term: LongReadVariantSearchTerm
): boolean => {
  if (term.status !== 'valid') return false

  const sameChrom =
    term.chrom == null ||
    (variant.chrom != null && normalizeChrom(variant.chrom) === normalizeChrom(term.chrom))
  const interval = variantInterval(variant)
  const samePosition = interval != null && variant.pos === term.start
  const sameAlleles =
    variant.ref != null &&
    variant.alt != null &&
    variant.ref.toUpperCase() === term.ref &&
    variant.alt.toUpperCase() === term.alt

  switch (term.kind) {
    case 'position':
    case 'locus':
      return sameChrom && samePosition
    case 'position_prefix':
      return (
        sameChrom &&
        variant.pos != null &&
        term.value != null &&
        String(Math.trunc(variant.pos)).startsWith(term.value)
      )
    case 'range':
      return (
        sameChrom &&
        interval != null &&
        term.start != null &&
        term.end != null &&
        interval.end >= term.start &&
        interval.start <= term.end
      )
    case 'allele_change':
      return sameAlleles
    case 'position_allele_change':
      return sameChrom && samePosition && sameAlleles
    case 'vcf':
      return (
        (sameChrom && samePosition && sameAlleles) ||
        (term.value != null &&
          identifierValues(variant).some((value) => normalizeIdentifier(value) === term.value))
      )
    case 'identifier': {
      const expected = term.value
      if (expected == null) return false
      const alleleType = normalizeIdentifier(variant.allele_type || '')
      if (expected === 'tr' && ['tr', 'trv', 'str'].includes(alleleType)) return true
      if (['other', 'oth'].includes(expected) && ['other', 'oth', 'bnd', 'ctx'].includes(alleleType)) return true
      if (expected === 'sv' && alleleType !== '' && !['snv', 'tr', 'trv', 'str'].includes(alleleType)) return true
      return identifierValues(variant).some((value) => normalizeIdentifier(value) === expected)
    }
    case 'sequence': {
      const fragment = term.value
      if (!fragment) return false
      return [
        ...stringValues(variant.ref),
        ...stringValues(variant.alt),
        ...stringValues(variant.motif),
        ...stringValues(variant.motifs),
      ].some((value) => value.toUpperCase().includes(fragment))
    }
    default:
      return false
  }
}

/** Empty search matches all variants; all non-empty terms are combined with OR. */
export const matchesLongReadVariantSearch = (
  variant: LongReadSearchableVariant,
  search: LongReadVariantSearchResult | LongReadVariantSearchTerm[]
): boolean => {
  const terms = Array.isArray(search) ? search : search.terms
  if (terms.length === 0) {
    return !Array.isArray(search) && search.status === 'empty'
  }
  return terms.some((term) => matchesLongReadVariantSearchTerm(variant, term))
}

export const filterLongReadVariantsBySearch = <Variant extends LongReadSearchableVariant>(
  variants: Variant[],
  search: LongReadVariantSearchResult | LongReadVariantSearchTerm[]
): Variant[] => variants.filter((variant) => matchesLongReadVariantSearch(variant, search))

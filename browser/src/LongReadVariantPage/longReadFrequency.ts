/** Prefer the nested GraphQL contract when present, even when its AF is null. */
export const getLongReadAf = (variant: { freq?: any }): number | null => {
  const frequency = variant.freq
  const af = frequency && 'all' in frequency ? frequency.all?.af : frequency?.af
  return typeof af === 'number' && Number.isFinite(af) ? af : null
}

/** No bounds means no AF filter. Explicit numeric bounds never include unavailable AF. */
export const matchesLongReadAfRange = (
  af: number | null | undefined,
  minimum?: number,
  maximum?: number
) => {
  if (minimum == null && maximum == null) return true
  return af != null && (minimum == null || af >= minimum) && (maximum == null || af <= maximum)
}

/** The existing haplotype control uses 0 to disable its minimum, not as an active bound. */
export const passesMinimumLongReadAf = (af: number | null | undefined, minimum: number) =>
  matchesLongReadAfRange(af, minimum <= 0 ? undefined : minimum)

/** Empty = cohort/division absent; NA = present but AF unavailable; 0 remains numeric zero. */
export const exportLongReadAf = (frequency: { af?: number | null } | null | undefined): string =>
  frequency == null ? '' : frequency.af == null ? 'NA' : String(frequency.af)

export type NullableLongReadFrequency = {
  af: number | null
  ac: number | null
  an: number | null
}

/** Preserve measured zero while keeping absent Y1 frequency measurements unavailable. */
export const nullableLongReadFrequency = (frequency: any): NullableLongReadFrequency => ({
  af: frequency?.af ?? null,
  ac: frequency?.ac ?? null,
  an: frequency?.an ?? null,
})

export const formatLongReadFrequency = (value: number | null | undefined, digits?: number) => {
  if (value == null) return '—'
  return digits == null ? String(value) : value.toFixed(digits)
}

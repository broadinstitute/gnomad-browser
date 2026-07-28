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

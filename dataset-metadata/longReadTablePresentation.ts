/** Presentation only: never use abbreviated copy as an identity, route, or export key. */
export const LONG_READ_TABLE_LABEL_BUDGET = 40

export const abbreviateLongReadTableLabel = (label: string): string => {
  const characters = Array.from(label)
  return characters.length <= LONG_READ_TABLE_LABEL_BUDGET
    ? label
    : `${characters.slice(0, 27).join('')}…${characters.slice(-12).join('')}`
}

export type CondensedMotifLine = {
  label: string
  /** Exact distinct strings, in first-occurrence order. No orientation normalization. */
  motifs: string[]
  displayedMotifs: string[]
  omittedMotifs: string[]
  omittedCount: number
}

const omissionLabel = (count: number) => `+${count} more motif${count === 1 ? '' : 's'}`

/**
 * Keep whole motifs only. Skip an overlong motif and continue in source order;
 * reserve space for the count of ALL omitted distinct strings, including skips.
 */
export const condenseLongReadMotifs = (
  values: readonly string[],
  prefix: 'Stored: ' | 'Catalog pathogenic: '
): CondensedMotifLine => {
  const motifs = [...new Set(values)]
  let displayedMotifs: string[] = []
  if (Array.from(`${prefix}${motifs.join(', ')}`).length <= LONG_READ_TABLE_LABEL_BUDGET) {
    displayedMotifs = [...motifs]
  } else {
    motifs.forEach((motif) => {
      const candidate = [...displayedMotifs, motif]
      const omittedCount = motifs.length - candidate.length
      const suffix = omittedCount > 0 ? ` ${omissionLabel(omittedCount)}` : ''
      if (
        Array.from(`${prefix}${candidate.join(', ')}${suffix}`).length <=
        LONG_READ_TABLE_LABEL_BUDGET
      ) {
        displayedMotifs.push(motif)
      }
    })
  }
  const displayed = new Set(displayedMotifs)
  const omittedMotifs = motifs.filter((motif) => !displayed.has(motif))
  const parts = [displayedMotifs.join(', ')]
  if (omittedMotifs.length) parts.push(omissionLabel(omittedMotifs.length))
  return {
    label: `${prefix}${parts.filter(Boolean).join(' ')}`,
    motifs,
    displayedMotifs,
    omittedMotifs,
    omittedCount: omittedMotifs.length,
  }
}

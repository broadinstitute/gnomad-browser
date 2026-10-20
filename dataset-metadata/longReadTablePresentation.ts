/** Presentation only: never use abbreviated copy as an identity, route, or export key. */
export const LONG_READ_TABLE_LABEL_BUDGET = 40

export const abbreviateLongReadTableLabel = (label: string): string => {
  const characters = Array.from(label)
  return characters.length <= LONG_READ_TABLE_LABEL_BUDGET
    ? label
    : `${characters.slice(0, 27).join('')}…${characters.slice(-12).join('')}`
}

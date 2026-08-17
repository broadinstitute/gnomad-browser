import { GNOMAD_ANCESTRY_GROUP_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

/**
 * Normalize legacy LR `oth` for display only. Raw IDs must remain unchanged in
 * queries, filters, frequencies, and React keys.
 */
export const normalizeLongReadAncestryGroupDisplayId = (id: string): string =>
  ['oth', 'rmi'].includes(id.toLowerCase()) ? 'rmi' : id.toLowerCase()

export const longReadAncestryGroupDisplayId = (id: string): string =>
  normalizeLongReadAncestryGroupDisplayId(id).toUpperCase()

export const longReadAncestryGroupDisplayName = (id: string): string => {
  if (id === 'XX' || id.endsWith('_XX')) return 'XX'
  if (id === 'XY' || id.endsWith('_XY')) return 'XY'

  const displayId = normalizeLongReadAncestryGroupDisplayId(id)
  if (displayId === 'rmi') return 'Remaining individuals'

  return GNOMAD_ANCESTRY_GROUP_NAMES[displayId as keyof typeof GNOMAD_ANCESTRY_GROUP_NAMES] || id
}

export const addLongReadAncestryGroupNames = <T extends { id: string }>(groups: readonly T[]) =>
  groups.map((group) => ({ ...group, name: longReadAncestryGroupDisplayName(group.id) }))

export const LONG_READ_ANCESTRY_GROUP_LEGEND_IDS = [
  'AFR',
  'AMR',
  'EAS',
  'EUR',
  'SAS',
  'ASJ',
  'RMI',
  'N/A',
] as const

export type GroupWithSamples = {
  samples: Array<{ sample_id: string }>
}

/**
 * Filters only by identities from the immutable regional outlier response. Detail rows are
 * deliberately absent from this API so request completion cannot change membership.
 */
export const filterGroupsToRegionalDeviationSamples = <T extends GroupWithSamples>(
  groups: readonly T[],
  sampleIds: readonly string[],
  enabled: boolean
): T[] => {
  if (!enabled) return [...groups]
  const identities = new Set(sampleIds)
  return groups.filter((group) => group.samples.some((sample) => identities.has(sample.sample_id)))
}

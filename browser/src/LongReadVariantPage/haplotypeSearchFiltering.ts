import type { HaplotypeGroup, HaplotypeGroups, LRVariant } from '../Haplotypes'

export type VariantMatchPredicate = (variant: LRVariant | Record<string, unknown>) => boolean

export type HaplotypeSearchCounts = {
  matchingGroupRows: number
  totalGroupRows: number
  matchingSamples: number
  totalSamples: number
  matchingChromosomeCopies: number
  totalChromosomeCopies: number
}

const variantsInSet = (set: any): LRVariant[] => set?.variants || []

const canonicalGroupVariants = (group: HaplotypeGroups['groups'][number]): LRVariant[] => {
  if ('is_diplotype' in group) {
    const diplotype = group as any
    return [
      ...variantsInSet(diplotype.haplotypeA),
      ...variantsInSet(diplotype.haplotypeB),
      ...variantsInSet(diplotype.below_thresholdA),
      ...variantsInSet(diplotype.below_thresholdB),
    ]
  }

  const haplotype = group as HaplotypeGroup
  return [...variantsInSet(haplotype.variants), ...variantsInSet(haplotype.below_threshold)]
}

const sampleCopyMatches = (
  group: HaplotypeGroups['groups'][number],
  sample: any,
  matches: VariantMatchPredicate
): boolean[] => {
  if ('is_diplotype' in group) {
    const diplotype = group as any
    const copyA = [
      ...variantsInSet(sample.haplotypeA || diplotype.haplotypeA),
      ...variantsInSet(sample.below_thresholdA || diplotype.below_thresholdA),
    ]
    const copyB = [
      ...variantsInSet(sample.haplotypeB || diplotype.haplotypeB),
      ...variantsInSet(sample.below_thresholdB || diplotype.below_thresholdB),
    ]
    return [copyA.some(matches), copyB.some(matches)]
  }

  const haplotype = group as HaplotypeGroup
  const sampleVariants = sample.variant_sets?.flatMap((set: any) => variantsInSet(set))
  const variants = sampleVariants?.length
    ? [...sampleVariants, ...variantsInSet(haplotype.below_threshold)]
    : canonicalGroupVariants(group)
  return [variants.some(matches)]
}

export const haplotypeGroupContainsMatch = (
  group: HaplotypeGroups['groups'][number],
  matches: VariantMatchPredicate
): boolean => canonicalGroupVariants(group).some(matches) ||
  group.samples.some((sample) => sampleCopyMatches(group, sample, matches).some(Boolean))

export const filterHaplotypeGroupsToMatches = <Group extends HaplotypeGroups['groups'][number]>(
  groups: Group[],
  matches: VariantMatchPredicate
): Group[] => groups.filter((group) => haplotypeGroupContainsMatch(group, matches))

export const countMatchingHaplotypes = (
  groups: HaplotypeGroups['groups'],
  matches: VariantMatchPredicate
): HaplotypeSearchCounts => {
  const totalSampleIds = new Set<string>()
  const matchingSampleIds = new Set<string>()
  const totalCopyIds = new Set<string>()
  const matchingCopyIds = new Set<string>()
  let matchingGroupRows = 0

  groups.forEach((group) => {
    if (haplotypeGroupContainsMatch(group, matches)) matchingGroupRows += 1

    group.samples.forEach((sample: any) => {
      totalSampleIds.add(sample.sample_id)
      const copyMatches = sampleCopyMatches(group, sample, matches)
      copyMatches.forEach((copyMatchesSearch, copyIndex) => {
        let strand = sample.vcf_strand ?? copyIndex
        let phaseSet = sample.phase_set ?? ''
        if ('is_diplotype' in group) {
          if (copyIndex === 0) {
            strand = sample.strand_mapping?.strandA ?? 'A'
            phaseSet = sample.phase_set_mapping?.phaseSetA ?? ''
          } else {
            strand = sample.strand_mapping?.strandB ?? 'B'
            phaseSet = sample.phase_set_mapping?.phaseSetB ?? ''
          }
        }
        const copyId = `${sample.sample_id}:${strand}:${phaseSet}:${copyIndex}`
        totalCopyIds.add(copyId)
        if (copyMatchesSearch) {
          matchingCopyIds.add(copyId)
          matchingSampleIds.add(sample.sample_id)
        }
      })
    })
  })

  return {
    matchingGroupRows,
    totalGroupRows: groups.length,
    matchingSamples: matchingSampleIds.size,
    totalSamples: totalSampleIds.size,
    matchingChromosomeCopies: matchingCopyIds.size,
    totalChromosomeCopies: totalCopyIds.size,
  }
}

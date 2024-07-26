import {
  Sex,
  ShortTandemRepeat,
  AlleleSizeDistributionItem,
  AlleleSizeDistributionCohort,
  GenotypeDistributionCohort,
  GenotypeDistributionItem,
  ShortTandemRepeatAdjacentRepeat,
} from './ShortTandemRepeatPage'
import { AncestryGroupId } from '@gnomad/dataset-metadata/gnomadPopulations'

type AlleleSizeDistributionFilters = {
  selectedAncestryGroup: AncestryGroupId | ''
  selectedSex: Sex | ''
  selectedRepeatUnit: string
}

const addCohortToAlleleSizeDistribution = (
  cohort: AlleleSizeDistributionCohort,
  distribution: Record<number, AlleleSizeDistributionItem>
): Record<number, AlleleSizeDistributionItem> =>
  cohort.distribution.reduce((acc, distributionItem) => {
    const { repunit_count } = distributionItem
    const existingItem = acc[repunit_count]
    const countSoFar = existingItem ? existingItem.frequency : 0
    const newItem: AlleleSizeDistributionItem = {
      repunit_count: repunit_count,
      frequency: countSoFar + distributionItem.frequency,
    }
    return { ...acc, [repunit_count]: newItem }
  }, distribution)

const repunitsWithClassification = (
  shortTandemRepeat: ShortTandemRepeat,
  targetClassification: string
): Set<string> =>
  shortTandemRepeat.repeat_units.reduce(
    (acc, repunit) =>
      repunit.classification === targetClassification ? acc.add(repunit.repeat_unit) : acc,
    new Set<string>()
  )

export const getSelectedAlleleSizeDistribution = (
  shortTandemRepeatOrAdjacentRepeat: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat,
  { selectedAncestryGroup, selectedSex, selectedRepeatUnit }: AlleleSizeDistributionFilters
): AlleleSizeDistributionItem[] => {
  const matchingRepunits: Set<string> =
    selectedRepeatUnit.startsWith('classification') &&
    !isAdjacentRepeat(shortTandemRepeatOrAdjacentRepeat)
      ? repunitsWithClassification(shortTandemRepeatOrAdjacentRepeat, selectedRepeatUnit.slice(15))
      : new Set([selectedRepeatUnit])

  const itemsByRepunitCount: Record<number, AlleleSizeDistributionItem> =
    shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.reduce((acc, cohort) => {
      if (selectedAncestryGroup !== '' && cohort.ancestry_group !== selectedAncestryGroup) {
        return acc
      }
      if (selectedSex !== '' && cohort.sex !== selectedSex) {
        return acc
      }

      if (!matchingRepunits.has(cohort.repunit)) {
        return acc
      }
      return addCohortToAlleleSizeDistribution(cohort, acc)
    }, {} as Record<number, AlleleSizeDistributionItem>)
  return Object.values(itemsByRepunitCount)
}

const addCohortToGenotypeDistribution = (
  cohort: GenotypeDistributionCohort,
  distribution: Record<string, GenotypeDistributionItem>
): Record<number, GenotypeDistributionItem> =>
  cohort.distribution.reduce((acc, distributionItem) => {
    const { short_allele_repunit_count, long_allele_repunit_count } = distributionItem
    const key = [short_allele_repunit_count, long_allele_repunit_count].join(' / ')
    const existingItem = acc[key]
    const countSoFar = existingItem ? existingItem.frequency : 0
    const newItem: GenotypeDistributionItem = {
      short_allele_repunit_count: short_allele_repunit_count,
      long_allele_repunit_count: long_allele_repunit_count,
      frequency: countSoFar + distributionItem.frequency,
    }
    return { ...acc, [key]: newItem }
  }, distribution)

export const getSelectedGenotypeDistribution = (
  shortTandemRepeatOrAdjacentRepeat: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat,
  {
    selectedRepeatUnits,
    selectedAncestryGroup,
    selectedSex,
  }: {
    selectedRepeatUnits: string[] | ''
    selectedAncestryGroup: AncestryGroupId | ''
    selectedSex: Sex | ''
  }
): GenotypeDistributionItem[] => {
  const itemsByRepunitCounts: Record<string, GenotypeDistributionItem> =
    shortTandemRepeatOrAdjacentRepeat.genotype_distribution.reduce((acc, cohort) => {
      if (selectedAncestryGroup !== '' && cohort.ancestry_group !== selectedAncestryGroup) {
        return acc
      }
      if (selectedSex !== '' && cohort.sex !== selectedSex) {
        return acc
      }
      if (
        selectedRepeatUnits !== '' &&
        (cohort.short_allele_repunit !== selectedRepeatUnits[0] ||
          cohort.long_allele_repunit !== selectedRepeatUnits[1])
      ) {
        return acc
      }
      return addCohortToGenotypeDistribution(cohort, acc)
    }, {})
  return Object.values(itemsByRepunitCounts)
}

export const getGenotypeDistributionPlotAxisLabels = (
  shortTandemRepeatOrAdjacentRepeat: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat,
  { selectedRepeatUnits }: { selectedRepeatUnits: string[] | '' }
) => {
  if (selectedRepeatUnits !== '') {
    if (selectedRepeatUnits[0] === selectedRepeatUnits[1]) {
      return genotypeRepunitPairs(shortTandemRepeatOrAdjacentRepeat).length === 1
        ? ['longer allele', 'shorter allele']
        : [`longer ${selectedRepeatUnits[0]} allele`, `shorter ${selectedRepeatUnits[1]} allele`]
    }
    return selectedRepeatUnits.map((repeatUnit) => `${repeatUnit} allele`)
  }
  return ['longer allele', 'shorter allele']
}

export const maxAlleleSizeDistributionRepeats = (
  shortTandemRepeatOrAdjacentRepeat: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat
) =>
  Math.max(
    ...shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.flatMap((cohort) =>
      cohort.distribution.map((item) => item.repunit_count)
    )
  )

export const maxGenotypeDistributionRepeats = (
  shortTandemRepeat: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat
): [number, number] => {
  const { genotype_distribution } = shortTandemRepeat
  const longAlleleCounts = genotype_distribution.flatMap((cohort) =>
    cohort.distribution.map((item) => item.long_allele_repunit_count)
  )
  const shortAlleleCounts = genotype_distribution.flatMap((cohort) =>
    cohort.distribution.map((item) => item.short_allele_repunit_count)
  )
  return [Math.max(...longAlleleCounts), Math.max(...shortAlleleCounts)]
}

export const genotypeRepunitPairs = (
  shortTandemRepeat: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat
): string[][] => {
  // Lists being pass-by-reference rather than by value, we can't just get the distinct pairs by the trick of turning a list into a Set back into a list, as we do for allele-size distribution repunits. Hence this implementation.
  const pairsByKey: Record<string, string[]> = shortTandemRepeat.genotype_distribution.reduce(
    (acc, { short_allele_repunit, long_allele_repunit }) => {
      const pair = [short_allele_repunit, long_allele_repunit]
      const key = pair.join(' / ')
      return { ...acc, [key]: pair }
    },
    {} as Record<string, string[]>
  )
  return Object.values(pairsByKey).sort(
    (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])
  )
}

export const isAdjacentRepeat = (
  obj: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat
): obj is ShortTandemRepeatAdjacentRepeat => !obj.hasOwnProperty('associated_diseases')

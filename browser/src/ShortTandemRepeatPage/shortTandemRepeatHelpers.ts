import {
  Sex,
  ShortTandemRepeat,
  AlleleSizeDistributionItem,
  AlleleSizeDistributionCohort,
} from './ShortTandemRepeatPage'
import { AncestryGroupId } from '@gnomad/dataset-metadata/gnomadPopulations'

type AlleleSizeDistributionFilters = {
  selectedAncestryGroup: AncestryGroupId | ''
  selectedSex: Sex | ''
  selectedRepeatUnit: string
}

const addCohortToDistribution = (
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

export const getSelectedAlleleSizeDistribution = (
  shortTandemRepeatOrAdjacentRepeat: ShortTandemRepeat,
  { selectedAncestryGroup, selectedSex, selectedRepeatUnit }: AlleleSizeDistributionFilters
): AlleleSizeDistributionItem[] => {
  // TK figure out what's up with classification
  const itemsByRepunitCount: Record<number, AlleleSizeDistributionItem> =
    shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.reduce((acc, cohort) => {
      if (selectedAncestryGroup !== '' && cohort.ancestry_group !== selectedAncestryGroup) {
        return acc
      }
      if (selectedSex !== '' && cohort.sex !== selectedSex) {
        return acc
      }
      if (cohort.repunit !== selectedRepeatUnit) {
        return acc
      }
      return addCohortToDistribution(cohort, acc)
    }, {} as Record<number, AlleleSizeDistributionItem>)
  return Object.values(itemsByRepunitCount)
}
/*  if (selectedRepeatUnit) {
    // Repeat units grouped by classification are not valid for adjacent repeats.
    if (selectedRepeatUnit.startsWith('classification')) {
      const selectedClassification = selectedRepeatUnit.slice(15)

      const repeatUnitClassification = shortTandemRepeatOrAdjacentRepeat.repeat_units.reduce(
        (acc, repeatUnit) => ({
          ...acc,
          [repeatUnit.repeat_unit]: repeatUnit.classification,
        }),
        {}
      )

      const repeatUnits =
        shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.repeat_units.filter(
          (r: any) => repeatUnitClassification[r.repeat_unit] === selectedClassification
        )

      const distributions = repeatUnits.map(
        selectedPopulationId
          ? (r: any) =>
              r.populations.find((pop: any) => pop.id === selectedPopulationId).distribution
          : (r: any) => r.distribution
      )

      return sumDistributions(distributions)
    }

    const repeatUnit = shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.repeat_units.find(
      (r: any) => r.repeat_unit === selectedRepeatUnit
    )
    if (selectedPopulationId) {
      return repeatUnit.populations.find((pop: any) => pop.id === selectedPopulationId).distribution
    }
    return repeatUnit.distribution
  }

  if (selectedPopulationId) {
    return shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.populations.find(
      (pop: any) => pop.id === selectedPopulationId
    ).distribution
  }

  return shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.distribution
}*/

export const getSelectedGenotypeDistribution = (
  shortTandemRepeatOrAdjacentRepeat: any,
  { selectedRepeatUnits, selectedPopulationId }: any
) => {
  const baseDistribution = selectedRepeatUnits
    ? shortTandemRepeatOrAdjacentRepeat.genotype_distribution.repeat_units.find(
        (repeatUnit: any) => repeatUnit.repeat_units.join(' / ') === selectedRepeatUnits
      )
    : shortTandemRepeatOrAdjacentRepeat.genotype_distribution

  const selectedDistribution =
    selectedPopulationId === ''
      ? baseDistribution.distribution
      : baseDistribution.populations.find((pop: any) => pop.id === selectedPopulationId)
          .distribution

  return !selectedRepeatUnits ||
    selectedRepeatUnits.split(' / ')[0] === selectedRepeatUnits.split(' / ')[1]
    ? selectedDistribution.map((d: any) => (d[0] >= d[1] ? d : [d[1], d[0], d[2]]))
    : selectedDistribution
}

export const getGenotypeDistributionPlotAxisLabels = (
  shortTandemRepeatOrAdjacentRepeat: any,
  { selectedRepeatUnits }: any
) => {
  if (selectedRepeatUnits) {
    const repeatUnits = selectedRepeatUnits.split(' / ')
    if (repeatUnits[0] === repeatUnits[1]) {
      return shortTandemRepeatOrAdjacentRepeat.genotype_distribution.repeat_units.length === 1
        ? ['longer allele', 'shorter allele']
        : [`longer ${repeatUnits[0]} allele`, `shorter ${repeatUnits[1]} allele`]
    }
    return repeatUnits.map((repeatUnit: any) => `${repeatUnit} allele`)
  }
  return ['longer allele', 'shorter allele']
}

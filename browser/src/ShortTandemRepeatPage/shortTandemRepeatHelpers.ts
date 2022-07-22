const sumDistributions = (distributions: any) => {
  const nByKey = distributions.flat().reduce((acc: any, d: any) => {
    const key = d.slice(0, d.length - 1).join('/')
    return {
      ...acc,
      [key]: (acc[key] || 0) + d[d.length - 1],
    }
  }, {})
  return Object.entries(nByKey).map(([key, n]) => [...key.split('/').map(Number), n])
}

export const getSelectedAlleleSizeDistribution = (
  shortTandemRepeatOrAdjacentRepeat: any,
  { selectedRepeatUnit, selectedPopulationId }: any
) => {
  if (selectedRepeatUnit) {
    // Repeat units grouped by classification are not valid for adjacent repeats.
    if (selectedRepeatUnit.startsWith('classification')) {
      const selectedClassification = selectedRepeatUnit.slice(15)

      const repeatUnitClassification = shortTandemRepeatOrAdjacentRepeat.repeat_units.reduce(
        // @ts-expect-error TS(7006) FIXME: Parameter 'acc' implicitly has an 'any' type.
        (acc, repeatUnit) => ({
          ...acc,
          [repeatUnit.repeat_unit]: repeatUnit.classification,
        }),
        {}
      )

      const repeatUnits = shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.repeat_units.filter(
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
}

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

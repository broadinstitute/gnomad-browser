const sumDistributions = distributions => {
  const nByKey = distributions.flat().reduce((acc, d) => {
    const key = d.slice(0, d.length - 1).join('/')
    return {
      ...acc,
      [key]: (acc[key] || 0) + d[d.length - 1],
    }
  }, {})
  return Object.entries(nByKey).map(([key, n]) => [...key.split('/').map(Number), n])
}

export const getSelectedAlleleSizeDistribution = (
  shortTandemRepeatOrAdjacentRepeat,
  { selectedRepeatUnit, selectedPopulationId }
) => {
  if (selectedRepeatUnit) {
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

      const repeatUnits = shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.repeat_units.filter(
        r => repeatUnitClassification[r.repeat_unit] === selectedClassification
      )

      const distributions = repeatUnits.map(
        selectedPopulationId
          ? r => r.populations.find(pop => pop.id === selectedPopulationId).distribution
          : r => r.distribution
      )

      return sumDistributions(distributions)
    }

    const repeatUnit = shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.repeat_units.find(
      r => r.repeat_unit === selectedRepeatUnit
    )
    if (selectedPopulationId) {
      return repeatUnit.populations.find(pop => pop.id === selectedPopulationId).distribution
    }
    return repeatUnit.distribution
  }

  if (selectedPopulationId) {
    return shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.populations.find(
      pop => pop.id === selectedPopulationId
    ).distribution
  }

  return shortTandemRepeatOrAdjacentRepeat.allele_size_distribution.distribution
}

export const getSelectedGenotypeDistribution = (
  shortTandemRepeatOrAdjacentRepeat,
  { selectedRepeatUnits, selectedPopulationId }
) => {
  const baseDistribution = selectedRepeatUnits
    ? shortTandemRepeatOrAdjacentRepeat.genotype_distribution.repeat_units.find(
        repeatUnit => repeatUnit.repeat_units.join(' / ') === selectedRepeatUnits
      )
    : shortTandemRepeatOrAdjacentRepeat.genotype_distribution

  return selectedPopulationId === ''
    ? baseDistribution.distribution
    : baseDistribution.populations.find(pop => pop.id === selectedPopulationId).distribution
}

export const getGenotypeDistributionPlotAxisLabels = (
  shortTandemRepeatOrAdjacentRepeat,
  { selectedRepeatUnits }
) => {
  if (selectedRepeatUnits) {
    const repeatUnits = selectedRepeatUnits.split(' / ')
    if (repeatUnits[0] === repeatUnits[1]) {
      return shortTandemRepeatOrAdjacentRepeat.genotype_distribution.repeat_units.length === 1
        ? ['longer allele', 'shorter allele']
        : [`longer ${repeatUnits[0]} allele`, `shorter ${repeatUnits[1]} allele`]
    }
    return repeatUnits.map(repeatUnit => `${repeatUnit} allele`)
  }
  return ['longer allele', 'shorter allele']
}
